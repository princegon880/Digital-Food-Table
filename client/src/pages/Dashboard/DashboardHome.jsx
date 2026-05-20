import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { 
  Utensils, 
  Layers, 
  ShoppingBag, 
  Clock, 
  QrCode, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export default function DashboardHome() {
  const [stats, setStats] = useState({
    itemsCount: 0,
    categoriesCount: 0
  });
  const [loading, setLoading] = useState(true);
  const profile = JSON.parse(localStorage.getItem('profile') || '{}');

  useEffect(() => {
    async function fetchStats() {
      try {
        const [items, categories] = await Promise.all([
          api.get('/items'),
          api.get('/categories')
        ]);

        setStats({
          itemsCount: items.length,
          categoriesCount: categories.length
        });
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    { name: 'Total Dishes', value: stats.itemsCount, icon: Utensils, color: 'var(--info)' },
    { name: 'Categories', value: stats.categoriesCount, icon: Layers, color: 'var(--warning)' },
  ];

  return (
    <div className="dash-home-wrapper animated">
      <div className="dash-header">
        <div>
          <h2>Welcome, {profile.restaurant_name}!</h2>
          <p>Here is what's happening at your restaurant today.</p>
        </div>
        <a 
          href={`/menu/${profile.slug}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn btn-primary"
        >
          <QrCode size={16} />
          <span>View Customer Menu</span>
        </a>
      </div>

      {loading ? (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="stats-grid">
            {statCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="glass stat-card">
                  <div className="stat-content">
                    <span className="stat-label">{card.name}</span>
                    <span className="stat-value">{card.value}</span>
                  </div>
                  <div className="stat-icon-wrapper" style={{ backgroundColor: card.color + '20', color: card.color }}>
                    <Icon size={24} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dashboard-grid">
            {/* Quick Actions */}
            <div className="glass action-card-container">
              <h3>Quick Actions</h3>
              <div className="actions-grid">
                <Link to="/dashboard/menu" className="action-btn">
                  <Utensils size={20} className="action-icon text-primary" />
                  <div>
                    <h5>Add Menu Item</h5>
                    <span>Expand your active dishes</span>
                  </div>
                  <ArrowRight size={16} className="arrow" />
                </Link>
                <Link to="/dashboard/qr" className="action-btn">
                  <QrCode size={20} className="action-icon text-warning" />
                  <div>
                    <h5>Print QR Codes</h5>
                    <span>Configure your table codes</span>
                  </div>
                  <ArrowRight size={16} className="arrow" />
                </Link>
              </div>
            </div>

            {/* Menu Status Tips */}
            <div className="glass action-card-container">
              <h3>QR Menu Guidelines</h3>
              <div className="actions-grid" style={{ gap: '12px', fontSize: '13px', color: 'var(--text-dark-secondary)', lineHeight: '1.5' }}>
                <p>💡 <strong>WhatsApp Checkout:</strong> All customer orders go directly to your configured WhatsApp number as a formatted message containing item details, table numbers, and custom notes.</p>
                <p>✏️ <strong>Dynamic Pricing:</strong> Changes made under the Menu Builder take effect immediately for scanning diners.</p>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        .dash-home-wrapper {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .dash-header h2 {
          font-size: 28px;
          margin-bottom: 4px;
        }
        .dash-header p {
          color: var(--text-dark-secondary);
          font-size: 14px;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }

        .stat-card {
          padding: 24px;
          border-radius: var(--radius-lg);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 13px;
          color: var(--text-dark-muted);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-family: var(--font-brand);
          font-size: 32px;
          font-weight: 800;
          color: var(--text-dark-primary);
        }

        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Dashboard Grid */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        @media (max-width: 992px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        .action-card-container, .recent-orders-card {
          padding: 30px;
          border-radius: var(--radius-lg);
        }

        .action-card-container h3, .recent-orders-card h3 {
          font-size: 18px;
          margin-bottom: 20px;
        }

        .actions-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-md);
          transition: var(--transition-fast);
        }
        .action-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .action-btn:hover .arrow {
          transform: translateX(4px);
          color: var(--primary);
        }

        .action-icon {
          width: 40px;
          height: 40px;
          padding: 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
        }

        .text-primary { color: var(--primary); }
        .text-warning { color: var(--warning); }
        .text-success { color: var(--success); }

        .action-btn div {
          flex-grow: 1;
        }
        .action-btn h5 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-dark-primary);
        }
        .action-btn span {
          font-size: 12px;
          color: var(--text-dark-muted);
        }
        .action-btn .arrow {
          color: var(--text-dark-muted);
          transition: var(--transition-fast);
        }

        /* Recent Orders */
        .card-header-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .card-header-flex h3 {
          margin-bottom: 0 !important;
        }
        .view-all-link {
          font-size: 13px;
          color: var(--primary);
          font-weight: 600;
        }
        .view-all-link:hover {
          text-decoration: underline;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          height: 200px;
          color: var(--text-dark-muted);
          text-align: center;
          font-size: 14px;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .recent-order-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-md);
        }

        .order-main-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
          max-width: 70%;
        }
        .order-table {
          font-weight: 700;
          font-size: 13px;
        }
        .order-items-summary {
          font-size: 12px;
          color: var(--text-dark-secondary);
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .order-meta-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }
        .order-price {
          font-weight: 700;
          font-size: 14px;
          color: var(--primary);
        }

        /* Loader */
        .loader-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 300px;
        }
        .loader {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255, 255, 255, 0.05);
          border-top: 3px solid var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
