import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Home, Warehouse, ShoppingCart } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from "react";

const menuItems = [
    {
        id: 'home',
        route: '/',
        icon: Home,
        label: 'Accueil'
    },
    {
        id: 'warehouse',
        route: '/inventory',
        icon: Warehouse,
        label: 'Entrepôt'
    },
    {
        id: 'orders',
        route: '/orders',
        icon: ShoppingCart,
        label: 'Commandes'
    }
];

// Composant Drawer (Navigation)
const NavigationDrawer = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const getCurrentSection = () => {
        const activeItem = menuItems.find(item => item.route === location.pathname);
        return activeItem ? activeItem.id : 'home';
    };

    const [currentSection, setCurrentSection] = useState(getCurrentSection());

    useEffect(() => {
        setCurrentSection(getCurrentSection());
    }, [location.pathname]);

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <>
                    <div
                        className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
                        style={{ zIndex: 1040 }}
                        onClick={onClose}
                    />
                    <div
                        className={`position-fixed top-0 start-0 h-100 bg-white shadow-lg transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-n100'}`}
                        style={{ width: '280px', zIndex: 1050, transition: 'transform 0.3s ease' }}
                    >
                        <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                            <h5 className="mb-0">Navigation</h5>
                            <button className="btn btn-outline-secondary btn-sm" onClick={onClose}>
                                <X size={16} />
                            </button>
                        </div>

                        <nav className="p-3">
                            {menuItems && menuItems.map((item) => {
                                const IconComponent = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        className={`btn w-100 text-start mb-2 d-flex align-items-center gap-3 ${currentSection === item.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => {
                                            navigate(item.route);
                                            onClose();
                                        }}
                                    >
                                        {IconComponent && <IconComponent size={20} />}
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </>
            )}
        </>
    );
};

export default NavigationDrawer;