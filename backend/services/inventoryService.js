import { promises as fs } from 'fs';
import { v4 as uuid } from 'uuid';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

class InventoryService {
    constructor() {
        // Chemins vers les fichiers JSON
        this.inventoryPath = './data/inventory.json';
        this.productsPath = './data/products.json';
        this.warehousesPath = './data/warehouses.json';

        // Cache pour éviter de relire les fichiers à chaque requête
        this.cache = {
            inventory: null,
            products: null,
            warehouses: null,
            lastUpdate: null
        };
    }

    /**
     * Charge les données depuis les fichiers JSON
     */
    async loadData() {
        try {
            const now = Date.now();

            // Recharger les données si le cache est vide ou expire (5 minutes)
            if (!this.cache.lastUpdate || (now - this.cache.lastUpdate) > 300000) {
                const [inventoryData, productsData, warehousesData] = await Promise.all([
                    fs.readFile(this.inventoryPath, 'utf8'),
                    fs.readFile(this.productsPath, 'utf8'),
                    fs.readFile(this.warehousesPath, 'utf8')
                ]);

                this.cache.inventory = JSON.parse(inventoryData);
                this.cache.products = JSON.parse(productsData);
                this.cache.warehouses = JSON.parse(warehousesData);
                this.cache.lastUpdate = now;
            }

            return this.cache;
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            throw new Error('Impossible de charger les données d\'inventaire');
        }
    }

    /**
     * Enrichit les données d'inventaire avec les noms des produits et entrepôts
     */
    enrichInventoryData(inventoryItems, products, warehouses) {
        const productMap = new Map(products.map(p => [p.id, p]));
        const warehouseMap = new Map(warehouses.map(w => [w.id, w]));

        return inventoryItems.map(item => {
            const product = productMap.get(item.productId);
            const warehouse = warehouseMap.get(item.warehouseId);

            return {
                id: item.id,
                productId: item.productId,
                warehouseId: item.warehouseId,
                name: product?.name || 'Produit inconnu',
                price: product?.price || 0,
                totalQuantity: item.quantity,
                reservedQuantity: item.reservedQuantity,
                availableQuantity: item.quantity - item.reservedQuantity,
                minThreshold: item.minThreshold,
                lastUpdated: item.lastUpdated,
                warehouseName: warehouse?.name || 'Entrepôt inconnu',
            };
        });
    }

    /**
     * Récupère les données d'inventaire avec filtres, tri et pagination
     */
    async getStocks(filters) {
        try {
            const {
                warehouseId,
                search,
                sortBy = 'name',
                sortOrder = 'asc',
                page = 1,
                itemsPerPage = 10
            } = filters;

            // Charger les données
            const { inventory, products, warehouses } = await this.loadData();

            // Enrichir les données d'inventaire
            let enrichedData = this.enrichInventoryData(inventory, products, warehouses);

            // Filtrage par entrepôt
            if (warehouseId && warehouseId !== 'all') {
                enrichedData = enrichedData.filter(item => item.warehouseId === warehouseId);
            }

            // Filtrage par recherche (nom du produit)
            if (search) {
                const searchLower = search.toLowerCase();
                enrichedData = enrichedData.filter(item =>
                    item.name.toLowerCase().includes(searchLower)
                );
            }

            // Tri
            enrichedData.sort((a, b) => {
                let aVal = a[sortBy];
                let bVal = b[sortBy];

                // Gestion des chaînes de caractères
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }

                // Gestion des dates
                if (sortBy === 'lastUpdated') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                }

                if (sortOrder === 'asc') {
                    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                } else {
                    return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
                }
            });

            // Pagination
            const totalItems = enrichedData.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const startIndex = (page - 1) * itemsPerPage;
            const paginatedData = enrichedData.slice(startIndex, startIndex + itemsPerPage);

