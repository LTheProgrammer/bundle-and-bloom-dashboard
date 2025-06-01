import { useState, useEffect } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    Form,
    Table,
    InputGroup,
    Dropdown,
    Pagination,
    Spinner
} from 'react-bootstrap';
import { Search, Download } from 'lucide-react';
import axios from 'axios';
import ExportButton from '../components/exportButton';

const InventoryPage = () => {

    const [selectedWarehouse, setSelectedWarehouse] = useState('all');
    const [warehouses, setWarehouses] = useState([{ id: 'all', name: 'Tous les entrepôts' }]);
    const [stocks, setStocks] = useState([]);
    const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 0 })

    const [isLoadingStocks, setIsLoadingStocks] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [stockFilters, setStockFilters] = useState({
        search: '',
        sortBy: 'name',
        sortOrder: 'asc',
        page: 1,
        itemsPerPage: 25
    });

    const fetchInventoryStocks = () => {
        setIsLoadingStocks(true);
        const timeoutId = setTimeout(() => {
            // Check if component is still mounted (you'd need a ref for this)
            axios.get('/api/inventory/stocks', {
                params: {
                    ...stockFilters,
                    warehouseId: selectedWarehouse,
                },
            })
                .then(response => {
                    const { totalItems, totalPages } = response.data.pagination;
                    setStocks(response.data.data);
                    setPagination({ totalItems, totalPages });
                })
                .catch(error => {
                    console.error('Erreur lors de la récupération des stocks:', error);
                })
                .finally(() => {
                    setIsLoadingStocks(false);
                });
        }, 1000);

        // Return cleanup function
        return () => clearTimeout(timeoutId);
    };

    const exportInventoryStocks = (format = 'excel') => {
        if (isExporting) return; // Éviter les clics multiples

        setIsExporting(true);
        axios.get('/api/inventory/export', {
            params: {
                format,
                warehouseId: selectedWarehouse,
                search: stockFilters.search,
                sortBy: stockFilters.sort,
                sortOrder: stockFilters.sortOrder,
            },
            responseType: 'blob'
        })
            .then(response => {
                const blob = response.data;
                const contentDisposition = response.headers['content-disposition'];
                let filename = `inventaire_${Date.now()}`;

                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename=(.+)/);
                    if (filenameMatch) {
                        filename = filenameMatch[1].replace(/"/g, '');
                    }
                } else {
                    const extensions = { excel: '.xlsx', pdf: '.pdf', csv: '.csv' };
                    filename += extensions[format] || '.xlsx';
                }

                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();

                window.URL.revokeObjectURL(url);
                document.body.removeChild(link);

                return { success: true, message: 'Export terminé avec succès' };
            })
            .catch(error => {
                console.error('Erreur lors de l\'export:', error);
            })
            .finally(() => {
                setIsExporting(false);
            });
    };

    useEffect(() => {
        fetchInventoryStocks()
    }, [stockFilters, selectedWarehouse]);

    const fetchWarehouses = () => {
        axios.get('/api/warehouses/')
            .then(response => {
                setWarehouses([{ id: 'all', name: 'Tous les entrepôts' }, ...response.data.data]);
            })
            .catch(error => {
                console.error('Erreur lors de la récupération des warehouses:', error);
            });
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    // Fonction pour formater la date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('fr-CA');
    };

    // Rendu de la pagination
    const renderPagination = (paginationData, filters, setFilters) => {
        if (paginationData.totalPages <= 1) return null;

        const items = [];
        for (let number = 1; number <= paginationData.totalPages; number++) {
            items.push(
                <Pagination.Item
                    key={number}
                    active={number === filters.page}
                    onClick={() => setFilters(prev => ({ ...prev, page: number }))}
                    disabled={isLoadingStocks}
                >
                    {number}
                </Pagination.Item>
            );
        }

        return (
            <div className="d-flex justify-content-between align-items-center mt-3">
                <small className="text-muted">
                    {!isLoadingStocks && (
                        <>
                            Affichage de {((filters.page - 1) * filters.itemsPerPage) + 1} à{' '}
                            {Math.min(filters.page * filters.itemsPerPage, paginationData.totalItems)} sur{' '}
                            {paginationData.totalItems} éléments
                        </>
                    )}
                </small>
                <Pagination className="mb-0">{items}</Pagination>
            </div>
        );
    };

    return (
        <Container fluid className="py-4">
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <h2>Gestion d&apos;Entrepôt - Stocks</h2>
                        <Form.Select
                            value={selectedWarehouse}
                            onChange={(e) => setSelectedWarehouse(e.target.value)}
                            style={{ width: '300px' }}
                            disabled={isLoadingStocks}
                        >
                            {warehouses.map(warehouse => (
                                <option key={warehouse.id} value={warehouse.id}>
                                    {warehouse.name}
                                </option>
                            ))}
                        </Form.Select>
                    </div>
                </Col>
            </Row>

            <Card>
                <Card.Header>
                    <Row className="align-items-center">
                        <Col md={4}>
                            <InputGroup>
                                <InputGroup.Text><Search size={16} /></InputGroup.Text>
                                <Form.Control
                                    placeholder="Rechercher un produit..."
                                    value={stockFilters.search}
                                    onChange={(e) => setStockFilters(prev => ({
                                        ...prev,
                                        search: e.target.value,
                                        page: 1
                                    }))}
                                    disabled={isLoadingStocks}
                                />
                            </InputGroup>
                        </Col>
                        <Col md={8} className="d-flex justify-content-end gap-2">
                            <Form.Select
                                value={stockFilters.itemsPerPage}
                                onChange={(e) => setStockFilters(prev => ({
                                    ...prev,
                                    itemsPerPage: parseInt(e.target.value),
                                    page: 1
                                }))}
                                style={{ width: 'auto' }}
                                disabled={isLoadingStocks}
                            >
                                <option value={10}>10 par page</option>
                                <option value={25}>25 par page</option>
                                <option value={50}>50 par page</option>
                                <option value={100}>100 par page</option>
                            </Form.Select>
                            <ExportButton
                                variant="outline-success"
                                size="sm"
                                icon={<Download size={16} className="me-1" />}
                                buttonText="Export"
                                isDisabled={isLoadingStocks || stocks.length === 0}
                                isExporting={isExporting}
                                exportFunction={exportInventoryStocks}
                            />
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Body className="p-0">
                    {isLoadingStocks ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" className="me-2" />
                            <span>Chargement des stocks...</span>
                        </div>
                    ) : (
                        <>
                            <Table responsive hover className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setStockFilters(prev => ({
                                                ...prev,
                                                sortBy: 'name',
                                                sortOrder: prev.sortBy === 'name' && prev.sortOrder === 'asc' ? 'desc' : 'asc'
                                            }))}
                                        >
                                            Produit {stockFilters.sortBy === 'name' && (stockFilters.sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setStockFilters(prev => ({
                                                ...prev,
                                                sortBy: 'totalQuantity',
                                                sortOrder: prev.sortBy === 'totalQuantity' && prev.sortOrder === 'asc' ? 'desc' : 'asc'
                                            }))}
                                        >
                                            Stock total {stockFilters.sortBy === 'totalQuantity' && (stockFilters.sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th>Réservé</th>
                                        <th
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setStockFilters(prev => ({
                                                ...prev,
                                                sortBy: 'availableQuantity',
                                                sortOrder: prev.sortBy === 'availableQuantity' && prev.sortOrder === 'asc' ? 'desc' : 'asc'
                                            }))}
                                        >
                                            Disponible {stockFilters.sortBy === 'availableQuantity' && (stockFilters.sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th>Seuil min.</th>
                                        <th>Dernière MAJ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stocks.map(item => (
                                        <tr key={item.id}>
                                            <td className="fw-medium">{item.name}</td>
                                            <td>{item.totalQuantity}</td>
                                            <td>{item.reservedQuantity}</td>
                                            <td className="fw-bold">{item.availableQuantity}</td>
                                            <td>{item.minThreshold}</td>
                                            <td className="text-muted small">{formatDate(item.lastUpdated)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>

                            {stocks.length === 0 && (
                                <div className="text-center py-4 text-muted">
                                    Aucun stock trouvé avec les filtres actuels
                                </div>
                            )}

                            {renderPagination(pagination, stockFilters, setStockFilters)}
                        </>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default InventoryPage;