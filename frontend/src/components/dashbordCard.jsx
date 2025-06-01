// Composant Card réutilisable
const DashboardCard = ({ title, description, icon: Icon, color, onClick }) => {
    return (
        <div
            className="card h-100 border-0 shadow-sm"
            style={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: color
            }}
            onClick={onClick}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            }}
        >
            <div className="card-body d-flex flex-column justify-content-center text-center p-4">
                <div className="mb-3">
                    <Icon size={48} className="text-dark opacity-75" />
                </div>
                <h5 className="card-title mb-3 text-dark">
                    {title}
                </h5>
                <p className="card-text text-dark opacity-75 small">
                    {description}
                </p>
            </div>
        </div>
    );
};

export default DashboardCard;