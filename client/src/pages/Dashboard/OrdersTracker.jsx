import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { 
  ShoppingBag, 
  Clock, 
  Check, 
  X, 
  Play, 
  AlertCircle,
  Inbox,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';

export default function OrdersTracker() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // active or history
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  
  const profile = JSON.parse(localStorage.getItem('profile') || '{}');

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();

    // Start 5-second polling interval for real-time order tracking
    const interval = setInterval(() => {
      fetchOrders(false); // fetch silently without loader
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    } catch {
      console.log('Audio chime blocked by browser autoplays.');
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      const updated = await api.put(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: updated.status } : o));
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const updatePayment = async (orderId, paymentStatus, paymentMethod) => {
    try {
      const updated = await api.put(`/orders/${orderId}/payment`, { paymentStatus, paymentMethod });
      setOrders(prev => prev.map(o => o.id === orderId ? { 
        ...o, 
        payment_status: updated.payment_status, 
        payment_method: updated.payment_method 
      } : o));
    } catch (err) {
      alert('Failed to update payment: ' + err.message);
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter orders
  const pendingOrders = orders.filter(o => o.status === 'Pending');
  const preparingOrders = orders.filter(o => o.status === 'Preparing');
  
  const activeOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Preparing');
  const pendingPaymentOrders = orders.filter(o => o.status === 'Completed' && o.payment_status !== 'Paid');
  const settledOrders = orders.filter(o => (o.status === 'Completed' && o.payment_status === 'Paid') || o.status === 'Cancelled');

  const isToday = (iso) => {
    const d = new Date(iso);
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };
  const todayOrders = orders.filter(o => isToday(o.created_at));
  const todayPaidOrders = todayOrders.filter(o => o.payment_status === 'Paid');
  const todayCash = todayPaidOrders.filter(o => o.payment_method === 'Cash').reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const todayUPI = todayPaidOrders.filter(o => o.payment_method === 'UPI').reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const todayCard = todayPaidOrders.filter(o => o.payment_method === 'Card').reduce((sum, o) => sum + Number(o.total_price || 0), 0);

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
            <span>Active Queue</span>
            <span className="count">{activeOrders.length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'pending_payment' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending_payment')}
          >
            <span>Payment Pending 💳</span>
            <span className="count">{pendingPaymentOrders.length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'settled' ? 'active' : ''}`}
            onClick={() => setActiveTab('settled')}
          >
            <span>Settled History 📜</span>
            <span className="count">{settledOrders.length}</span>
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
            /* Billing and History Tabs */
            <div className="orders-tracker-billing-container animated">
              {/* Payment Summary Box (End-of-Day) */}
              <div className="kds-payment-report glass">
                <div className="report-title">
                  <CheckCircle2 size={16} className="text-success" />
                  <span>Today's Payment Summary (End-of-Day Report)</span>
                </div>
                <div className="report-breakdown">
                  <div className="breakdown-item">
                    <span className="breakdown-label">UPI</span>
                    <span className="breakdown-val text-primary">{profile.currency || '₹'}{todayUPI.toLocaleString()}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Cash</span>
                    <span className="breakdown-val text-success">{profile.currency || '₹'}{todayCash.toLocaleString()}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Card</span>
                    <span className="breakdown-val text-warning">{profile.currency || '₹'}{todayCard.toLocaleString()}</span>
                  </div>
                  <div className="breakdown-item total">
                    <span className="breakdown-label">Total Settled</span>
                    <span className="breakdown-val">{profile.currency || '₹'}{(todayUPI + todayCash + todayCard).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="glass history-log animated" style={{ marginTop: '16px' }}>
                <h3>{activeTab === 'pending_payment' ? 'Payment Pending Queue' : 'Settled Order History'}</h3>
                {((activeTab === 'pending_payment' ? pendingPaymentOrders : settledOrders).length === 0) ? (
                  <div className="empty-state">
                    <ShoppingBag size={36} />
                    <p>No orders in this status.</p>
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
                          <th>Payment</th>
                          <th>Status</th>
                          <th style={{ width: '48px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeTab === 'pending_payment' ? pendingPaymentOrders : settledOrders).map((order) => {
                          const isExpanded = expandedOrderId === order.id;
                          return (
                            <>
                              <tr
                                key={order.id}
                                className={`history-row ${isExpanded ? 'row-expanded' : ''}`}
                                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                              >
                                <td>{new Date(order.created_at).toLocaleString()}</td>
                                <td>Table {order.table_number}</td>
                                <td className="dishes-cell">
                                  {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                                </td>
                                <td className="price-cell">{profile.currency || '₹'}{order.total_price}</td>
                                <td>
                                  {order.payment_status === 'Paid' ? (
                                    <span className={`payment-badge paid paid-${order.payment_method?.toLowerCase()}`}>
                                      {order.payment_method}
                                    </span>
                                  ) : (
                                    <span className="payment-badge unpaid">
                                      Unpaid
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className={`badge ${order.status === 'Completed' ? 'badge-success' : 'badge-danger'}`}>
                                    {order.status}
                                  </span>
                                </td>
                                <td className="expand-cell">
                                  <button
                                    className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setExpandedOrderId(isExpanded ? null : order.id); }}
                                    title={isExpanded ? 'Collapse' : 'View full order'}
                                  >
                                    <ChevronDown size={16} />
                                  </button>
                                </td>
                              </tr>

                              {isExpanded && (
                                <tr key={`${order.id}-detail`} className="detail-row animated">
                                  <td colSpan={7} className="detail-cell">
                                    <div className="order-detail-panel">
                                      <div className="detail-panel-header">
                                        <span>📋 Full Order — Table {order.table_number}</span>
                                        <span className="detail-time">{new Date(order.created_at).toLocaleString()}</span>
                                      </div>

                                      <div className="detail-items-list">
                                        <div className="detail-items-head">
                                          <span>Item</span>
                                          <span>Qty</span>
                                          <span>Unit Price</span>
                                          <span>Subtotal</span>
                                        </div>
                                        {order.items.map((item, idx) => (
                                          <div key={idx} className="detail-item-row">
                                            <span className="di-name">{item.name}</span>
                                            <span className="di-qty">{item.quantity}</span>
                                            <span className="di-unit">{profile.currency || '₹'}{item.price}</span>
                                            <span className="di-sub">{profile.currency || '₹'}{item.price * item.quantity}</span>
                                          </div>
                                        ))}
                                      </div>

                                      <div className="detail-total-row">
                                        <span>Grand Total</span>
                                        <span className="detail-total-val">{profile.currency || '₹'}{order.total_price}</span>
                                      </div>

                                      {/* Payment selector in details drawer */}
                                      <div className="card-payment-tracker" onClick={e => e.stopPropagation()} style={{ padding: '16px 20px' }}>
                                        {order.payment_status === 'Paid' ? (
                                          <div className="payment-settled-info">
                                            <span className="settled-text">✔ Paid via <strong>{order.payment_method}</strong></span>
                                            <button
                                              className="btn-pay-reset"
                                              onClick={() => updatePayment(order.id, 'Unpaid', null)}
                                            >
                                              Reset
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="payment-options-prompt">
                                            <span className="prompt-text">Settle Payment:</span>
                                            <div className="payment-option-buttons">
                                              <button
                                                className="btn-pay-method pay-cash"
                                                onClick={() => updatePayment(order.id, 'Paid', 'Cash')}
                                              >
                                                💵 Cash
                                              </button>
                                              <button
                                                className="btn-pay-method pay-upi"
                                                onClick={() => updatePayment(order.id, 'Paid', 'UPI')}
                                              >
                                                📱 UPI
                                              </button>
                                              <button
                                                className="btn-pay-method pay-card"
                                                onClick={() => updatePayment(order.id, 'Paid', 'Card')}
                                              >
                                                💳 Card
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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

        /* Expand button */
        .history-row {
          cursor: pointer;
          transition: background 0.15s;
        }
        .history-row:hover {
          background: rgba(255, 255, 255, 0.025);
        }
        .history-row.row-expanded {
          background: rgba(255, 255, 255, 0.03);
        }
        .expand-cell {
          text-align: center !important;
          padding: 12px 8px !important;
        }
        .expand-btn {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid var(--border-dark);
          background: rgba(255,255,255,0.03);
          color: var(--text-dark-muted);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .expand-btn:hover {
          background: rgba(255,255,255,0.08);
          color: var(--primary);
          border-color: var(--primary);
        }
        .expand-btn.expanded {
          background: var(--primary-glow);
          color: var(--primary);
          border-color: var(--primary);
          transform: rotate(180deg);
        }

        /* Expanded detail row */
        .detail-row td {
          padding: 0 !important;
          border-bottom: 2px solid var(--border-dark);
        }
        .detail-cell {
          padding: 0 !important;
        }
        .order-detail-panel {
          margin: 0 16px 16px;
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-md);
          background: rgba(255,255,255,0.02);
          overflow: hidden;
          animation: panel-slide-in 0.2s ease-out forwards;
        }
        @keyframes panel-slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .detail-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-dark);
          background: rgba(255,255,255,0.02);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-dark-secondary);
        }
        .detail-time {
          font-size: 12px;
          color: var(--text-dark-muted);
          font-weight: 400;
        }

        .detail-items-list {
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .detail-items-head {
          display: grid;
          grid-template-columns: 1fr 60px 90px 90px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-dark-muted);
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-dark);
          margin-bottom: 4px;
        }
        .detail-item-row {
          display: grid;
          grid-template-columns: 1fr 60px 90px 90px;
          font-size: 14px;
          padding: 6px 0;
          border-bottom: 1px dashed rgba(255,255,255,0.05);
        }
        .detail-item-row:last-child { border-bottom: none; }
        .di-name { color: var(--text-dark-secondary); }
        .di-qty  { color: var(--primary); font-weight: 700; font-family: var(--font-brand); }
        .di-unit { color: var(--text-dark-muted); font-size: 13px; }
        .di-sub  { color: var(--text-dark-primary); font-weight: 600; }

        .detail-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-top: 2px solid var(--border-dark);
          background: rgba(255,255,255,0.02);
          font-size: 13px;
          color: var(--text-dark-secondary);
          font-weight: 600;
        }
        .detail-total-val {
          font-family: var(--font-brand);
          font-size: 18px;
          font-weight: 800;
          color: var(--primary);
        }

        /* ─── End-of-Day Payment Report ─── */
        .kds-payment-report {
          padding: 16px 20px;
          border-radius: var(--radius-lg);
          background: var(--bg-card-dark-trans);
          border: 1px solid var(--border-dark);
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 8px;
        }
        .report-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-dark-secondary);
        }
        .report-breakdown {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .breakdown-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255,255,255,0.02);
          border-radius: var(--radius-md);
        }
        .breakdown-item.total {
          background: rgba(142, 252, 172, 0.03);
          border-color: rgba(142, 252, 172, 0.1);
        }
        .breakdown-label {
          font-size: 11px;
          color: var(--text-dark-muted);
          font-weight: 600;
        }
        .breakdown-val {
          font-family: var(--font-brand);
          font-size: 18px;
          font-weight: 800;
        }
        .breakdown-item.total .breakdown-val {
          color: var(--success);
        }
        @media (max-width: 768px) {
          .report-breakdown {
            grid-template-columns: 1fr 1fr;
          }
        }

        /* ─── Payment Badges ─── */
        .payment-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .payment-badge.paid {
          background: hsla(142, 72%, 40%, 0.15);
          color: var(--success);
          border: 1px solid hsla(142, 72%, 40%, 0.3);
        }
        .payment-badge.unpaid {
          background: rgba(255,255,255,0.05);
          color: var(--text-dark-muted);
          border: 1px solid var(--border-dark);
        }
        .payment-badge.paid-upi {
          background: hsla(200, 85%, 48%, 0.15);
          color: var(--info);
          border-color: hsla(200, 85%, 48%, 0.3);
        }
        .payment-badge.paid-cash {
          background: hsla(142, 72%, 40%, 0.15);
          color: var(--success);
          border-color: hsla(142, 72%, 40%, 0.3);
        }
        .payment-badge.paid-card {
          background: hsla(38, 92%, 50%, 0.15);
          color: var(--warning);
          border-color: hsla(38, 92%, 50%, 0.3);
        }

        /* ─── Expanded Payment Actions ─── */
        .card-payment-tracker {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-dark);
        }
        .payment-settled-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: var(--text-dark-secondary);
        }
        .settled-text strong {
          color: var(--text-dark-primary);
        }
        .btn-pay-reset {
          background: none;
          border: none;
          color: var(--danger);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          transition: background 0.2s;
        }
        .btn-pay-reset:hover {
          background: rgba(255, 70, 70, 0.1);
        }
        .payment-options-prompt {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .prompt-text {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-dark-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .payment-option-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .btn-pay-method {
          padding: 8px 12px;
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-md);
          background: rgba(255,255,255,0.03);
          color: var(--text-dark-secondary);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .btn-pay-method:hover {
          background: rgba(255,255,255,0.08);
          color: var(--text-dark-primary);
          border-color: rgba(255,255,255,0.15);
        }
        .btn-pay-method.pay-cash:hover {
          background: hsla(142, 72%, 40%, 0.15);
          color: var(--success);
          border-color: hsla(142, 72%, 40%, 0.3);
        }
        .btn-pay-method.pay-upi:hover {
          background: hsla(200, 85%, 48%, 0.15);
          color: var(--info);
          border-color: hsla(200, 85%, 48%, 0.3);
        }
        .btn-pay-method.pay-card:hover {
          background: hsla(38, 92%, 50%, 0.15);
          color: var(--warning);
          border-color: hsla(38, 92%, 50%, 0.3);
        }
      `}</style>
    </div>
  );
}
