import { promises as fs } from 'fs';
import { v4 as uuid } from 'uuid';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

class OrderService {
    constructor() {
        // Chemins vers les fichiers JSON
        this.ordersPath = './data/orders.json';
        this.customersPath = './data/customers.json';
        this.productsPath = './data/products.json';
        this.warehousesPath = './data/warehouses.json';
        this.addressesPath = './data/addresses.json';

        // Cache pour éviter de relire les fichiers à chaque requête
        this.cache = {
            orders: null,
            customers: null,
            products: null,
            warehouses: null,
            addresses: null,
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
                const [ordersData, customersData, productsData, warehousesData, addressesData] = await Promise.all([
                    fs.readFile(this.ordersPath, 'utf8'),
                    fs.readFile(this.customersPath, 'utf8'),
                    fs.readFile(this.productsPath, 'utf8'),
                    fs.readFile(this.warehousesPath, 'utf8'),
                    fs.readFile(this.addressesPath, 'utf8'),
                ]);

                this.cache.orders = JSON.parse(ordersData);
                this.cache.customers = JSON.parse(customersData);
                this.cache.products = JSON.parse(productsData);
                this.cache.warehouses = JSON.parse(warehousesData);
                this.cache.addresses = JSON.parse(addressesData);
                this.cache.lastUpdate = now;
            }

            return this.cache;
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            throw new Error('Impossible de charger les données de commandes');
        }
    }

    /**
     * Enrichit les données de commandes avec les informations des autres entités
     */
    enrichOrderData(orders, customers, products, warehouses, addresses) {
        const customerMap = new Map(customers.map(c => [c.id, c]));
        const productMap = new Map(products.map(p => [p.id, p]));
        const warehouseMap = new Map(warehouses.map(w => [w.id, w]));
        const addressMap = new Map(addresses.map(a => [a.id, a]));

        return orders.map(order => {
            const customer = customerMap.get(order.customerId);
            const warehouse = warehouseMap.get(order.warehouseId);
            const billingAddress = addressMap.get(order.billingAddressId);
            const deliveryAddress = addressMap.get(order.deliveryAddressId);

            // Enrichir les line items avec les informations produits
            const enrichedLineItems = order.lineItems.map(item => {
                const product = productMap.get(item.productId);
                return {
                    ...item,
                    name: product?.name || 'Produit inconnu',
                    price: product?.price || 0,
                    totalPrice: (product?.price || 0) * item.quantity
                };
            });

            return {
                ...order,
                customerName: customer?.name || 'Client inconnu',
                warehouseName: warehouse?.name || 'Entrepôt inconnu',
                billingAddress: billingAddress || null,
                deliveryAddress: deliveryAddress || null,
                lineItems: enrichedLineItems
            };
        });
    }

    /**
     * Filtre les commandes selon les critères de date
     */
    filterByTimePeriod(orders, timePeriod, startDate = null, endDate = null) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (timePeriod) {
            case 'today':
                const todayEnd = new Date(today);
                todayEnd.setDate(todayEnd.getDate() + 1);
                return orders.filter(order => {
                    const orderDate = new Date(order.date);
                    return orderDate >= today && orderDate < todayEnd;
                });

            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return orders.filter(order => {
                    const orderDate = new Date(order.date);
                    return orderDate >= yesterday && orderDate < today;
                });

            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(weekStart.getDate() - 7);
                return orders.filter(order => {
                    const orderDate = new Date(order.date);
                    return orderDate >= weekStart;
                });

            case 'custom':
                if (startDate && endDate) {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999); // Inclure toute la journée de fin
                    return orders.filter(order => {
                        const orderDate = new Date(order.date);
                        return orderDate >= start && orderDate <= end;
                    });
                }
                return orders;

            case 'all':
            default:
                return orders;
        }
    }

    /**
     * Récupère les commandes avec filtres, tri et pagination
     */
    async getOrders(filters) {
        try {
            const {
                warehouseId,
                search,
                status,
                timePeriod,
                startDate,
                endDate,
                sortBy = 'date',
                sortOrder = 'desc',
                page = 1,
                itemsPerPage = 25
            } = filters;

            // Charger les données
            const { orders, customers, products, warehouses, addresses } = await this.loadData();

            // Enrichir les données de commandes
            let enrichedData = this.enrichOrderData(orders, customers, products, warehouses, addresses);

            // Filtrage par entrepôt
            if (warehouseId && warehouseId !== 'all') {
                enrichedData = enrichedData.filter(order => order.warehouseId === warehouseId);
            }

            // Filtrage par statut
            if (status && status !== 'all') {
                enrichedData = enrichedData.filter(order => order.status === status);
            }

            // Filtrage par période de temps
            enrichedData = this.filterByTimePeriod(enrichedData, timePeriod, startDate, endDate);

            // Filtrage par recherche (ID de commande, nom du client)
            if (search) {
                const searchLower = search.toLowerCase();
                enrichedData = enrichedData.filter(order =>
                    order.id.toLowerCase().includes(searchLower) ||
                    order.customerName.toLowerCase().includes(searchLower)
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
                if (sortBy === 'date') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                }

                // Gestion du nom du client
                if (sortBy === 'customerId') {
                    aVal = a.customerName.toLowerCase();
                    bVal = b.customerName.toLowerCase();
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
            console.error('Erreur dans getOrders service:', error);
            throw error;
        }
    }

    /**
     * Récupère les détails d'une commande spécifique
     */
    async getOrderById(id) {
        try {
            const { orders, customers, products, warehouses, addresses } = await this.loadData();

            // Trouver la commande
            const order = orders.find(order => order.id === id);

            if (!order) {
                return null;
            }

            // Enrichir les données
            const enrichedOrders = this.enrichOrderData([order], customers, products, warehouses, addresses);

            return enrichedOrders[0];

        } catch (error) {
            console.error('Erreur dans getOrderById service:', error);
            throw error;
        }
    }

    /**
     * Met à jour le statut d'une commande
     */
    async updateOrderStatus(id, newStatus) {
        try {
            // Charger les données actuelles
            const ordersData = JSON.parse(await fs.readFile(this.ordersPath, 'utf8'));

            // Trouver la commande à mettre à jour
            const orderIndex = ordersData.findIndex(order => order.id === id);

            if (orderIndex === -1) {
                return null;
            }

            // Mettre à jour le statut
            ordersData[orderIndex].status = newStatus;
            ordersData[orderIndex].lastUpdated = new Date().toISOString();

            // Sauvegarder dans le fichier
            await fs.writeFile(this.ordersPath, JSON.stringify(ordersData, null, 2));

            // Invalider le cache
            this.cache.lastUpdate = null;

            // Retourner la commande mise à jour avec les données enrichies
            return await this.getOrderById(id);

        } catch (error) {
            console.error('Erreur dans updateOrderStatus service:', error);
            throw error;
        }
    }

    /**
     * Génère la liste de picking pour les commandes filtrées
     */
    async generatePickingList(filters) {
        try {
            // Récupérer toutes les commandes avec les filtres (sans pagination)
            const allFilters = { ...filters, page: 1, itemsPerPage: 10000 };
            const { data: orders } = await this.getOrders(allFilters);

            // Récupérer tous les produits pour avoir accès aux informations de composition
            const { products } = await this.loadData();
            const productsMap = new Map(products.map(p => [p.id, p]));

            // Fonction récursive pour décomposer un produit composite
            const decomposeProduct = (productId, quantity = 1) => {
                const product = productsMap.get(productId);
                if (!product) return [];

                // Si le produit n'est pas composite, on le retourne tel quel
                if (!product.isComposite) {
                    return [{
                        productId: product.id,
                        name: product.name,
                        quantity: quantity
                    }];
                }

                // Si le produit est composite, on décompose récursivement ses enfants
                const decomposed = [];
                product.children.forEach(child => {
                    const childComponents = decomposeProduct(child.id, child.quantity * quantity);
                    decomposed.push(...childComponents);
                });
                return decomposed;
            };

            // Agréger les quantités par produit
            const productQuantities = new Map();

            orders.forEach(order => {
                order.lineItems.forEach(item => {
                    // Décomposer le produit (récursivement si composite)
                    const decomposedProducts = decomposeProduct(item.productId, item.quantity);

                    decomposedProducts.forEach(decomposedItem => {
                        const key = `${decomposedItem.productId}_${order.warehouseId}`;

                        if (productQuantities.has(key)) {
                            const existing = productQuantities.get(key);
                            existing.quantity += decomposedItem.quantity;
                            existing.orders.push({
                                orderId: order.id,
                                customerName: order.customerName,
                                quantity: decomposedItem.quantity,
                                originalProduct: item.productName // Pour traçabilité
                            });
                        } else {
                            productQuantities.set(key, {
                                productId: decomposedItem.productId,
                                name: decomposedItem.name,
                                warehouseId: order.warehouseId,
                                warehouseName: order.warehouseName,
                                quantity: decomposedItem.quantity,
                                orders: [{
                                    orderId: order.id,
                                    customerName: order.customerName,
                                    quantity: decomposedItem.quantity,
                                    originalProduct: item.productName // Pour traçabilité
                                }]
                            });
                        }
                    });
                });
            });

            // Convertir en array et trier par nom de produit
            const pickingList = Array.from(productQuantities.values()).sort((a, b) =>
                a.name.localeCompare(b.name)
            );

            return pickingList;

        } catch (error) {
            console.error('Erreur dans generatePickingList service:', error);
            throw error;
        }
    }

    /**
     * Export des commandes - placeholder pour l'implémentation future
     */
    async exportOrders(filters, format) {
        try {
            // Récupérer toutes les données sans pagination
            const allFilters = { ...filters, page: 1, itemsPerPage: 10000 };
            const { data } = await this.getOrders(allFilters);

            switch (format) {
                case 'excel':
                    return this.generateOrdersExcelExport(data);
                case 'pdf':
                    return this.generateOrdersPdfExport(data);
                case 'csv':
                    return this.generateOrdersCsvExport(data);
                default:
                    throw new Error('Format d\'export non supporté');
            }

        } catch (error) {
            console.error('Erreur dans exportOrders service:', error);
            throw error;
        }
    }

    /**
     * Export de la liste de picking - placeholder pour l'implémentation future
     */
    async exportPickingList(filters, format) {
        try {
            const data = await this.generatePickingList(filters);

            switch (format) {
                case 'excel':
                    return this.generatePickingListExcelExport(data);
                case 'pdf':
                    return this.generatePickingListPdfExport(data);
                case 'csv':
                    return this.generatePickingListCsvExport(data);
                default:
                    throw new Error('Format d\'export non supporté');
            }

        } catch (error) {
            console.error('Erreur dans exportPickingList service:', error);
            throw error;
        }
    }

    /**
     * Génère un export CSV des commandes
     */
    async generateOrdersCsvExport(data) {
        try {
            const headers = [
                'ID Commande',
                'Date',
                'Client',
                'Statut',
                'Entrepôt',
                'Adresse de facturation',
                'Adresse de livraison',
                'Produits',
                'Quantité totale',
                'Sous-total',
                'Taxes',
                'Montant total'
            ];

            let csv = headers.join(',') + '\n';

            data.forEach(order => {
                // Calculer la quantité totale
                const totalQuantity = order.lineItems.reduce((sum, item) => sum + item.quantity, 0);

                // Formater les produits
                const products = order.lineItems.map(item =>
                    `${item.productName} (x${item.quantity})`
                ).join('; ');

                // Formater les adresses
                const billingAddress = order.billingAddress
                    ? `${order.billingAddress.street}, ${order.billingAddress.city} ${order.billingAddress.postalCode}, ${order.billingAddress.province}`
                    : 'Non spécifiée';

                const deliveryAddress = order.deliveryAddress
                    ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city} ${order.deliveryAddress.postalCode}, ${order.deliveryAddress.province}`
                    : 'Non spécifiée';

                const row = [
                    order.id,
                    new Date(order.date).toLocaleDateString('fr-FR'),
                    `"${order.customerName}"`,
                    order.status,
                    `"${order.warehouseName}"`,
                    `"${billingAddress}"`,
                    `"${deliveryAddress}"`,
                    `"${products}"`,
                    totalQuantity,
                    order.subtotal.toFixed(2),
                    order.taxes.toFixed(2),
                    order.total.toFixed(2)
                ];

                csv += row.join(',') + '\n';
            });

            return Buffer.from(csv, 'utf8');

        } catch (error) {
            console.error('Erreur lors de la génération CSV des commandes:', error);
            throw error;
        }
    }

    /**
     * Génère un export Excel des commandes
     */
    async generateOrdersExcelExport(data) {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Commandes');

            // En-têtes normalisés (identiques au CSV)
            const headers = [
                'ID Commande',
                'Date',
                'Client',
                'Statut',
                'Entrepôt',
                'Adresse de facturation',
                'Adresse de livraison',
                'Produits',
                'Quantité totale',
                'Sous-total',
                'Taxes',
                'Montant total'
            ];

            worksheet.addRow(headers);

            // Styliser les en-têtes
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE6E6FA' }
            };

            // Données normalisées
            data.forEach(order => {
                const totalQuantity = order.lineItems.reduce((sum, item) => sum + item.quantity, 0);

                // Formater les produits (identique au CSV)
                const products = order.lineItems.map(item =>
                    `${item.productName} (x${item.quantity})`
                ).join('\n');

                const billingAddress = order.billingAddress
                    ? `${order.billingAddress.street}, ${order.billingAddress.city} ${order.billingAddress.postalCode}, ${order.billingAddress.province}`
                    : 'Non spécifiée';

                const deliveryAddress = order.deliveryAddress
                    ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city} ${order.deliveryAddress.postalCode}, ${order.deliveryAddress.province}`
                    : 'Non spécifiée';

                worksheet.addRow([
                    order.id,
                    new Date(order.date).toLocaleDateString('fr-FR'), // Format normalisé
                    order.customerName,
                    order.status,
                    order.warehouseName,
                    billingAddress,
                    deliveryAddress,
                    products, // Ajout de la colonne Produits
                    totalQuantity,
                    parseFloat(order.subtotal.toFixed(2)), // Format numérique normalisé
                    parseFloat(order.taxes.toFixed(2)), // Format numérique normalisé
                    parseFloat(order.total.toFixed(2)) // Format numérique normalisé
                ]);
            });

            // Feuille détaillée des produits
            const detailWorksheet = workbook.addWorksheet('Détail des produits');
            const detailHeaders = [
                'ID Commande',
                'Date',
                'Client',
                'Produit',
                'Quantité',
                'Prix unitaire',
                'Prix total'
            ];

            detailWorksheet.addRow(detailHeaders);
            detailWorksheet.getRow(1).font = { bold: true };
            detailWorksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE6E6FA' }
            };

            data.forEach(order => {
                order.lineItems.forEach(item => {
                    detailWorksheet.addRow([
                        order.id,
                        new Date(order.date).toLocaleDateString('fr-FR'), // Format normalisé
                        order.customerName,
                        item.productName,
                        item.quantity,
                        parseFloat(item.price.toFixed(2)), // Format numérique normalisé
                        parseFloat(item.totalPrice.toFixed(2)) // Format numérique normalisé
                    ]);
                });
            });

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) { // Skip les en-têtes
                    row.alignment = {
                        vertical: 'top',
                        horizontal: 'left',
                        wrapText: true
                    };
                }
            });

            // Ajuster la largeur des colonnes
            [worksheet, detailWorksheet].forEach(ws => {
                ws.columns.forEach(column => {
                    let maxLength = 0;
                    column.eachCell({ includeEmpty: true }, cell => {
                        const columnLength = cell.value ? cell.value.toString().length : 10;
                        if (columnLength > maxLength) {
                            maxLength = columnLength;
                        }
                    });
                    column.width = Math.min(maxLength + 2, 50);
                });
            });

            // Générer le buffer
            return await workbook.xlsx.writeBuffer();

        } catch (error) {
            console.error('Erreur lors de la génération Excel des commandes:', error);
            throw error;
        }
    }

    /**
     * Génère un export PDF des commandes
     */
    async generateOrdersPdfExport(data) {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));

            // En-tête
            doc.fontSize(20).text('Rapport des Commandes', { align: 'center' });
            doc.fontSize(12).text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
            doc.moveDown(2);

            // Résumé
            const totalOrders = data.length;
            const totalAmount = data.reduce((sum, order) => sum + order.total, 0);
            const totalTaxes = data.reduce((sum, order) => sum + order.taxes, 0);

            doc.fontSize(14).text('Résumé:', { underline: true });
            doc.fontSize(12)
                .text(`Nombre total de commandes: ${totalOrders}`)
                .text(`Sous-total: ${(totalAmount - totalTaxes).toFixed(2)} €`)
                .text(`Taxes totales: ${totalTaxes.toFixed(2)} €`)
                .text(`Montant total: ${totalAmount.toFixed(2)} €`)
                .moveDown();

            // Répartition par statut
            const statusCount = data.reduce((acc, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
            }, {});

            doc.text('Répartition par statut:');
            Object.entries(statusCount).forEach(([status, count]) => {
                doc.text(`  - ${status}: ${count} commandes`);
            });
            doc.moveDown();

            // Répartition par entrepôt
            const warehouseCount = data.reduce((acc, order) => {
                acc[order.warehouseName] = (acc[order.warehouseName] || 0) + 1;
                return acc;
            }, {});

            doc.text('Répartition par entrepôt:');
            Object.entries(warehouseCount).forEach(([warehouse, count]) => {
                doc.text(`  - ${warehouse}: ${count} commandes`);
            });
            doc.moveDown();

            // Liste des commandes normalisée
            doc.fontSize(14).text('Liste des commandes:', { underline: true });
            doc.moveDown();

            data.forEach((order, index) => {
                if (doc.y > 650) { // Nouvelle page si nécessaire
                    doc.addPage();
                }

                const totalQuantity = order.lineItems.reduce((sum, item) => sum + item.quantity, 0);

                // Formater les produits (identique au CSV)
                const products = order.lineItems.map(item =>
                    `${item.productName} (x${item.quantity})`
                ).join('; ');

                // Formater les adresses (identique au CSV)
                const billingAddress = order.billingAddress
                    ? `${order.billingAddress.street}, ${order.billingAddress.city} ${order.billingAddress.postalCode}, ${order.billingAddress.province}`
                    : 'Non spécifiée';

                const deliveryAddress = order.deliveryAddress
                    ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city} ${order.deliveryAddress.postalCode}, ${order.deliveryAddress.province}`
                    : 'Non spécifiée';

                doc.fontSize(12)
                    .text(`${index + 1}. Commande ${order.id}`, { continued: true })
                    .text(` - ${new Date(order.date).toLocaleDateString('fr-FR')}`, { align: 'right' }); // Format normalisé

                doc.fontSize(10)
                    .text(`   Client: ${order.customerName}`)
                    .text(`   Statut: ${order.status}`)
                    .text(`   Entrepôt: ${order.warehouseName}`)
                    .text(`   Adresse de facturation: ${billingAddress}`) // Ajout normalisé
                    .text(`   Adresse de livraison: ${deliveryAddress}`) // Ajout normalisé
                    .text(`   Produits: ${products}`) // Format normalisé
                    .text(`   Quantité totale: ${totalQuantity}`) // Format normalisé
                    .text(`   Sous-total: ${order.subtotal.toFixed(2)} €`)
                    .text(`   Taxes: ${order.taxes.toFixed(2)} €`)
                    .text(`   Montant total: ${order.total.toFixed(2)} €`)
                    .moveDown(0.5);
            });

            doc.end();

            return new Promise((resolve, reject) => {
                doc.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });

                doc.on('error', reject);
            });

        } catch (error) {
            console.error('Erreur lors de la génération PDF des commandes:', error);
            throw error;
        }
    }

    /**
     * Génère un export CSV de la liste de picking
     */

    async generatePickingListCsvExport(data) {
        try {
            const headers = [
                'Produit',
                'Entrepôt',
                'Quantité totale',
                'Nombre de commandes',
                'Détail des commandes'
            ];

            const csvData = [
                headers.join(','),
                ...data.map(item => {
                    const orderDetails = item.orders.map(order =>
                        `${order.orderId} (${order.customerName}: ${order.quantity})`
                    ).join('; ');

                    return [
                        `"${item.name}"`,
                        `"${item.warehouseName}"`,
                        item.quantity,
                        item.orders.length,
                        `"${orderDetails}"`
                    ].join(',');
                })
            ].join('\n');

            return Buffer.from(csvData, 'utf8');

        } catch (error) {
            console.error('Erreur lors de la génération CSV de la liste de picking:', error);
            throw error;
        }
    }

    /**
     * Génère un export Excel de la liste de picking
     */
    async generatePickingListExcelExport(data) {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Liste de Picking');

            // En-têtes
            const headers = [
                'Produit',
                'Entrepôt',
                'Quantité totale',
                'Nombre de commandes'
            ];

            worksheet.addRow(headers);

            // Styliser les en-têtes
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFE4B5' }
            };

            // Données principales
            data.forEach(item => {
                worksheet.addRow([
                    item.name,
                    item.warehouseName,
                    item.quantity,
                    item.orders.length
                ]);
            });

            // Feuille détaillée
            const detailWorksheet = workbook.addWorksheet('Détail par commande');
            const detailHeaders = [
                'Produit',
                'Entrepôt',
                'ID Commande',
                'Client',
                'Quantité',
                'Produit original'
            ];

            detailWorksheet.addRow(detailHeaders);
            detailWorksheet.getRow(1).font = { bold: true };
            detailWorksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFE4B5' }
            };

            data.forEach(item => {
                item.orders.forEach(order => {
                    detailWorksheet.addRow([
                        item.name,
                        item.warehouseName,
                        order.orderId,
                        order.customerName,
                        order.quantity,
                        order.originalProduct || item.name
                    ]);
                });
            });

            // Ajuster la largeur des colonnes
            [worksheet, detailWorksheet].forEach(ws => {
                ws.columns.forEach(column => {
                    let maxLength = 0;
                    column.eachCell({ includeEmpty: true }, cell => {
                        const columnLength = cell.value ? cell.value.toString().length : 10;
                        if (columnLength > maxLength) {
                            maxLength = columnLength;
                        }
                    });
                    column.width = Math.min(maxLength + 2, 50);
                });
            });

            // Générer le buffer
            return await workbook.xlsx.writeBuffer();
        } catch (error) {
            console.error('Erreur lors de la génération Excel de la liste de picking:', error);
            throw error;
        }
    }

    /**
     * Génère un export PDF de la liste de picking
     */
    async generatePickingListPdfExport(data) {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));

            // En-tête
            doc.fontSize(20).text('Liste de Picking', { align: 'center' });
            doc.fontSize(12).text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
            doc.moveDown(2);

            // Résumé
            const totalProducts = data.length;
            const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0);
            const totalOrders = new Set(data.flatMap(item => item.orders.map(order => order.orderId))).size;

            doc.fontSize(14).text('Résumé:', { underline: true });
            doc.fontSize(12)
                .text(`Nombre de produits différents: ${totalProducts}`)
                .text(`Quantité totale à préparer: ${totalQuantity}`)
                .text(`Nombre de commandes concernées: ${totalOrders}`)
                .moveDown();

            // Répartition par entrepôt
            const warehouseCount = data.reduce((acc, item) => {
                acc[item.warehouseName] = (acc[item.warehouseName] || 0) + item.quantity;
                return acc;
            }, {});

            doc.text('Répartition par entrepôt:');
            Object.entries(warehouseCount).forEach(([warehouse, quantity]) => {
                doc.text(`  - ${warehouse}: ${quantity} unités`);
            });
            doc.moveDown();

            // Liste de picking groupée par entrepôt
            const groupedByWarehouse = data.reduce((acc, item) => {
                if (!acc[item.warehouseName]) {
                    acc[item.warehouseName] = [];
                }
                acc[item.warehouseName].push(item);
                return acc;
            }, {});

            Object.entries(groupedByWarehouse).forEach(([warehouseName, items]) => {
                if (doc.y > 650) {
                    doc.addPage();
                }

                doc.fontSize(16).text(`Entrepôt: ${warehouseName}`, { underline: true });
                doc.moveDown();

                items.forEach((item, index) => {
                    if (doc.y > 700) {
                        doc.addPage();
                    }

                    doc.fontSize(12)
                        .text(`${item.name}`, { continued: true })
                        .text(`Quantité: ${item.quantity}`, { align: 'right' });

                    doc.fontSize(10)
                        .text(`   Commandes (${item.orders.length}): ${item.orders.map(o => o.orderId).join(', ')}`)
                        .moveDown(0.3);
                });

                doc.moveDown();
            });

            doc.end();

            return new Promise((resolve, reject) => {
                doc.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });

                doc.on('error', reject);
            });

        } catch (error) {
            console.error('Erreur lors de la génération PDF de la liste de picking:', error);
            throw error;
        }
    }
}

export default new OrderService();