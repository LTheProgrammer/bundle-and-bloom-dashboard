import inventoryService from '../services/inventoryService.js';


/**
 * Récupère les données d'inventaire avec filtres, tri et pagination
 * GET /inventory/stocks
 */
export async function getStocks(req, res) {
    try {
        const {
            warehouseId = 'all',
            search = '',
            sortBy = 'name',
            sortOrder = 'asc',
            page = 1,
            itemsPerPage = 25
        } = req.query;

        // Validation des paramètres
        const validSortFields = ['name', 'totalQuantity', 'availableQuantity', 'reservedQuantity', 'minThreshold', 'lastUpdated'];
        const validSortOrders = ['asc', 'desc'];

        if (!validSortFields.includes(sortBy)) {
            return res.status(400).json({
                success: false,
                message: 'Champ de tri invalide'
            });
        }

        if (!validSortOrders.includes(sortOrder)) {
            return res.status(400).json({
                success: false,
                message: 'Ordre de tri invalide'
            });
        }

        const pageNum = parseInt(page);
        const itemsPerPageNum = parseInt(itemsPerPage);

        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({
                success: false,
                message: 'Numéro de page invalide'
            });
        }

        if (isNaN(itemsPerPageNum) || itemsPerPageNum < 1 || itemsPerPageNum > 100) {
            return res.status(400).json({
                success: false,
                message: 'Nombre d\'éléments par page invalide (1-100)'
            });
        }

        const filters = {
            warehouseId,
            search: search.trim(),
            sortBy,
            sortOrder,
            page: pageNum,
            itemsPerPage: itemsPerPageNum
        };

        const result = await inventoryService.getStocks(filters);

        res.json({
            data: result.data,
            pagination: {
                currentPage: pageNum,
                itemsPerPage: itemsPerPageNum,
                totalItems: result.totalItems,
                totalPages: result.totalPages,
                hasNextPage: pageNum < result.totalPages,
                hasPrevPage: pageNum > 1
            }
        });

    } catch (error) {
        console.error('Erreur dans getStocks:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Récupère les détails d'un élément d'inventaire spécifique
 * GET /inventory/stocks/:id
 */
export async function getStockById(req, res) {
    try {
        const { id } = req.params;
        const { warehouseId } = req.query;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID du produit requis'
            });
        }

        const stockItem = await inventoryService.getStockById(id, warehouseId);

        if (!stockItem) {
            return res.status(404).json({
                success: false,
                message: 'Produit non trouvé'
            });
        }

        res.json({
            success: true,
            data: stockItem
        });

    } catch (error) {
        console.error('Erreur dans getStockById:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Met à jour les quantités d'un produit en stock
 * PUT /inventory/stocks/:id
 */
export async function updateStock(req, res) {
    try {
        const { id } = req.params;
        const {
            totalQuantity,
            reservedQuantity,
            minThreshold,
            warehouseId
        } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID du produit requis'
            });
        }

        // Validation des quantités
        if (totalQuantity !== undefined && (isNaN(totalQuantity) || totalQuantity < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Quantité totale invalide'
            });
        }

        if (reservedQuantity !== undefined && (isNaN(reservedQuantity) || reservedQuantity < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Quantité réservée invalide'
            });
        }

        if (minThreshold !== undefined && (isNaN(minThreshold) || minThreshold < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Seuil minimum invalide'
            });
        }

        const updateData = {
            totalQuantity,
            reservedQuantity,
            minThreshold,
            warehouseId
        };

        const updatedStock = await inventoryService.updateStock(id, updateData);

        if (!updatedStock) {
            return res.status(404).json({
                success: false,
                message: 'Produit non trouvé'
            });
        }

        res.json({
            success: true,
            data: updatedStock,
            message: 'Stock mis à jour avec succès'
        });

    } catch (error) {
        console.error('Erreur dans updateStock:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Export des données d'inventaire
 * GET /inventory/export
 */
export async function exportStocks(req, res) {
    try {
        const {
            format = 'excel',
            warehouseId = 'all',
            search = '',
            sortBy = 'name',
            sortOrder = 'asc'
        } = req.query;

        if (!['excel', 'pdf', 'csv'].includes(format)) {
            return res.status(400).json({
                success: false,
                message: 'Format d\'export invalide (excel, pdf, csv)'
            });
        }

        const filters = {
            warehouseId,
            search: search.trim(),
            sortBy,
            sortOrder,
            page: 1,
            itemsPerPage: 10000 // Récupérer tous les éléments pour l'export
        };

        const exportData = await inventoryService.exportStocks(filters, format);

        // Définir les headers selon le format
        const headers = {
            excel: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename=inventaire_${Date.now()}.xlsx`
            },
            pdf: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=inventaire_${Date.now()}.pdf`
            },
            csv: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename=inventaire_${Date.now()}.csv`
            }
        };

        res.set(headers[format]);
        res.send(exportData);

    } catch (error) {
        console.error('Erreur dans exportStocks:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'export',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
