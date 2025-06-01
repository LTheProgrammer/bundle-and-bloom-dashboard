import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import LoginPage from './pages/login.jsx';
import Footer from './components/Footer/footer.jsx';
import Header from './components/Header/header.jsx';
import NavigationDrawer from './components/Header/navigationDrawer.jsx';
import { Spinner } from 'react-bootstrap';
import HomePage from './pages/home.jsx';
import InventoryPage from './pages/inventory.jsx';
import OrdersPage from './pages/order.jsx';

function App() {
  const { user, logout, isLoading } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState('fr');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !isLoading) {
      navigate('/login');
    }
  }, [user, navigate, isLoading]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <header>
        <Header
          user={user}
          onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
          onLanguageChange={(lang) => setCurrentLanguage(lang)}
          currentLanguage={currentLanguage}
          onLogout={logout}
        />
      </header>
      {user && <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />}
      <main style={{
        flex: '1 1 auto',
        overflow: 'auto',
        minHeight: 0
      }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          {/*<Route path="/orders" element={<OrdersPage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />*/}
        </Routes>
      </main>
      <footer>
        <Footer />
      </footer>
    </div>
  )
}

export default App
