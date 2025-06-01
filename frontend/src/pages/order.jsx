import { useEffect, useState } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    Form,
    Table,
    InputGroup,
    Pagination,
    Badge,
    Button,
    Spinner
} from 'react-bootstrap';
import { Search, Download, Package, ShoppingCart } from 'lucide-react';
import CustomDateRangePicker from '../components/customDatePicker';
import axios from 'axios';
import ExportButton from '../components/exportButton';

const OrdersPage = () => {
    const [selectedWarehouse, setSelectedWarehouse] = useState('all');
    const [warehouses, setWarehouses] = useState([{ id: 'all', name: 'Tous les entrepôts' }]);
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 0 })
    const [pickingList, setPickingList] = useState([]);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [isExporting, setIsExporting] = useState(false);

    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const [isLoadingPickingList, setIsLoadingPickingList] = useState(false);

    const [orderFilters, setOrderFilters] = useState({
        search: '',
        status: 'pending',
        timePeriod: 'yesterday',
        sortBy: 'date',
        sortOrder: 'desc',
        page: 1,
        itemsPerPage: 25
    });

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

    const fetchOrders = () => {
        setIsLoadingOrders(true);
        setTimeout(() => {
            axios.get('/api/orders/', {
                params: {
                    ...orderFilters,
                    warehouseId: selectedWarehouse,
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                },
            })
                .then(response => {
                    const { totalItems, totalPages } = response.data.pagination
                    setOrders(response.data.data);
                    setPagination({ totalItems, totalPages });
                })
                .catch(error => {
                    console.error('Erreur lors de la récupération des commandes:', error);
                })
                .finally(() => {
                    setIsLoadingOrders(false);
                });
        }, 1000);
    };

    useEffect(() => {
        fetchOrders()
    }, [orderFilters, selectedWarehouse]);

    const fetchPickingList = () => {
        setIsLoadingPickingList(true);
        axios.get('/api/orders/picking-list', {
            params: {
                ...orderFilters,
                warehouseId: selectedWarehouse,
                startDate: dateRange.start,
                endDate: dateRange.end,
            },
        })
            .then(response => {
                setPickingList(response.data.data);
            })
            .catch(error => {
                console.error('Erreur lors de la récupération de la picking list:', error);
            })
            .finally(() => {
                setIsLoadingPickingList(false);
            });
    };

    useEffect(() => {
        fetchPickingList();
    }, [orderFilters.timePeriod, selectedWarehouse, dateRange]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-CA');
    };

    const formatPrice = (subtotal, taxes, total) => {
        return `${subtotal.toFixed(2)}$ + ${taxes.toFixed(2)}$ = ${total.toFixed(2)}$`;
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { variant: 'warning', text: 'En attente' },
            preparing: { variant: 'info', text: 'Préparation' },
            ready: { variant: 'success', text: 'Prêt' },
            shipped: { variant: 'primary', text: 'Expédié' },
            delivered: { variant: 'secondary', text: 'Livré' }
        };

        const config = statusConfig[status] || { variant: 'secondary', text: status };
        return <Badge bg={config.variant}>{config.text}</Badge>;
    };

    // Export orders function
    const exportOrders = (format = 'excel') => {
        if (isExporting) return; // Éviter les clics multiples

        setIsExporting(true);
        axios.get('/api/orders/export', {
            params: {
                ...orderFilters,
                warehouseId: selectedWarehouse,
                startDate: dateRange.start,
                endDate: dateRange.end,
                format
            },
            responseType: 'blob'
        })
            .then(response => {
                const blob = response.data;
                const contentDisposition = response.headers['content-disposition'];
                let filename = `commandes_${Date.now()}`;

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

                return { success: true, message: 'Export des commandes terminé avec succès' };
            })
            .catch(error => {
                console.error('Erreur lors de l\'export des commandes:', error);
            })
            .finally(() => {
                setIsExporting(false);
            });
    };

    // Export picking list function
    const exportPicking = (format = 'excel') => {
        if (isExporting) return; // Éviter les clics multiples

        setIsExporting(true);
        axios.get('/api/orders/picking-list/export', {
            params: {
                ...orderFilters,
                warehouseId: selectedWarehouse,
                startDate: dateRange.start,
                endDate: dateRange.end,
                format
            },
            responseType: 'blob'
        })
            .then(response => {
                const blob = response.data;
                const contentDisposition = response.headers['content-disposition'];
                let filename = `picking_list_${Date.now()}`;

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

                return { success: true, message: 'Export de la liste de picking terminé avec succès' };
            })
            .catch(error => {
                console.error('Erreur lors de l\'export de la liste de picking:', error);
            })
            .finally(() => {
                setIsExporting(false);
            });
    };

    // Rendu de la pagination
    const renderPagination = () => {
        if (pagination.totalPages <= 1) return null;

        const items = [];
        for (let number = 1; number <= pagination.totalPages; number++) {
            items.push(
                <Pagination.Item
                    key={number}
                    active={number === orderFilters.page}
                    onClick={() => setOrderFilters(prev => ({ ...prev, page: number }))}
                >
                    {number}
                </Pagination.Item>
            );
        }

        return <Pagination className="mb-0">{items}</Pagination>;
    };

    return (
        <Container fluid className="py-4">
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <h2>Gestion des Commandes - Picking</h2>
                        <Form.Select
                            value={selectedWarehouse}
                            onChange={(e) => setSelectedWarehouse(e.target.value)}
                            style={{ width: '300px' }}
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

            {/* Carte des filtres avec layout responsive amélioré */}
            <Card className="mb-4">
                <Card.Header>
                    <Row className="align-items-center">
                        <Col md={4}>
                            <InputGroup>
                                <InputGroup.Text><Search size={16} /></InputGroup.Text>
                                <Form.Control
                                    placeholder="Nom de client ou id de commande..."
                                    value={orderFilters.search}
                                    onChange={(e) => setOrderFilters(prev => ({
                                        ...prev,
                                        search: e.target.value,
                                        page: 1
                                    }))}
                                />
                            </InputGroup>
                        </Col>
                        <Col md={8} className="d-flex justify-content-end gap-2 align-items-center">
                            <Form.Select
                                value={orderFilters.status}
                                onChange={(e) => setOrderFilters(prev => ({
                                    ...prev,
                                    status: e.target.value,
                                    page: 1
                                }))}
                                style={{ width: 'auto' }}
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="pending">En attente</option>
                                <option value="preparing">Préparation</option>
                                <option value="ready">Prêt</option>
                                <option value="shipped">Expédié</option>
                                <option value="delivered">Livré</option>
                            </Form.Select>

                            <Form.Select
                                value={orderFilters.timePeriod}
                                onChange={(e) => setOrderFilters(prev => ({
                                    ...prev,
                                    timePeriod: e.target.value,
                                    page: 1
                                }))}
                                style={{ width: 'auto' }}
                            >
                                <option value="all">Toutes les dates</option>
                                <option value="today">Aujourd&apos;hui</option>
                                <option value="yesterday">Hier</option>
                                <option value="week">Cette semaine</option>
                                <option value="custom">Période personnalisée</option>
                            </Form.Select>
                            {orderFilters.timePeriod === 'custom' && (
                                <CustomDateRangePicker
                                    value={dateRange}
                                    onChange={setDateRange}
                                    onApply={() => setOrderFilters(prev => ({ ...prev, page: 1 }))}
                                />
                            )}

                            <Form.Select
                                value={orderFilters.itemsPerPage}
                                onChange={(e) => setOrderFilters(prev => ({
                                    ...prev,
                                    itemsPerPage: parseInt(e.target.value),
                                    page: 1
                                }))}
                                style={{ width: 'auto' }}
                            >
                                <option value={5}>5 par page</option>
                                <option value={25}>25 par page</option>
                                <option value={50}>50 par page</option>
                            </Form.Select>
                            <ExportButton
                                variant="outline-primary"
                                size="sm"
                                icon={<ShoppingCart size={16} className="me-1" />}
                                buttonText="Export Commandes"
                                isDisabled={isLoadingOrders}
                                isExporting={isExporting}
                                exportFunction={exportOrders}
                            />
                            <ExportButton
                                variant="outline-success"
                                size="sm"
                                icon={<Package size={16} className="me-1" />}
                                buttonText="Export Picking"
                                isDisabled={isLoadingPickingList}
                                isExporting={isExporting}
                                exportFunction={exportPicking}
                            />
                            {renderPagination()}
                        </Col>
                    </Row>
                </Card.Header>
            </Card>

            {/* Résumé picking */}
            <Card className="mb-4">
                <Card.Header className="bg-success text-white">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">
                            <Package size={20} className="me-2" />
                            Liste de Picking
                            {!isLoadingPickingList && pickingList.length > 0 && (
                                <span>({pickingList.length} produits différents)</span>
                            )}
                        </h5>
                        <Button
                            variant="light"
                            size="sm"
                            onClick={() => exportPicking('csv')}
                            disabled={isLoadingPickingList || pickingList.length === 0}
                        >
                            <Download size={16} className="me-1" />
                            Export
                        </Button>
                    </div>
                </Card.Header>
                <Card.Body>
                    {isLoadingPickingList ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" variant="success" className="me-2" />
                            <span>Chargement de la liste de picking...</span>
                        </div>
                    ) : pickingList.length > 0 ? (
                        <Row>
                            {pickingList.map((item, index) => (
                                <Col md={6} lg={4} key={index} className="mb-2">
                                    <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                                        <span className="fw-medium">{item.name}</span>
                                        <Badge bg="success" className="fs-6">x{item.quantity}</Badge>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    ) : (
                        <div className="text-center py-4 text-muted">
                            Aucun produit à picker avec les filtres actuels
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Table des commandes */}
            <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                        Commandes
                        {!isLoadingOrders && <span>({orders.length})</span>}
                    </h5>
                    {!isLoadingOrders && (
                        <small className="text-muted">
                            Affichage de {((orderFilters.page - 1) * orderFilters.itemsPerPage) + 1} à{' '}
                            {Math.min(orderFilters.page * orderFilters.itemsPerPage, pagination.totalItems)} sur{' '}
                            {pagination.totalItems} commandes
                        </small>
                    )}
                </Card.Header>
                <Card.Body className="p-0">
                    {isLoadingOrders ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" className="me-2" />
                            <span>Chargement des commandes...</span>
                        </div>
                    ) : (
                        <>
                            <Table responsive hover className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>ID Commande</th>
                                        <th>Date</th>
                                        <th>Client</th>
                                        <th>Statut</th>
                                        <th>Articles</th>
                                        <th>Montants</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(order => (
                                        <tr key={order.id}>
                                            <td className="fw-medium">{order.id?.slice(0, 8)}...</td>
                                            <td>{formatDate(order.date)}</td>
                                            <td>{order.customerName}</td>
                                            <td>{getStatusBadge(order.status)}</td>
                                            <td>
                                                {order.lineItems?.map((item, idx) => (
                                                    <div key={idx} className="small">
                                                        {item.productName} × {item.quantity}
                                                    </div>
                                                ))}
                                            </td>
                                            <td>{formatPrice(order.subtotal, order.taxes, order.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>

                            {orders.length === 0 && (
                                <div className="text-center py-4 text-muted">
                                    Aucune commande trouvée avec les filtres actuels
                                </div>
                            )}
                        </>
                    )}
                </Card.Body>
            </Card>
        </Container >
    );
};

export default OrdersPage;