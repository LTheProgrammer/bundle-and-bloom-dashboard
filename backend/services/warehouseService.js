import { promises as fs } from 'fs';

class WarehouseService {
    constructor() {
        // Chemins vers les fichiers JSON
        this.warehousesPath = './data/warehouses.json';

        // Cache pour éviter de relire les fichiers à chaque requête
        this.cache = {
            warehouses: null,
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
                const [warehousesData] = await Promise.all([
                    fs.readFile(this.warehousesPath, 'utf8')
                ]);
                this.cache.warehouses = JSON.parse(warehousesData);
                this.cache.lastUpdate = now;
            }

            return this.cache;
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            throw new Error('Impossible de charger les données d\'entrepôts');
        }
    }

    /**
     * Récupère les warehouses, avec filtre et pagination si désiré
     */
    async getWarehouses(filters) {
        try {
            const {
                search,
                sortBy = 'name',
                sortOrder = 'asc',
                page,
                itemsPerPage
            } = filters;

            // Charger les données
            const { warehouses } = await this.loadData();

            let filteredData = [...warehouses];

            // Filtrage par recherche (nom de l\'entrepot)
            if (search) {
                const searchLower = search.toLowerCase();
                filteredData = filteredData.filter(item =>
                    item.name.toLowerCase().includes(searchLower)
                );
            }

            // Tri
            filteredData.sort((a, b) => {
                let aVal = a[sortBy];
                let bVal = b[sortBy];

                // Gestion des chaînes de caractères
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }

                if (sortOrder === 'asc') {
                    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                } else {
                    return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
                }
            });

            if (!page || !itemsPerPage) {
                return {
                    data: filteredData,
                    totalItems: filteredData.length,
                    totalPages: 1,
                    currentPage: 1,
                    itemsPerPage: filteredData.length
                };
            }

            // Pagination
            const totalItems = filteredData.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const startIndex = (page - 1) * itemsPerPage;
            const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

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
}

export default new WarehouseService();