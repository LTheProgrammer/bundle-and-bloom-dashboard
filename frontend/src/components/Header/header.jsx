import { Menu, Globe, LogOut } from 'lucide-react';
import {
    Navbar,
    Container,
    Button,
    Dropdown,
    Image
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const Header = ({ user, onToggleDrawer, onLanguageChange, currentLanguage, onLogout }) => {
    const navigate = useNavigate();
    return (
        <Navbar bg="primary" variant="dark" className="shadow-sm">
            <Container fluid>
                <div className="d-flex align-items-center">
                    {user && (
                        <Button
                            variant="outline-light"
                            className="me-3"
                            onClick={onToggleDrawer}
                        >
                            <Menu size={20} />
                        </Button>
                    )}
                    <Navbar.Brand
                        className="mb-0 h4 d-flex align-items-center"
                        onClick={() => navigate('/')}
                        style={{ cursor: 'pointer' }}
                    >
                        <Image
                            src={'logo.png'}
                            alt="logo"
                            className="d-block"
                            style={{
                                height: '60px', // Desktop
                                width: 'auto',
                                maxWidth: '150px'
                            }}
                            height="40"
                            width="auto"
                        />
                    </Navbar.Brand>
                </div>

                <div className="d-flex align-items-center gap-3">
                    {/* Sélecteur de langue */}
                    <Dropdown>
                        <Dropdown.Toggle
                            variant="outline-light"
                            className="d-flex align-items-center gap-2"
                        >
                            <Globe size={16} />
                            {currentLanguage === 'fr' ? 'FR' : 'EN'}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item onClick={() => onLanguageChange('fr')}>
                                Français
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => onLanguageChange('en')}>
                                English
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>

                    {/* Profil utilisateur */}
                    {user && (
                        <Dropdown align="end">
                            <Dropdown.Toggle
                                variant="outline-light"
                                className="d-flex align-items-center gap-2"
                            >
                                <Image
                                    src={user.avatar || 'profilePlaceHolder.jpeg'}
                                    alt="Avatar"
                                    roundedCircle
                                    width={32}
                                    height={32}
                                />
                                <span className="d-none d-md-inline">
                                    {(user?.name?.split(' '))?.[0] ?? 'Inconnu'}
                                </span>
                            </Dropdown.Toggle>

                            <Dropdown.Menu className="p-3" style={{ minWidth: '250px' }}>
                                <div className="text-center mb-3">
                                    <Image
                                        src={user.avatar || 'profilePlaceHolder.jpeg'}
                                        alt="Avatar"
                                        roundedCircle
                                        width={64}
                                        height={64}
                                        className="mb-2"
                                    />
                                    <h6 className="mb-1">{(user?.name?.split(' '))?.[0] ?? 'Inconnu'}</h6>
                                    <small className="text-muted">
                                        {user?.name ?? 'Inconnu'}
                                    </small>
                                </div>

                                <Dropdown.Divider />

                                <div className="d-grid">
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={onLogout}
                                    >
                                        <LogOut size={16} className="me-2" />
                                        Déconnexion
                                    </Button>
                                </div>
                            </Dropdown.Menu>
                        </Dropdown>
                    )}
                </div>
            </Container>
        </Navbar>
    );
};

export default Header;