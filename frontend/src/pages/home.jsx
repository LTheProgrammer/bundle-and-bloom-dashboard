import { Package, ShoppingCart, Warehouse, FileText, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardCard from '../components/dashbordCard';



export default function HomePage({ user }) {
  // Simuler un utilisateur - tu peux le remplacer par tes données réelles
  const navigate = useNavigate();

  // Array d'objets pour les cartes
  const dashboardCards = [
    {
      id: 'warehouse',
      title: 'Entrepôt',
      description: 'Visualisez l\'état des stocks de vos entrepots!',
      icon: Warehouse,
      color: '#E8F4FD', // Bleu pastel
      route: '/inventory'
    },
    {
      id: 'orders',
      title: 'Commandes',
      description: 'Exportez la liste des produits à préparer !',
      icon: ShoppingCart,
      color: '#F0F9E8', // Vert pastel
      route: '/orders'
    }
  ];

  const handleCardClick = (card) => {
    navigate(card.route);
  };

  return (
    <div className="min-vh-100 bg-light">
      <div className="container py-5">
        {/* Message de bienvenue avec le nom d'utilisateur */}
        <div className="row mb-5">
          <div className="col text-center">
            <h1 className="display-3 fw-light text-dark mb-4">
              Bonjour {(user?.name?.split(' '))?.[0] ?? 'Inconnu'} !
            </h1>
            <h2 className="display-5 fw-light text-dark mb-3">
              Tableau de Bord
            </h2>
            <p className="lead text-muted">
              Bienvenue ! Choisissez une section pour commencer
            </p>
          </div>
        </div>

        {/* Cartes du dashboard */}
        <div className="row justify-content-center g-4 mb-5">
          {dashboardCards.map((card) => (
            <div key={card.id} className="col-auto">
              <div style={{ width: '300px' }}>
                <DashboardCard
                  title={card.title}
                  description={card.description}
                  icon={card.icon}
                  color={card.color}
                  onClick={() => handleCardClick(card)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Section statistiques rapides */}
        <div className="row">
          <div className="col">
            <div className="card border-0 shadow-sm" style={{ backgroundColor: '#F8F9FA' }}>
              <div className="card-body text-center py-4">
                <h5 className="text-muted mb-4">Statistiques du mois</h5>
                <div className="row">
                  <div className="col-4">
                    <div className="text-primary">
                      <BarChart3 size={32} className="mb-2" />
                      <h4 className="mb-0">127</h4>
                      <small className="text-muted">Commandes</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="text-success">
                      <Package size={32} className="mb-2" />
                      <h4 className="mb-0">89</h4>
                      <small className="text-muted">Expédiées</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="text-warning">
                      <FileText size={32} className="mb-2" />
                      <h4 className="mb-0">12</h4>
                      <small className="text-muted">En attente</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}