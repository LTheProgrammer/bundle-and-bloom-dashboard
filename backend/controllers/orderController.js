import orderService from '../services/orderService.js';

/**
 * Récupère les commandes avec filtres, tri et pagination
 * GET /orders
 */
export async function getOrders(req, res) {
    try {
        const {
            warehouseId = 'all',
            search = '',
            status = 'all',
            timePeriod = 'all',
            startDate,
            endDate,
            sortBy = 'date',
            sortOrder = 'desc',
            page = 1,
            itemsPerPage = 25
        } = req.query;

        // Validation des paramètres
        const validSortFields = ['date', 'customerId', 'status', 'total', 'id'];
        const validSortOrders = ['asc', 'desc'];
        const validStatuses = ['all', 'pending', 'preparing', 'ready', 'shipped', 'delivered'];
        const validTimePeriods = ['all', 'today', 'yesterday', 'week', 'month', 'custom'];

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

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Statut invalide'
            });
        }

        if (!validTimePeriods.includes(timePeriod)) {
            return res.status(400).json({
                success: false,
                message: 'Période de temps invalide'
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

        // Validation des dates pour période personnalisée
        if (timePeriod === 'custom') {
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Dates de début et fin requises pour période personnalisée'
                });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Format de date invalide'
                });
            }

            if (start > end) {
                return res.status(400).json({
                    success: false,
                    message: 'La date de début doit être antérieure à la date de fin'
                });
            }
        }

        const filters = {
            warehouseId,
            search: search.trim(),
            status,
            timePeriod,
            startDate,
            endDate,
            sortBy,
            sortOrder,
            page: pageNum,
            itemsPerPage: itemsPerPageNum
        };

        const result = await orderService.getOrders(filters);

        res.json({
            success: true,
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
        console.error('Erreur dans getOrders:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Récupère les détails d'une commande spécifique
 * GET /orders/:id
 */
export async function getOrderById(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de commande requis'
            });
        }

        const order = await orderService.getOrderById(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Commande non trouvée'
            });
        }

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Erreur dans getOrderById:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Met à jour le statut d'une commande
 * PUT /orders/:id/status
 */
