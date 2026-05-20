import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { 
  ShoppingBag, 
  Clock, 
  Check, 
  X, 
  Play, 
  Bell, 
  AlertCircle,
  TrendingUp,
  Inbox
} from 'lucide-react';

export default function OrdersTracker() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // active or history
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const profile = JSON.parse(localStorage.getItem('profile') || '{}');

  useEffect(() => {
    fetchOrders();

    // Start 5-second polling interval for real-time order tracking
    const interval = setInterval(() => {
      fetchOrders(false); // fetch silently without loader
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async (showLoader = true) => {
    try {
      if (showLoader) setError('');
      const data = await api.get('/orders');
      
      // Compare old and new orders to play a chime sound on new pending orders
      setOrders(prevOrders => {
        const hasNewPending = data.some(newOrder => 
          newOrder.status === 'Pending' && 
          !prevOrders.some(oldOrder => oldOrder.id === newOrder.id && oldOrder.status === 'Pending')
        );

        if (hasNewPending && prevOrders.length > 0) {
          playNotificationSound();
        }
        return data;
      });
    } catch (err) {
      console.error(err);
      if (showLoader) setError('Failed to load orders: ' + err.message);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.log('Audio chime blocked by browser autoplays.');
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      const updated = await api.put(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: updated.status } : o));
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter orders
  const pendingOrders = orders.filter(o => o.status === 'Pending');
  const preparingOrders = orders.filter(o => o.status === 'Preparing');
  const historyOrders = orders.filter(o => o.status === 'Completed' || o.status === 'Cancelled');

  return (
    <div className="orders-tracker-wrapper animated">
      <div className="dash-header">
        <div>
          <h2>Order Operations</h2>
          <p>Manage incoming customer orders and track kitchen status.</p>
        </div>

        {/* Tab Selection */}
        <div className="tab-buttons-container">
          <button 
            className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <span>Active Orders</span>
            <span className="count">{pendingOrders.length + preparingOrders.length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span>History</span>
            <span className="count">{historyOrders.length}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      ) : (
        <>
          {activeTab === 'active' ? (
            /* Kanban Kitchen columns */
            <div className="orders-board">
              
              {/* Column 1: Pending (New) */}
              <div className="board-column">
                <div className="column-header">
                  <div className="column-title">
                    <span className="dot dot-pending"></span>
                    <h4>New Orders ({pendingOrders.length})</h4>
                  </div>
                </div>

                <div className="orders-cards-list">
                  {pendingOrders.length === 0 ? (
                    <div className="empty-column-state glass">
                      <Inbox size={24} />
                      <p>Waiting for new orders...</p>
                    </div>
                  ) : (
                    pendingOrders.map(order => (
                      <div key={order.id} className="glass order-tracker-card animated">
                        <div className="card-top-row">
                          <span className="card-table-num">TABLE {order.table_number}</span>
                          <span className="card-time"><Clock size={12} /> {formatTime(order.created_at)}</span>
                        </div>
                        
                        <div className="card-items-list">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="card-item-row">
                              <span className="item-qty">{item.quantity}x</span>
                              <span className="item-name">{item.name}</span>
                              <span className="item-sub">{profile.currency || '₹'}{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <div className="card-total-row">
                          <span>Total</span>
                          <span className="total-val">{profile.currency || '₹'}{order.total_price}</span>
                        </div>

                        <div className="card-actions-row">
                          <button 
                            className="btn btn-secondary btn-sm reject-btn"
                            onClick={() => updateStatus(order.id, 'Cancelled')}
                          >
                            <X size={14} />
                            <span>Cancel</span>
                          </button>
                          <button 
                            className="btn btn-primary btn-sm accept-btn"
                            onClick={() => updateStatus(order.id, 'Preparing')}
                          >
                            <Play size={14} />
                            <span>Accept Order</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Preparing (In Kitchen) */}
              <div className="board-column">
                <div className="column-header">
                  <div className="column-title">
                    <span className="dot dot-preparing"></span>
                    <h4>Preparing ({preparingOrders.length})</h4>
                  </div>
                </div>

                <div className="orders-cards-list">
                  {preparingOrders.length === 0 ? (
                    <div className="empty-column-state glass">
                      <Inbox size={24} />
                      <p>No orders in the kitchen.</p>
                    </div>
                  ) : (
                    preparingOrders.map(order => (
                      <div key={order.id} className="glass order-tracker-card border-preparing animated">
                        <div className="card-top-row">
                          <span className="card-table-num text-preparing">TABLE {order.table_number}</span>
                          <span className="card-time"><Clock size={12} /> {formatTime(order.created_at)}</span>
                        </div>

                        <div className="card-items-list">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="card-item-row">
                              <span className="item-qty">{item.quantity}x</span>
                              <span className="item-name">{item.name}</span>
                              <span className="item-sub">{profile.currency || '₹'}{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <div className="card-total-row">
                          <span>Total</span>
                          <span className="total-val">{profile.currency || '₹'}{order.total_price}</span>
                        </div>

                        <div className="card-actions-row single-action">
                          <button 
                            className="btn btn-primary btn-sm complete-btn"
                            onClick={() => updateStatus(order.id, 'Completed')}
                          >
                            <Check size={14} />
                            <span>Mark Food Ready</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : (
            /* History Tab list */
            <div className="glass history-log animated">
              <h3>Order History</h3>
              {historyOrders.length === 0 ? (
                <div className="empty-state">
                  <ShoppingBag size={36} />
                  <p>No historical orders recorded yet.</p>
                </div>
              ) : (
                <div className="history-table-wrapper">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Table</th>
                        <th>Dishes</th>
                        <th>Price</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyOrders.map((order) => (
                        <tr key={order.id}>
                          <td>{new Date(order.created_at).toLocaleString()}</td>
                          <td>Table {order.table_number}</td>
                          <td className="dishes-cell">
                            {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                          </td>
                          <td className="price-cell">{profile.currency || '₹'}{order.total_price}</td>
                          <td>
                            <span className={`badge ${order.status === 'Completed' ? 'badge-success' : 'badge-danger'}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        .orders-tracker-wrapper {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-dark);
          padding-bottom: 20px;
        }

        /* Tab Buttons */
        .tab-buttons-container {
          display: flex;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-md);
          padding: 4px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: none;
          color: var(--text-dark-secondary);
          font-family: var(--font-brand);
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .tab-btn.active {
          background: var(--bg-card-dark);
          color: var(--primary);
          box-shadow: var(--shadow-sm);
        }

        .tab-btn .count {
          font-size: 10px;
          background: var(--border-dark);
          color: var(--text-dark-secondary);
          padding: 2px 6px;
          border-radius: var(--radius-full);
        }
        .tab-btn.active .count {
          background: var(--primary-glow);
          color: var(--primary);
        }

        /* Kanban Board */
        .orders-board {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        @media (max-width: 992px) {
          .orders-board {
            grid-template-columns: 1fr;
          }
        }

        .board-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .column-header {
          padding: 6px 4px;
        }

        .column-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .column-title h4 {
          font-size: 16px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dot-pending { background-color: var(--primary); }
        .dot-preparing { background-color: var(--warning); }

        .orders-cards-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .empty-column-state {
          padding: 40px;
          text-align: center;
          color: var(--text-dark-muted);
          font-size: 13px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        /* Order Tracker Cards */
        .order-tracker-card {
          padding: 24px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: var(--transition-fast);
        }
        .order-tracker-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
        }
        .border-preparing {
          border-left: 4px solid var(--warning);
        }

        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-dark);
          padding-bottom: 10px;
        }
        .card-table-num {
          font-weight: 800;
          font-size: 16px;
          font-family: var(--font-brand);
        }
        .text-preparing {
          color: var(--warning);
        }
        .card-time {
          font-size: 11px;
          color: var(--text-dark-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .card-items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .card-item-row {
          display: flex;
          font-size: 14px;
        }
        .item-qty {
          width: 32px;
          font-weight: 700;
          color: var(--primary);
        }
        .item-name {
          flex-grow: 1;
          color: var(--text-dark-secondary);
        }
        .item-sub {
          color: var(--text-dark-muted);
          font-size: 13px;
        }

        .card-total-row {
          display: flex;
          justify-content: space-between;
          border-top: 1px dashed var(--border-dark);
          padding-top: 10px;
          font-size: 13px;
          color: var(--text-dark-secondary);
        }
        .total-val {
          font-weight: 800;
          font-size: 16px;
          color: var(--text-dark-primary);
        }

        .card-actions-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 4px;
        }
        .card-actions-row.single-action {
          grid-template-columns: 1fr;
        }

        .accept-btn, .complete-btn {
          box-shadow: none;
        }

        .reject-btn {
          background: rgba(255, 70, 70, 0.05);
          color: var(--danger);
          border-color: rgba(255, 70, 70, 0.15);
        }
        .reject-btn:hover {
          background: rgba(255, 70, 70, 0.12);
          border-color: var(--danger);
        }

        /* History log */
        .history-log {
          padding: 30px;
          border-radius: var(--radius-lg);
        }
        .history-log h3 {
          margin-bottom: 24px;
        }

        .history-table-wrapper {
          overflow-x: auto;
        }
        .history-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 14px;
        }
        .history-table th {
          padding: 12px 16px;
          border-bottom: 2px solid var(--border-dark);
          color: var(--text-dark-muted);
          font-weight: 600;
        }
        .history-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border-dark);
          color: var(--text-dark-secondary);
        }

        .dishes-cell {
          max-width: 300px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .price-cell {
          font-weight: 700;
          color: var(--primary);
        }
      `}</style>
    </div>
  );
}