            return {
                data: paginatedData,
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage
            };

        } catch (error) {
            console.error('Erreur dans getStocks service:', error);
            throw error;
        }
    }

    /**
     * Récupère les détails d'un élément d'inventaire spécifique
     */
    async getStockById(id, warehouseId = null) {
        try {
            const { inventory, products, warehouses } = await this.loadData();

            // Trouver l'élément d'inventaire
            let inventoryItem = inventory.find(item => item.id === id);

            // Filtrer par entrepôt si spécifié
            if (warehouseId && warehouseId !== 'all') {
                inventoryItem = inventory.find(item =>
                    item.id === id && item.warehouseId === warehouseId
                );
            }

            if (!inventoryItem) {
                throw new Error('Élément d\'inventaire non trouvé');
            }

            // Enrichir les données
            const enrichedItems = this.enrichInventoryData([inventoryItem], products, warehouses);

            return enrichedItems[0];

        } catch (error) {
            console.error('Erreur dans getStockById service:', error);
            throw error;
        }
    }

    /**
     * Met à jour les quantités d'un produit en stock
     */
    async updateStock(id, updateData) {
        try {
            const { totalQuantity, reservedQuantity, minThreshold, warehouseId } = updateData;

            // Charger les données actuelles
            const inventoryData = JSON.parse(await fs.readFile(this.inventoryPath, 'utf8'));

            // Trouver l'élément à mettre à jour
            const itemIndex = inventoryData.findIndex(item => {
                if (warehouseId && warehouseId !== 'all') {
                    return item.id === id && item.warehouseId === warehouseId;
                }
                return item.id === id;
            });

            if (itemIndex === -1) {
                throw new Error('Élément d\'inventaire non trouvé');
            }

            // Mettre à jour les données
            const item = inventoryData[itemIndex];
            if (totalQuantity !== undefined) item.quantity = totalQuantity;
            if (reservedQuantity !== undefined) item.reservedQuantity = reservedQuantity;
            if (minThreshold !== undefined) item.minThreshold = minThreshold;
            item.lastUpdated = new Date().toISOString();

            // Sauvegarder dans le fichier
            await fs.writeFile(this.inventoryPath, JSON.stringify(inventoryData, null, 2));

            // Invalider le cache
            this.cache.lastUpdate = null;

            // Retourner l'élément mis à jour avec les données enrichies
            return await this.getStockById(id, warehouseId);

        } catch (error) {
            console.error('Erreur dans updateStock service:', error);
            throw error;
        }
    }

    /**
     * Export des données d'inventaire
     */
    async exportStocks(filters, format) {
        try {
            // Récupérer toutes les données sans pagination
            const allFilters = { page: 1, itemsPerPage: 1000, ...filters };
            const { data } = await this.getStocks(allFilters);

            switch (format) {
                case 'excel':
                    return this.generateExcelExport(data);
                case 'pdf':
                    return this.generatePdfExport(data);
                case 'csv':
                    return this.generateCsvExport(data);
                default:
                    throw new Error('Format d\'export non supporté');
            }

        } catch (error) {
            console.error('Erreur dans exportStocks service:', error);
            throw error;
        }
    }

    /**
     * Génération CSV
     */
    async generateCsvExport(data) {
        const headers = [
            'ID', 'Produit', 'Entrepôt', 'Stock Total', 'Réservé',
            'Disponible', 'Seuil Min', 'Prix Unitaire', 'Valeur Totale', 'Dernière MAJ'
        ];

        const csvData = [
            headers.join(','),
            ...data.map(item => [
                item.id,
                `"${item.name}"`,
                `"${item.warehouseName}"`,
                item.totalQuantity,
                item.reservedQuantity,
                item.availableQuantity,
                item.minThreshold,
                item.price,
                (item.totalQuantity * item.price).toFixed(2),
                item.lastUpdated
            ].join(','))
        ].join('\n');

        return Buffer.from(csvData, 'utf8');
    }

    /**
     * Génération Excel
     */
    async generateExcelExport(data) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventaire');

        // Headers
        const headers = [
            'ID', 'Produit', 'Entrepôt', 'Stock Total', 'Réservé',
            'Disponible', 'Seuil Min', 'Prix Unitaire', 'Valeur Totale', 'Dernière MAJ'
        ];

        // Ajouter les headers avec style
        worksheet.addRow(headers);
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Ajouter les données
        data.forEach(item => {
            worksheet.addRow([
                item.id,
                item.name,
                item.warehouseName,
                item.totalQuantity,
                item.reservedQuantity,
                item.availableQuantity,
                item.minThreshold,
                item.price,
                parseFloat((item.totalQuantity * item.price).toFixed(2)),
                item.lastUpdated
            ]);
        });

        // Auto-ajuster la largeur des colonnes
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = maxLength < 10 ? 10 : maxLength + 2;
        });

        // Formater les colonnes monétaires
        const priceColumn = worksheet.getColumn(8); // Prix Unitaire
        const valueColumn = worksheet.getColumn(9); // Valeur Totale

        priceColumn.numFmt = '#,##0.00"$"';
        valueColumn.numFmt = '#,##0.00"$"';

        // Formater la colonne date
        const dateColumn = worksheet.getColumn(10); // Dernière MAJ
        dateColumn.numFmt = 'dd/mm/yyyy hh:mm';

        // Générer le buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }

    /**
 * Génération PDF optimisée pour la lisibilité complète
 */
    async generatePdfExport(data) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margin: 25,
                    size: 'A4',
                    layout: 'landscape'
                });

                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(buffers);
                    resolve(pdfBuffer);
                });

                // Titre
                doc.fontSize(18).font('Helvetica-Bold');
                doc.text('Rapport d\'Inventaire Détaillé', { align: 'center' });
                doc.moveDown();

                // Date de génération
                doc.fontSize(11).font('Helvetica');
                doc.text(`Généré le: ${new Date().toLocaleString('fr-CA')}`, { align: 'right' });
                doc.moveDown(1);

                // **SOLUTION 1: Tableau principal simplifié avec informations essentielles**
                const mainHeaders = ['Produit', 'Entrepôt', 'Stock', 'Réservé', 'Disponible', 'Prix', 'Valeur'];
                const mainColumnWidths = [200, 120, 60, 60, 70, 70, 80]; // Total: 660px (largeur page paysage ≈ 740px)

                let startX = 25;
                let currentY = doc.y;
                const rowHeight = 28;

                // Fonction pour dessiner le tableau principal
                const drawMainTable = () => {
                    // Headers
                    doc.fontSize(11).font('Helvetica-Bold');
                    doc.rect(startX, currentY, mainColumnWidths.reduce((a, b) => a + b, 0), rowHeight)
                        .fillAndStroke('#2c3e50', '#2c3e50');

                    let x = startX;
                    mainHeaders.forEach((header, index) => {
                        doc.fillColor('#ffffff')
                            .text(header, x + 5, currentY + 8, {
                                width: mainColumnWidths[index] - 10,
                                align: index >= 2 ? 'center' : 'left'
                            });
                        x += mainColumnWidths[index];
                    });

                    currentY += rowHeight;

                    // Données
                    data.forEach((item, index) => {
                        // Vérifier l'espace restant
                        if (currentY + rowHeight * 2 > doc.page.height - 100) {
                            doc.addPage();
                            currentY = 50;
                            // Redessiner les headers
                            doc.fontSize(11).font('Helvetica-Bold');
                            doc.rect(startX, currentY, mainColumnWidths.reduce((a, b) => a + b, 0), rowHeight)
                                .fillAndStroke('#2c3e50', '#2c3e50');

                            let headerX = startX;
                            mainHeaders.forEach((header, hIndex) => {
                                doc.fillColor('#ffffff')
                                    .text(header, headerX + 5, currentY + 8, {
                                        width: mainColumnWidths[hIndex] - 10,
                                        align: hIndex >= 2 ? 'center' : 'left'
                                    });
                                headerX += mainColumnWidths[hIndex];
                            });
                            currentY += rowHeight;
                        }

                        // Ligne alternée
                        const bgColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
                        doc.rect(startX, currentY, mainColumnWidths.reduce((a, b) => a + b, 0), rowHeight)
                            .fillAndStroke(bgColor, '#dee2e6');

                        // Contenu de la ligne
                        const rowData = [
                            item.name, // Nom complet du produit
                            item.warehouseName, // Nom complet de l'entrepôt
                            item.totalQuantity.toString(),
                            item.reservedQuantity.toString(),
                            item.availableQuantity.toString(),
                            `${item.price.toFixed(2)}$`,
                            `${(item.totalQuantity * item.price).toFixed(2)}$`
                        ];

                        doc.fontSize(10).font('Helvetica').fillColor('#2c3e50');
                        let cellX = startX;

                        rowData.forEach((value, cellIndex) => {
                            const cellWidth = mainColumnWidths[cellIndex];
                            const isNumeric = cellIndex >= 2;

                            doc.text(value, cellX + 5, currentY + 9, {
                                width: cellWidth - 10,
                                height: rowHeight - 4,
                                align: isNumeric ? 'right' : 'left',
                                ellipsis: false // Pas de troncature
                            });

                            cellX += cellWidth;
                        });

                        currentY += rowHeight;
                    });
                };

                // Dessiner le tableau principal
                drawMainTable();

                // **SOLUTION 2: Section détaillée avec IDs complets**
                currentY += 30;

                // Titre de la section détails
                doc.fontSize(14).font('Helvetica-Bold').fillColor('#2c3e50');
                doc.text('Détails Techniques', startX, currentY);
                currentY += 25;

                // Tableau des détails techniques
                doc.fontSize(9).font('Helvetica');
                data.forEach((item, index) => {
                    if (currentY + 60 > doc.page.height - 50) {
                        doc.addPage();
                        currentY = 50;
                        doc.fontSize(14).font('Helvetica-Bold').fillColor('#2c3e50');
                        doc.text('Détails Techniques (suite)', startX, currentY);
                        currentY += 25;
                    }

                    // Encadré pour chaque produit
                    const detailHeight = 45;
                    doc.rect(startX, currentY, 720, detailHeight)
                        .fillAndStroke(index % 2 === 0 ? '#f1f3f4' : '#ffffff', '#d1d5db');

                    // Informations détaillées sur 3 colonnes
                    doc.fontSize(9).font('Helvetica').fillColor('#374151');

                    // Colonne 1: Identification
                    doc.font('Helvetica-Bold').text('ID:', startX + 10, currentY + 8);
                    doc.font('Helvetica').text(item.id, startX + 30, currentY + 8, { width: 200 });

                    doc.font('Helvetica-Bold').text('Produit:', startX + 10, currentY + 22);
                    doc.font('Helvetica').text(item.name, startX + 50, currentY + 22, { width: 180 });

                    // Colonne 2: Stock et seuils
                    doc.font('Helvetica-Bold').text('Entrepôt:', startX + 250, currentY + 8);
                    doc.font('Helvetica').text(item.warehouseName, startX + 300, currentY + 8, { width: 150 });

                    doc.font('Helvetica-Bold').text('Seuil minimum:', startX + 250, currentY + 22);
                    doc.font('Helvetica').text(`${item.minThreshold} unités`, startX + 330, currentY + 22);

                    // Colonne 3: Dates et valeurs
                    doc.font('Helvetica-Bold').text('Dernière MAJ:', startX + 480, currentY + 8);
                    doc.font('Helvetica').text(new Date(item.lastUpdated).toLocaleDateString('fr-CA'), startX + 555, currentY + 8);

                    doc.font('Helvetica-Bold').text('Valeur totale:', startX + 480, currentY + 22);
                    doc.font('Helvetica').text(`${(item.totalQuantity * item.price).toFixed(2)}$`, startX + 545, currentY + 22);

                    currentY += detailHeight + 5;
                });

                // **RÉSUMÉ FINAL**
                currentY += 20;
                const totalArticles = data.length;
                const totalValue = data.reduce((sum, item) => sum + (item.totalQuantity * item.price), 0);
                const totalStock = data.reduce((sum, item) => sum + item.totalQuantity, 0);
                const totalReserved = data.reduce((sum, item) => sum + item.reservedQuantity, 0);

                // Encadré résumé
                const summaryHeight = 80;
                doc.rect(startX, currentY, 400, summaryHeight)
                    .fillAndStroke('#e1f5fe', '#0277bd');

                doc.fontSize(12).font('Helvetica-Bold').fillColor('#01579b');
                doc.text('RÉSUMÉ GÉNÉRAL', startX + 15, currentY + 10);

                doc.fontSize(11).font('Helvetica').fillColor('#0277bd');
                doc.text(`• Nombre total d'articles: ${totalArticles}`, startX + 15, currentY + 28);
                doc.text(`• Stock total: ${totalStock} unités`, startX + 15, currentY + 42);
                doc.text(`• Stock réservé: ${totalReserved} unités`, startX + 15, currentY + 56);

                doc.fontSize(13).font('Helvetica-Bold').fillColor('#d32f2f');
                doc.text(`Valeur totale: ${totalValue.toFixed(2)}$`, startX + 220, currentY + 35);

                // Pied de page
                doc.fontSize(8).font('Helvetica').fillColor('#6b7280');
                doc.text(`Rapport généré automatiquement le ${new Date().toLocaleString('fr-CA')}`,
                    startX, doc.page.height - 30, {
                    align: 'center',
                    width: doc.page.width - 50
                });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Ajouter un nouvel élément d'inventaire
     */
    async addStock(stockData) {
        try {
            const { productId, warehouseId, quantity, reservedQuantity = 0, minThreshold } = stockData;

            // Charger les données actuelles
            const inventoryData = JSON.parse(await fs.readFile(this.inventoryPath, 'utf8'));

            // Vérifier si l'élément existe déjà
            const existingItem = inventoryData.find(item =>
                item.productId === productId && item.warehouseId === warehouseId
            );

            if (existingItem) {
                throw new Error('Cet élément d\'inventaire existe déjà');
            }

            // Créer le nouvel élément
            const newItem = {
                id: uuid(),
                productId,
                warehouseId,
                quantity,
                reservedQuantity,
                minThreshold,
                lastUpdated: new Date().toISOString()
            };

            // Ajouter à la liste
            inventoryData.push(newItem);

            // Sauvegarder
            await fs.writeFile(this.inventoryPath, JSON.stringify(inventoryData, null, 2));

            // Invalider le cache
            this.cache.lastUpdate = null;

            return await this.getStockById(newItem.id);

        } catch (error) {
            console.error('Erreur dans addStock service:', error);
            throw error;
        }
    }

    /**
     * Supprimer un élément d'inventaire
     */
    async deleteStock(id, warehouseId = null) {
        try {
            // Charger les données actuelles
            const inventoryData = JSON.parse(await fs.readFile(this.inventoryPath, 'utf8'));

            // Trouver l'index de l'élément à supprimer
            const itemIndex = inventoryData.findIndex(item => {
                if (warehouseId && warehouseId !== 'all') {
                    return item.id === id && item.warehouseId === warehouseId;
                }
                return item.id === id;
            });

            if (itemIndex === -1) {
                throw new Error('Élément d\'inventaire non trouvé');
            }

            // Supprimer l'élément
            inventoryData.splice(itemIndex, 1);

            // Sauvegarder
            await fs.writeFile(this.inventoryPath, JSON.stringify(inventoryData, null, 2));

            // Invalider le cache
            this.cache.lastUpdate = null;

            return { success: true, message: 'Élément supprimé avec succès' };

        } catch (error) {
            console.error('Erreur dans deleteStock service:', error);
            throw error;
        }
    }
}

export default new InventoryService();