export async function updateOrderStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de commande requis'
            });
        }

        const validStatuses = ['pending', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Statut invalide'
            });
        }

        const updatedOrder = await orderService.updateOrderStatus(id, status);

        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                message: 'Commande non trouvée'
            });
        }

        res.json({
            success: true,
            data: updatedOrder,
            message: 'Statut de commande mis à jour avec succès'
        });

    } catch (error) {
        console.error('Erreur dans updateOrderStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Génère la liste de picking pour les commandes pending pour les filtres sélectionnés
 * GET /orders/picking-list
 */
export async function getPickingList(req, res) {
    try {
        const status = 'pending';
        const {
            warehouseId = 'all',
            search = '',
            timePeriod = 'all',
            startDate,
            endDate
        } = req.query;

        const validTimePeriods = ['all', 'today', 'yesterday', 'week', 'custom'];

        if (!validTimePeriods.includes(timePeriod)) {
            return res.status(400).json({
                success: false,
                message: 'Période de temps invalide'
            });
        }

        // Validation des dates pour période personnalisée
        if (timePeriod === 'custom') {
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Dates de début et fin requises pour période personnalisée'
                });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Format de date invalide'
                });
            }

            if (start > end) {
                return res.status(400).json({
                    success: false,
                    message: 'La date de début doit être antérieure à la date de fin'
                });
            }
        }

        const pickingList = await orderService.generatePickingList({
            warehouseId,
            search: search.trim(),
            status,
            timePeriod,
            startDate,
            endDate
        });

        res.json({
            success: true,
            data: pickingList,
            totalProducts: pickingList.length,
            totalQuantity: pickingList.reduce((sum, item) => sum + item.quantity, 0)
        });

    } catch (error) {
        console.error('Erreur dans getPickingList:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Export des commandes
 * GET /orders/export
 */
export async function exportOrders(req, res) {
    try {
        const {
            format = 'csv',
            warehouseId = 'all',
            search = '',
            status = 'all',
            timePeriod = 'all',
            startDate,
            endDate,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;

        if (!['csv', 'excel', 'pdf'].includes(format)) {
            return res.status(400).json({
                success: false,
                message: 'Format d\'export invalide (csv, excel, pdf)'
            });
        }

        const validStatuses = ['all', 'pending', 'preparing', 'ready', 'shipped', 'delivered'];
        const validTimePeriods = ['all', 'today', 'yesterday', 'week', 'custom'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Statut invalide'
            });
        }

        if (!validTimePeriods.includes(timePeriod)) {
            return res.status(400).json({
                success: false,
                message: 'Période de temps invalide'
            });
        }

        // Validation des dates pour période personnalisée
        if (timePeriod === 'custom') {
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Dates de début et fin requises pour période personnalisée'
                });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Format de date invalide'
                });
            }
        }

        const filters = {
            warehouseId,
            search: search.trim(),
            status,
            timePeriod,
            startDate,
            endDate,
            sortBy,
            sortOrder,
            page: 1,
            itemsPerPage: 10000 // Récupérer toutes les commandes pour l'export
        };

        const exportData = await orderService.exportOrders(filters, format);

        // Définir les headers selon le format
        const headers = {
            csv: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename=commandes_${Date.now()}.csv`
            },
            excel: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename=commandes_${Date.now()}.xlsx`
            },
            pdf: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=commandes_${Date.now()}.pdf`
            }
        };

        res.set(headers[format]);
        res.send(exportData);

    } catch (error) {
        console.error('Erreur dans exportOrders:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'export des commandes',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Export de la liste de picking
 * GET /orders/picking-list/export
 */
export async function exportPickingList(req, res) {
    try {
        const status = 'pending';
        const {
            format = 'csv',
            warehouseId = 'all',
            search = '',
            timePeriod = 'all',
            startDate,
            endDate
        } = req.query;

        if (!['csv', 'excel', 'pdf'].includes(format)) {
            return res.status(400).json({
                success: false,
                message: 'Format d\'export invalide (csv, excel, pdf)'
            });
        }

        const validTimePeriods = ['all', 'today', 'yesterday', 'week', 'custom'];

        if (!validTimePeriods.includes(timePeriod)) {
            return res.status(400).json({
                success: false,
                message: 'Période de temps invalide'
            });
        }

        // Validation des dates pour période personnalisée
        if (timePeriod === 'custom') {
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Dates de début et fin requises pour période personnalisée'
                });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Format de date invalide'
                });
            }
        }

        const exportData = await orderService.exportPickingList({
            warehouseId,
            search: search.trim(),
            status,
            timePeriod,
            startDate,
            endDate
        }, format);

        // Définir les headers selon le format
        const headers = {
            csv: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename=picking_list_${Date.now()}.csv`
            },
            excel: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename=picking_list_${Date.now()}.xlsx`
            },
            pdf: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=picking_list_${Date.now()}.pdf`
            }
        };

        res.set(headers[format]);
        res.send(exportData);

    } catch (error) {
        console.error('Erreur dans exportPickingList:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'export de la liste de picking',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Créer une nouvelle commande
 * POST /orders
 */
export async function createOrder(req, res) {
    try {
        const {
            customerId,
            warehouseId,
            billingAddressId,
            deliveryAddressId,
            lineItems
        } = req.body;

        // Validation des champs requis
        if (!customerId || !warehouseId || !billingAddressId || !deliveryAddressId || !lineItems) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs requis doivent être fournis'
            });
        }

        if (!Array.isArray(lineItems) || lineItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Au moins un article doit être inclus dans la commande'
            });
        }

        // Validation des articles de la commande
        for (const item of lineItems) {
            if (!item.productId || !item.quantity || item.quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Chaque article doit avoir un ID produit et une quantité valide'
                });
            }
        }

        const orderData = {
            customerId,
            warehouseId,
            billingAddressId,
            deliveryAddressId,
            lineItems
        };

        const newOrder = await orderService.createOrder(orderData);

        res.status(201).json({
            success: true,
            data: newOrder,
            message: 'Commande créée avec succès'
        });

    } catch (error) {
        console.error('Erreur dans createOrder:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}