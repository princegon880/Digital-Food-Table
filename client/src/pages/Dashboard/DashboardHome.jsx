import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { 
  Utensils, 
  Layers, 
  QrCode, 
  ArrowRight,
  ShoppingBag,
  TrendingUp,
  Star,
  Clock,
  MessageSquare,
  Inbox
} from 'lucide-react';

// Helper: check if a date string is today
const isToday = (isoString) => {
  if (!isoString) return false;
  const d = new Date(isoString);
  const now = new Date();
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
};

// Render filled/half/empty stars
function StarDisplay({ rating, size = 14 }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={size}
          fill={rating >= s ? '#FFB300' : 'none'}
          color={rating >= s ? '#FFB300' : 'rgba(255,255,255,0.15)'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

// Format currency
function formatCurrency(symbol, value) {
  if (value >= 1000) return `${symbol}${(value / 1000).toFixed(1)}k`;
  return `${symbol}${Math.round(value)}`;
}

// Time ago
function timeAgo(isoString) {
  const diff = (Date.now() - new Date(isoString)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function DashboardHome() {
  const [stats, setStats] = useState({
    itemsCount: 0,
    categoriesCount: 0,
    ordersToday: 0,
    revenueToday: 0,
    pendingOrders: 0,
    avgRating: null,
    totalRatings: 0
  });
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('profile') || '{}'));
  const [todayOrders, setTodayOrders] = useState([]);
  const [showRevenueTooltip, setShowRevenueTooltip] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [items, categories, meData, orders, ratings] = await Promise.all([
          api.get('/items'),
          api.get('/categories'),
          api.get('/auth/me').catch(() => null),
          api.get('/orders').catch(() => []),
          api.get('/ratings').catch(() => [])
        ]);

        // Compute order stats
        const todayOrders = (orders || []).filter(o => isToday(o.created_at));
        const revenueToday = todayOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
        const pendingOrders = (orders || []).filter(o => o.status === 'Pending').length;

        // Compute rating stats
        const ratingList = ratings || [];
        const avgRating = ratingList.length
          ? parseFloat((ratingList.reduce((sum, r) => sum + r.rating, 0) / ratingList.length).toFixed(1))
          : null;

        // Recent feedback with actual text
        const withFeedback = ratingList
          .filter(r => r.feedback && r.feedback.trim())
          .slice(0, 5);

        setStats({
          itemsCount: items.length,
          categoriesCount: categories.length,
          ordersToday: todayOrders.length,
          revenueToday,
          pendingOrders,
          avgRating,
          totalRatings: ratingList.length
        });
        setRecentFeedback(withFeedback);
        setTodayOrders(todayOrders);

        if (meData && meData.profile) {
          localStorage.setItem('profile', JSON.stringify(meData.profile));
          setProfile(meData.profile);
        }
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const currency = profile.currency || '₹';
  
  // Today's revenue calculations for interactive popover tooltip
  const upiRevenue = todayOrders
    .filter(o => o.payment_status === 'Paid' && o.payment_method === 'UPI')
    .reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

  const cashRevenue = todayOrders
    .filter(o => o.payment_status === 'Paid' && o.payment_method === 'Cash')
    .reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

  const cardRevenue = todayOrders
    .filter(o => o.payment_status === 'Paid' && o.payment_method === 'Card')
    .reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

  const unpaidRevenue = todayOrders
    .filter(o => o.payment_status !== 'Paid')
    .reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

  const totalCalculated = upiRevenue + cashRevenue + cardRevenue + unpaidRevenue || 1;

  // Hourly breakdowns
  const lunchRevenue = todayOrders
    .filter(o => {
      const hr = new Date(o.created_at).getHours();
      return hr >= 11 && hr < 16;
    })
    .reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

  const dinnerRevenue = todayOrders
    .filter(o => {
      const hr = new Date(o.created_at).getHours();
      return hr >= 18 && hr < 23;
    })
    .reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

  const otherRevenue = todayOrders
    .filter(o => {
      const hr = new Date(o.created_at).getHours();
      return (hr < 11 || (hr >= 16 && hr < 18) || hr >= 23);
    })
    .reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

  const primaryStats = [
    {
      name: "Today's Orders",
      value: stats.ordersToday,
      icon: ShoppingBag,
      color: '#FF5E00',
      bg: 'rgba(255, 94, 0, 0.1)',
      suffix: ''
    },
    {
      name: "Today's Revenue",
      value: formatCurrency(currency, stats.revenueToday),
      icon: TrendingUp,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.1)',
      isString: true
    },
    {
      name: 'Avg Rating',
      value: stats.avgRating !== null ? stats.avgRating : '—',
      icon: Star,
      color: '#FFB300',
      bg: 'rgba(255, 179, 0, 0.1)',
      sub: stats.totalRatings > 0 ? `${stats.totalRatings} review${stats.totalRatings !== 1 ? 's' : ''}` : 'No ratings yet',
      isString: true
    },
    {
      name: 'Pending Orders',
      value: stats.pendingOrders,
      icon: Clock,
      color: '#63B3ED',
      bg: 'rgba(99, 179, 237, 0.1)'
    }
  ];

  const menuStats = [
    { name: 'Total Dishes', value: stats.itemsCount, icon: Utensils, color: 'var(--info)' },
    { name: 'Categories', value: stats.categoriesCount, icon: Layers, color: 'var(--warning)' },
  ];

  return (
    <div className="dash-home-wrapper animated">
      <div className="dash-header">
        <div>
          <h2>Welcome, {profile.restaurant_name}!</h2>
          <p>Here's what's happening at your restaurant today.</p>
        </div>
        {profile.slug ? (
          <a 
            href={`/menu/${profile.slug}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-primary"
          >
            <QrCode size={16} />
            <span>View Customer Menu</span>
          </a>
        ) : (
          <Link to="/dashboard/settings" className="btn btn-secondary">
            <span>Configure Slug in Settings</span>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      ) : (
        <>
          {/* Primary Stats — Orders, Revenue, Rating, Pending */}
          <div className="stats-grid stats-grid-4">
            {primaryStats.map((card, idx) => {
              const Icon = card.icon;
              const isRevenueCard = card.name === "Today's Revenue";
              return (
                <div 
                  key={idx} 
                  className={`glass stat-card ${isRevenueCard ? 'revenue-stat-card' : ''}`}
                  onMouseEnter={() => isRevenueCard && setShowRevenueTooltip(true)}
                  onMouseLeave={() => isRevenueCard && setShowRevenueTooltip(false)}
                  style={{ position: 'relative' }}
                >
                  <div className="stat-content">
                    <span className="stat-label">{card.name}</span>
                    <span className="stat-value" style={{ color: card.color }}>
                      {card.value}
                    </span>
                    {card.sub && <span className="stat-sub">{card.sub}</span>}
                  </div>
                  <div className="stat-icon-wrapper" style={{ backgroundColor: card.bg, color: card.color }}>
                    <Icon size={22} />
                  </div>

                  {isRevenueCard && showRevenueTooltip && (
                    <div className="glass revenue-popover animated fadeIn">
                      <div className="popover-header">
                        <h4>Today's Revenue</h4>
                        <span className="popover-total">{currency}{Math.round(totalCalculated).toLocaleString()}</span>
                      </div>
                      
                      {/* Segmented bar graph */}
                      <div className="popover-bar-container">
                        <div className="popover-bar-label">Payment Methods</div>
                        <div className="segmented-bar">
                          {upiRevenue > 0 && <div className="bar-segment bar-upi" style={{ width: `${(upiRevenue/totalCalculated)*100}%` }} />}
                          {cashRevenue > 0 && <div className="bar-segment bar-cash" style={{ width: `${(cashRevenue/totalCalculated)*100}%` }} />}
                          {cardRevenue > 0 && <div className="bar-segment bar-card" style={{ width: `${(cardRevenue/totalCalculated)*100}%` }} />}
                          {unpaidRevenue > 0 && <div className="bar-segment bar-unpaid" style={{ width: `${(unpaidRevenue/totalCalculated)*100}%` }} />}
                        </div>
                        <div className="bar-legend">
                          <div className="legend-item"><span className="legend-dot upi" /> UPI: <span>{currency}{Math.round(upiRevenue)}</span></div>
                          <div className="legend-item"><span className="legend-dot cash" /> Cash: <span>{currency}{Math.round(cashRevenue)}</span></div>
                          <div className="legend-item"><span className="legend-dot card" /> Card: <span>{currency}{Math.round(cardRevenue)}</span></div>
                          <div className="legend-item"><span className="legend-dot unpaid" /> Unpaid: <span>{currency}{Math.round(unpaidRevenue)}</span></div>
                        </div>
                      </div>

                      {/* Hourly chunks */}
                      <div className="popover-sections">
                        <div className="popover-bar-label">Meal-Time Performance</div>
                        <div className="hourly-bars">
                          <div className="hourly-row">
                            <span className="hour-label">Lunch (11-4)</span>
                            <div className="hour-progress-bg">
                              <div className="hour-progress-fill" style={{ width: `${totalCalculated > 0 ? (lunchRevenue/totalCalculated)*100 : 0}%` }} />
                            </div>
                            <span className="hour-val">{currency}{Math.round(lunchRevenue)}</span>
                          </div>
                          <div className="hourly-row">
                            <span className="hour-label">Dinner (6-11)</span>
                            <div className="hour-progress-bg">
                              <div className="hour-progress-fill" style={{ width: `${totalCalculated > 0 ? (dinnerRevenue/totalCalculated)*100 : 0}%` }} />
                            </div>
                            <span className="hour-val">{currency}{Math.round(dinnerRevenue)}</span>
                          </div>
                          <div className="hourly-row">
                            <span className="hour-label">Other Hours</span>
                            <div className="hour-progress-bg">
                              <div className="hour-progress-fill" style={{ width: `${totalCalculated > 0 ? (otherRevenue/totalCalculated)*100 : 0}%` }} />
                            </div>
                            <span className="hour-val">{currency}{Math.round(otherRevenue)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="dashboard-grid">
            {/* Quick Actions + Menu Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                  <Link to="/dashboard/orders" className="action-btn">
                    <ShoppingBag size={20} className="action-icon" style={{ color: '#FF5E00' }} />
                    <div>
                      <h5>Live Kitchen</h5>
                      <span>View and manage active orders</span>
                    </div>
                    <ArrowRight size={16} className="arrow" />
                  </Link>
                </div>
              </div>

              {/* Dish / Category counts */}
              <div className="stats-grid stats-grid-2">
                {menuStats.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div key={idx} className="glass stat-card">
                      <div className="stat-content">
                        <span className="stat-label">{card.name}</span>
                        <span className="stat-value">{card.value}</span>
                      </div>
                      <div className="stat-icon-wrapper" style={{ backgroundColor: card.color + '20', color: card.color }}>
                        <Icon size={22} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer Feedback Panel */}
            <div className="glass feedback-panel">
              <div className="feedback-panel-header">
                <h3>Customer Feedback</h3>
                {stats.avgRating !== null && (
                  <span className="avg-badge">
                    <Star size={12} fill="#FFB300" color="#FFB300" />
                    {stats.avgRating}
                  </span>
                )}
              </div>

              {stats.avgRating !== null ? (
                <>
                  {/* Average rating display */}
                  <div className="avg-rating-display">
                    <span className="avg-rating-number">{stats.avgRating}</span>
                    <div className="avg-rating-meta">
                      <StarDisplay rating={Math.round(stats.avgRating)} size={18} />
                      <span className="avg-rating-count">
                        Based on {stats.totalRatings} customer{stats.totalRatings !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Recent feedback comments */}
                  {recentFeedback.length > 0 ? (
                    <div className="feedback-list">
                      <p className="feedback-section-label">Recent Comments</p>
                      {recentFeedback.map((item, idx) => (
                        <div key={idx} className="feedback-item">
                          <div className="feedback-item-header">
                            <StarDisplay rating={item.rating} size={12} />
                            <span className="feedback-meta">
                              {item.table_number ? `Table ${item.table_number} · ` : ''}
                              {timeAgo(item.created_at)}
                            </span>
                          </div>
                          {item.feedback && (
                            <p className="feedback-text">"{item.feedback}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-feedback-state">
                      <MessageSquare size={28} style={{ opacity: 0.3 }} />
                      <p>No written feedback yet.<br />Customers who rate 1–3 stars leave comments here.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-feedback-state">
                  <Star size={32} style={{ opacity: 0.2 }} />
                  <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-dark-primary)' }}>No ratings yet</p>
                  <p>Customer ratings will appear here once they place orders and rate their experience.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .dash-home-wrapper {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .dash-header h2 {
          font-size: 26px;
          margin-bottom: 4px;
        }
        .dash-header p {
          color: var(--text-dark-secondary);
          font-size: 14px;
        }

        /* Stats Grids */
        .stats-grid {
          display: grid;
          gap: 16px;
        }
        .stats-grid-4 {
          grid-template-columns: repeat(4, 1fr);
        }
        .stats-grid-2 {
          grid-template-columns: repeat(2, 1fr);
        }

        @media (max-width: 1100px) {
          .stats-grid-4 {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .stats-grid-4, .stats-grid-2 {
            grid-template-columns: 1fr 1fr;
          }
        }

        .stat-card {
          padding: 20px;
          border-radius: var(--radius-lg);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 11px;
          color: var(--text-dark-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .stat-value {
          font-family: var(--font-brand);
          font-size: 28px;
          font-weight: 800;
          color: var(--text-dark-primary);
          line-height: 1.1;
        }

        .stat-sub {
          font-size: 11px;
          color: var(--text-dark-muted);
          margin-top: 2px;
        }

        .stat-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Dashboard Grid */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 992px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        .action-card-container {
          padding: 24px;
          border-radius: var(--radius-lg);
        }

        .action-card-container h3 {
          font-size: 16px;
          margin-bottom: 16px;
        }

        .actions-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
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
          width: 38px;
          height: 38px;
          padding: 9px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
        }

        .text-primary { color: var(--primary); }
        .text-warning { color: var(--warning); }
        .text-success { color: var(--success); }

        .action-btn div { flex-grow: 1; }
        .action-btn h5 {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-dark-primary);
          margin-bottom: 2px;
        }
        .action-btn span {
          font-size: 11px;
          color: var(--text-dark-muted);
        }
        .action-btn .arrow {
          color: var(--text-dark-muted);
          transition: var(--transition-fast);
          flex-shrink: 0;
        }

        /* Feedback Panel */
        .feedback-panel {
          padding: 24px;
          border-radius: var(--radius-lg);
        }

        .feedback-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .feedback-panel-header h3 {
          font-size: 16px;
          margin: 0;
        }

        .avg-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 700;
          color: #FFB300;
          background: rgba(255, 179, 0, 0.1);
          border: 1px solid rgba(255, 179, 0, 0.2);
          padding: 4px 10px;
          border-radius: 20px;
        }

        .avg-rating-display {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(255, 179, 0, 0.05);
          border: 1px solid rgba(255, 179, 0, 0.12);
          border-radius: var(--radius-md);
          margin-bottom: 18px;
        }

        .avg-rating-number {
          font-size: 44px;
          font-weight: 900;
          color: #FFB300;
          line-height: 1;
          font-family: var(--font-brand);
        }

        .avg-rating-meta {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .avg-rating-count {
          font-size: 11px;
          color: var(--text-dark-muted);
        }

        .feedback-section-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-dark-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
        }

        .feedback-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .feedback-item {
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .feedback-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .feedback-meta {
          font-size: 10px;
          color: var(--text-dark-muted);
        }

        .feedback-text {
          font-size: 12px;
          color: var(--text-dark-secondary);
          line-height: 1.5;
          font-style: italic;
        }

        .no-feedback-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 160px;
          color: var(--text-dark-muted);
          font-size: 12px;
          gap: 10px;
          text-align: center;
          line-height: 1.5;
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

        /* ─── Revenue Popover ─── */
        .revenue-stat-card {
          cursor: pointer;
          position: relative;
        }
        .revenue-stat-card:hover {
          z-index: 100 !important;
        }

        .revenue-popover {
          position: absolute;
          top: calc(100% + 12px);
          left: 0;
          width: 320px;
          padding: 18px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-dark);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          background: rgba(13, 17, 24, 0.96) !important;
          backdrop-filter: blur(20px);
          z-index: 50;
          text-align: left;
        }

        @media (max-width: 768px) {
          .revenue-popover {
            width: 280px;
            left: auto;
            right: 0;
          }
        }

        .popover-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 8px;
        }

        .popover-header h4 {
          font-size: 13px;
          font-weight: 700;
          margin: 0;
          color: var(--text-dark-primary);
        }

        .popover-total {
          font-size: 14px;
          font-weight: 800;
          font-family: var(--font-brand);
          color: var(--success);
        }

        .popover-bar-container {
          margin-bottom: 16px;
        }

        .popover-bar-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-dark-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        .segmented-bar {
          display: flex;
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          margin-bottom: 12px;
        }

        .bar-segment {
          height: 100%;
          transition: width 0.3s ease;
        }
        .bar-upi { background: #10B981; }
        .bar-cash { background: #3B82F6; }
        .bar-card { background: #8B5CF6; }
        .bar-unpaid { background: #EF4444; }

        .bar-legend {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-dark-secondary);
        }

        .legend-item span {
          font-weight: 600;
          color: var(--text-dark-primary);
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        .legend-dot.upi { background: #10B981; }
        .legend-dot.cash { background: #3B82F6; }
        .legend-dot.card { background: #8B5CF6; }
        .legend-dot.unpaid { background: #EF4444; }

        .hourly-bars {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hourly-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
        }

        .hour-label {
          width: 85px;
          color: var(--text-dark-muted);
          white-space: nowrap;
        }

        .hour-progress-bg {
          flex-grow: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
          overflow: hidden;
        }

        .hour-progress-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .hour-val {
          width: 45px;
          text-align: right;
          font-weight: 600;
          color: var(--text-dark-primary);
        }
      `}</style>
    </div>
  );
}
