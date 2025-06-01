import warehouseService from '../services/warehouseService.js';

/**
 * Récupère les données d'inventaire avec filtres, tri et pagination
 * GET /inventory/stocks
 */
export async function getWarehouses(req, res) {
    try {
        const {
            search = '',
            sortBy = 'name',
            sortOrder = 'asc',
            page,
            itemsPerPage
        } = req.query;

        // Validation des paramètres
        const validSortFields = ['name'];
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

        if (page !== undefined && itemsPerPage !== undefined) {
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
        }

        const result = await warehouseService.getWarehouses({
            search: search.trim(),
            sortBy,
            sortOrder,
            page,
            itemsPerPage
        });

        res.json({
            data: result.data,
            pagination: {
                currentPage: result.currentPage,
                itemsPerPage: result.itemsPerPage,
                totalItems: result.totalItems,
                totalPages: result.totalPages,
                hasNextPage: (page ?? 1) < result.totalPages,
                hasPrevPage: (page ?? 1) > 1
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
