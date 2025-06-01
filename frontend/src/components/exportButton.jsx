import {
    Dropdown,
    Spinner
} from 'react-bootstrap';
import { Download } from 'lucide-react';

const formatString = {
    csv: 'Export CSV',
    excel: 'Export Excel',
    pdf: 'Export PDF'
}


const ExportButton = ({ variant, size, icon, buttonText, isDisabled, isExporting, exportFunction, format = ['csv', 'excel', 'pdf'] }) => {
    return (
        <Dropdown>
            <Dropdown.Toggle
                variant={variant}
                size={size}
                disabled={isDisabled || isExporting}
            >
                {isExporting ? (
                    <>
                        <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            className="me-1"
                        />
                        Export...
                    </>
                ) : (
                    <>
                        {icon}
                        {buttonText}
                    </>
                )}
            </Dropdown.Toggle>
            <Dropdown.Menu>
                {
                    format.map((e) =>
                        formatString[e] && (
                            <Dropdown.Item
                                key={e}
                                onClick={() => exportFunction(e)}
                                disabled={isExporting}
                            >
                                {formatString[e]}
                            </Dropdown.Item>
                        )
                    )
                }
            </Dropdown.Menu>
        </Dropdown>
    );
};

export default ExportButton;
