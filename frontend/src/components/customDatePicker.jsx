import { useState } from 'react';
import {
    Row,
    Col,
    Form,
    Button,
    Modal
} from 'react-bootstrap';
import { Search, Download, Package, ShoppingCart, Calendar } from 'lucide-react';

const CustomDateRangePicker = ({ value, onChange, onApply }) => {
    const [show, setShow] = useState(false);
    const [startDate, setStartDate] = useState(value?.start || '');
    const [endDate, setEndDate] = useState(value?.end || '');

    const handleApply = () => {
        if (startDate && endDate) {
            onChange({ start: startDate, end: endDate });
            onApply();
        }
        setShow(false);
    };

    const formatDateRange = () => {
        if (value?.start && value?.end) {
            return `${new Date(value.start).toLocaleDateString('fr-CA')} - ${new Date(value.end).toLocaleDateString('fr-CA')}`;
        }
        return 'Sélectionner une période';
    };

    return (
        <>
            <Button
                variant="outline-secondary"
                onClick={() => setShow(true)}
                className="d-flex align-items-center"
            >
                <Calendar size={16} className="me-2" />
                {formatDateRange()}
            </Button>

            <Modal show={show} onHide={() => setShow(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Sélectionner une période</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Date de début</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Date de fin</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShow(false)}>
                        Annuler
                    </Button>
                    <Button variant="primary" onClick={handleApply} disabled={!startDate || !endDate}>
                        Appliquer
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default CustomDateRangePicker;
