import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../utils/api';
import {
  Users,
  RefreshCw,
  Receipt,
  ClipboardList,
  CheckCircle2,
  X,
  IndianRupee,
  Clock,
  ShoppingBag,
  Utensils,
  CreditCard,
  Banknote,
  Smartphone,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  Check,
  Wifi,
  WifiOff
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isToday = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
};

function useElapsedSeconds(createdAt) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!createdAt) return;
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      setSeconds(diff > 0 ? diff : 0);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [createdAt]);
  return seconds;
}

function formatElapsed(s) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Group order items by batch
function groupByBatch(items, orderCreatedAt) {
  const map = {};
  (items || []).forEach(item => {
    const b = item.batch || 1;
    if (!map[b]) map[b] = { batchNum: b, orderedAt: item.ordered_at || orderCreatedAt, items: [] };
    map[b].items.push(item);
  });
  return Object.values(map).sort((a, b) => a.batchNum - b.batchNum);
}

// ─── Table Card Component ─────────────────────────────────────────────────────
function TableCard({ tableNum, order, currency, onBill, onOrderInfo }) {
  const isOccupied = !!order;
  const elapsed = useElapsedSeconds(order?.created_at);
  const isUrgent = isOccupied && elapsed > 10 * 60;
  const isWarning = isOccupied && elapsed > 5 * 60 && !isUrgent;

  const statusColor = !isOccupied
    ? 'available'
    : order.payment_status === 'Paid'
    ? 'paid'
    : isUrgent
    ? 'urgent'
    : isWarning
    ? 'warning'
    : 'occupied';

  const itemCount = (order?.items || []).reduce((s, i) => s + (i.quantity || 1), 0);

  return (
    <div className={`table-card table-card-${statusColor}`} id={`table-${tableNum}`}>
      {/* Pulse indicator for occupied tables */}
      {isOccupied && order.payment_status !== 'Paid' && (
        <span className={`table-pulse-dot pulse-${statusColor}`} />
      )}

      {/* Table Number Badge */}
      <div className="table-card-header">
        <div className="table-num-badge">
          <Utensils size={12} />
          <span>T-{tableNum}</span>
        </div>
        <div className={`table-status-pill pill-${statusColor}`}>
          {!isOccupied && 'Available'}
          {isOccupied && order.payment_status === 'Paid' && '✔ Billed'}
          {isOccupied && order.payment_status !== 'Paid' && order.status === 'Pending' && 'Pending'}
          {isOccupied && order.payment_status !== 'Paid' && order.status === 'Preparing' && 'Preparing'}
          {isOccupied && order.payment_status !== 'Paid' && order.status === 'Completed' && 'Food Ready'}
        </div>
      </div>

      {/* Table number large display */}
      <div className="table-number-display">
        <span className="table-big-num">{tableNum}</span>
      </div>

      {/* Occupied Info */}
      {isOccupied ? (
        <div className="table-order-info">
          <div className="table-meta-row">
            <div className="table-meta-item">
              <ShoppingBag size={11} />
              <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="table-meta-item">
              <Clock size={11} />
              <span>{formatElapsed(elapsed)}</span>
            </div>
          </div>
          <div className="table-total-display">
            <span className="table-total-label">Total</span>
            <span className="table-total-val">{currency}{Number(order.total_price || 0).toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <div className="table-empty-state">
          <span className="table-free-label">Free</span>
        </div>
      )}

      {/* Action Buttons — always visible but disabled when free */}
      <div className="table-actions">
        <button
          className={`tbl-btn tbl-btn-info ${!isOccupied ? 'tbl-btn-disabled' : ''}`}
          disabled={!isOccupied}
          onClick={() => isOccupied && onOrderInfo(order)}
          title="View Order Details"
          id={`order-info-${tableNum}`}
        >
          <ClipboardList size={13} />
          <span>Order Info</span>
        </button>
        <button
          className={`tbl-btn tbl-btn-bill ${!isOccupied || order.payment_status === 'Paid' ? 'tbl-btn-disabled' : ''}`}
          disabled={!isOccupied || order.payment_status === 'Paid'}
          onClick={() => isOccupied && order.payment_status !== 'Paid' && onBill(order)}
          title="Generate Bill"
          id={`bill-${tableNum}`}
        >
          <Receipt size={13} />
          <span>{order?.payment_status === 'Paid' ? 'Settled' : 'Bill'}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Order Info Modal ──────────────────────────────────────────────────────────
function OrderInfoModal({ order, currency, onClose }) {
  if (!order) return null;
  const batches = groupByBatch(order.items, order.created_at);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel glass" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <ClipboardList size={20} className="modal-icon" />
            <div>
              <h3>Order Details — Table {order.table_number}</h3>
              <p className="modal-subtitle">
                {formatTime(order.created_at)} · {order.status} · {order.payment_status}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {batches.map(batch => (
            <div key={batch.batchNum} className="modal-batch">
              <div className="modal-batch-header">
                <span className="modal-batch-label">Order #{batch.batchNum}</span>
                <span className="modal-batch-time">{formatTime(batch.orderedAt)}</span>
              </div>
              {batch.items.map((item, idx) => (
                <div key={idx} className="modal-item-row">
                  <span className="modal-item-qty">{item.quantity}×</span>
                  <span className="modal-item-name">{item.name}</span>
                  <span className="modal-item-price">{currency}{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          ))}

          <div className="modal-total-row">
            <span>Grand Total</span>
            <span className="modal-total-val">{currency}{Number(order.total_price).toLocaleString()}</span>
          </div>

          {order.payment_status === 'Paid' && (
            <div className="modal-paid-badge">
              <CheckCircle2 size={15} />
              <span>Paid via {order.payment_method}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Bill Modal ────────────────────────────────────────────────────────────────
function BillModal({ order, currency, onClose, onPaymentDone }) {
  const [settling, setSettling] = useState(false);
  const [settled, setSettled] = useState(false);
  if (!order) return null;

  const batches = groupByBatch(order.items, order.created_at);
  const total = Number(order.total_price || 0);

  const handlePay = async (method) => {
    setSettling(true);
    try {
      await api.put(`/orders/${order.id}/payment`, { paymentStatus: 'Paid', paymentMethod: method });
      setSettled(true);
      setTimeout(() => {
        onPaymentDone();
        onClose();
      }, 1200);
    } catch (err) {
      alert('Payment failed: ' + err.message);
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={!settling ? onClose : undefined}>
      <div className="modal-panel glass bill-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Receipt size={20} className="modal-icon bill-icon" />
            <div>
              <h3>Bill — Table {order.table_number}</h3>
              <p className="modal-subtitle">Settle customer payment below</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} disabled={settling}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {/* Bill Line Items */}
          <div className="bill-items-section">
            {batches.map(batch => (
              <div key={batch.batchNum} className="modal-batch">
                <div className="modal-batch-header">
                  <span className="modal-batch-label">Order #{batch.batchNum}</span>
                  <span className="modal-batch-time">{formatTime(batch.orderedAt)}</span>
                </div>
                {batch.items.map((item, idx) => (
                  <div key={idx} className="modal-item-row">
                    <span className="modal-item-qty">{item.quantity}×</span>
                    <span className="modal-item-name">{item.name}</span>
                    <span className="modal-item-price">{currency}{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Grand Total */}
          <div className="bill-total-box">
            <div className="bill-total-label">Grand Total</div>
            <div className="bill-total-amount">{currency}{total.toLocaleString()}</div>
          </div>

          {/* Success State */}
          {settled ? (
            <div className="bill-settled-animation">
              <CheckCircle2 size={40} className="settled-check" />
              <p>Payment Settled!</p>
            </div>
          ) : (
            <>
              <p className="bill-pay-prompt">Select payment method:</p>
              <div className="bill-pay-methods">
                <button
                  className="bill-pay-btn bill-pay-cash"
                  onClick={() => handlePay('Cash')}
                  disabled={settling}
                  id="pay-cash"
                >
                  <Banknote size={20} />
                  <span>Cash</span>
                </button>
                <button
                  className="bill-pay-btn bill-pay-upi"
                  onClick={() => handlePay('UPI')}
                  disabled={settling}
                  id="pay-upi"
                >
                  <Smartphone size={20} />
                  <span>UPI</span>
                </button>
                <button
                  className="bill-pay-btn bill-pay-card"
                  onClick={() => handlePay('Card')}
                  disabled={settling}
                  id="pay-card"
                >
                  <CreditCard size={20} />
                  <span>Card</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main TableView Component ─────────────────────────────────────────────────
export default function TableView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [pulse, setPulse] = useState(false);
  const [online, setOnline] = useState(true);

  const [billOrder, setBillOrder] = useState(null);
  const [infoOrder, setInfoOrder] = useState(null);

  const profile = JSON.parse(localStorage.getItem('profile') || '{}');
  const currency = profile.currency || '₹';

  // Parse tables from profile settings
  const tablesList = (profile.tables_list || '1,2,3,4,5,6,7,8,9,10,11,12')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  const fetchOrders = useCallback(async (isInitial = false) => {
    try {
      const data = await api.get('/orders');
      setOrders(Array.isArray(data) ? data : []);
      setLastRefresh(new Date());
      setPulse(true);
      setOnline(true);
      setTimeout(() => setPulse(false), 600);
      if (isInitial) setError('');
    } catch (err) {
      setOnline(false);
      if (isInitial) setError('Failed to load orders: ' + err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(true);
    const interval = setInterval(() => fetchOrders(false), 4000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Build a map of table → active order
  const tableOrderMap = {};
  orders.forEach(o => {
    if (isToday(o.created_at) && o.status !== 'Cancelled') {
      const tKey = String(o.table_number).trim();
      // If multiple orders for same table, prefer the most recent unpaid one
      if (!tableOrderMap[tKey] || (o.payment_status === 'Unpaid' && tableOrderMap[tKey].payment_status !== 'Unpaid')) {
        tableOrderMap[tKey] = o;
      }
    }
  });

  const occupiedCount = Object.values(tableOrderMap).filter(o => o.payment_status === 'Unpaid').length;
  const freeCount = tablesList.length - occupiedCount;
  const billedCount = Object.values(tableOrderMap).filter(o => o.payment_status === 'Paid').length;

  const handlePaymentDone = () => {
    fetchOrders(false);
  };

  return (
    <div className="tv-wrapper animated">
      {/* Header */}
      <div className="tv-header">
        <div className="tv-title-group">
          <div className="tv-live-dot-wrap">
            <span className={`tv-live-dot ${online ? 'dot-green' : 'dot-red'}`} />
          </div>
          <div>
            <h2>Table View</h2>
            <p>Real-time restaurant floor map</p>
          </div>
        </div>
        <div className="tv-header-right">
          <div className={`tv-refresh-badge ${pulse ? 'pulsing' : ''}`}>
            <RefreshCw size={11} />
            <span>{lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
          {!online && (
            <div className="tv-offline-badge">
              <WifiOff size={13} />
              <span>Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="tv-stats-row">
        <div className="tv-stat tv-stat-total">
          <div className="tv-stat-icon"><Utensils size={16} /></div>
          <div>
            <span className="tv-stat-label">Total Tables</span>
            <span className="tv-stat-val">{tablesList.length}</span>
          </div>
        </div>
        <div className="tv-stat tv-stat-occupied">
          <div className="tv-stat-icon"><Users size={16} /></div>
          <div>
            <span className="tv-stat-label">Occupied</span>
            <span className="tv-stat-val">{occupiedCount}</span>
          </div>
        </div>
        <div className="tv-stat tv-stat-free">
          <div className="tv-stat-icon"><CheckCircle2 size={16} /></div>
          <div>
            <span className="tv-stat-label">Available</span>
            <span className="tv-stat-val">{freeCount}</span>
          </div>
        </div>
        <div className="tv-stat tv-stat-billed">
          <div className="tv-stat-icon"><Receipt size={16} /></div>
          <div>
            <span className="tv-stat-label">Billed Today</span>
            <span className="tv-stat-val">{billedCount}</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="tv-legend">
        <div className="tv-legend-item"><span className="legend-dot dot-available" /> Available</div>
        <div className="tv-legend-item"><span className="legend-dot dot-occupied-leg" /> Occupied</div>
        <div className="tv-legend-item"><span className="legend-dot dot-warning-leg" /> &gt;5min</div>
        <div className="tv-legend-item"><span className="legend-dot dot-urgent-leg" /> &gt;10min</div>
        <div className="tv-legend-item"><span className="legend-dot dot-paid-leg" /> Billed</div>
      </div>

      {error && (
        <div className="tv-error-bar">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Table Grid */}
      {loading ? (
        <div className="tv-loader">
          <div className="tv-spinner" />
          <p>Loading floor map...</p>
        </div>
      ) : (
        <div className="tv-table-grid">
          {tablesList.map(tableNum => (
            <TableCard
              key={tableNum}
              tableNum={tableNum}
              order={tableOrderMap[tableNum] || null}
              currency={currency}
              onBill={(order) => setBillOrder(order)}
              onOrderInfo={(order) => setInfoOrder(order)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {infoOrder && (
        <OrderInfoModal
          order={infoOrder}
          currency={currency}
          onClose={() => setInfoOrder(null)}
        />
      )}
      {billOrder && (
        <BillModal
          order={billOrder}
          currency={currency}
          onClose={() => setBillOrder(null)}
          onPaymentDone={handlePaymentDone}
        />
      )}

      <style>{`
        /* ─── Wrapper ─── */
        .tv-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-height: 80vh;
        }

        /* ─── Header ─── */
        .tv-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--border-dark);
          flex-wrap: wrap;
          gap: 12px;
        }
        .tv-title-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .tv-title-group h2 {
          font-size: 24px;
          margin-bottom: 2px;
        }
        .tv-title-group p {
          font-size: 13px;
          color: var(--text-dark-muted);
        }
        .tv-live-dot-wrap {
          position: relative;
          width: 12px;
          height: 12px;
          flex-shrink: 0;
        }
        .tv-live-dot {
          display: block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          position: absolute;
        }
        .dot-green {
          background: var(--success);
          animation: tv-live-pulse 1.8s ease-in-out infinite;
        }
        .dot-red {
          background: var(--danger);
        }
        @keyframes tv-live-pulse {
          0%, 100% { box-shadow: 0 0 0 0 hsla(142, 72%, 40%, 0.6); }
          50% { box-shadow: 0 0 0 7px hsla(142, 72%, 40%, 0); }
        }
        .tv-header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .tv-refresh-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-dark-muted);
          padding: 5px 10px;
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-full);
          background: rgba(255,255,255,0.02);
          transition: all 0.3s;
          font-family: monospace;
        }
        .tv-refresh-badge.pulsing {
          color: var(--success);
          border-color: hsla(142, 72%, 40%, 0.4);
          background: hsla(142, 72%, 40%, 0.08);
        }
        .tv-offline-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--danger);
          padding: 5px 10px;
          border: 1px solid hsla(352, 82%, 52%, 0.3);
          border-radius: var(--radius-full);
          background: hsla(352, 82%, 52%, 0.08);
        }

        /* ─── Stats Row ─── */
        .tv-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        @media (max-width: 900px) {
          .tv-stats-row { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 500px) {
          .tv-stats-row { grid-template-columns: 1fr 1fr; }
        }

        .tv-stat {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-radius: var(--radius-lg);
          background: var(--bg-card-dark-trans);
          border: 1px solid var(--border-dark);
          backdrop-filter: blur(10px);
        }
        .tv-stat-icon {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tv-stat-total .tv-stat-icon { background: hsla(var(--primary-hue), 95%, 52%, 0.12); color: var(--primary); }
        .tv-stat-occupied .tv-stat-icon { background: hsla(38, 92%, 50%, 0.12); color: var(--warning); }
        .tv-stat-free .tv-stat-icon { background: hsla(142, 72%, 40%, 0.12); color: var(--success); }
        .tv-stat-billed .tv-stat-icon { background: hsla(200, 85%, 48%, 0.12); color: var(--info); }

        .tv-stat-label {
          display: block;
          font-size: 10px;
          color: var(--text-dark-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1px;
        }
        .tv-stat-val {
          display: block;
          font-family: var(--font-brand);
          font-size: 22px;
          font-weight: 800;
          color: var(--text-dark-primary);
          line-height: 1;
        }

        /* ─── Legend ─── */
        .tv-legend {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }
        .tv-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-dark-muted);
          font-weight: 500;
        }
        .legend-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .dot-available { background: hsl(222, 12%, 30%); }
        .dot-occupied-leg { background: hsl(38, 92%, 50%); }
        .dot-warning-leg { background: hsl(30, 90%, 52%); }
        .dot-urgent-leg { background: hsl(352, 82%, 52%); }
        .dot-paid-leg { background: hsl(142, 72%, 40%); }

        /* ─── Error Bar ─── */
        .tv-error-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: hsla(352, 82%, 52%, 0.1);
          border: 1px solid hsla(352, 82%, 52%, 0.25);
          border-radius: var(--radius-md);
          color: var(--danger);
          font-size: 13px;
        }

        /* ─── Table Grid ─── */
        .tv-table-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }

        /* ─── Table Card ─── */
        .table-card {
          position: relative;
          border-radius: var(--radius-lg);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border: 1.5px solid;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          overflow: hidden;
          cursor: default;
        }

        .table-card-available {
          background: rgba(255,255,255,0.02);
          border-color: var(--border-dark);
        }
        .table-card-available:hover {
          background: rgba(255,255,255,0.04);
          border-color: hsl(222, 12%, 28%);
        }

        .table-card-occupied {
          background: hsla(38, 92%, 50%, 0.06);
          border-color: hsla(38, 92%, 50%, 0.35);
          box-shadow: 0 0 20px hsla(38, 92%, 50%, 0.08), inset 0 0 40px hsla(38, 92%, 50%, 0.03);
        }
        .table-card-warning {
          background: hsla(30, 90%, 52%, 0.07);
          border-color: hsla(30, 90%, 52%, 0.4);
          box-shadow: 0 0 20px hsla(30, 90%, 52%, 0.1), inset 0 0 40px hsla(30, 90%, 52%, 0.03);
        }
        .table-card-urgent {
          background: hsla(352, 82%, 52%, 0.08);
          border-color: hsla(352, 82%, 52%, 0.5);
          box-shadow: 0 0 24px hsla(352, 82%, 52%, 0.15), inset 0 0 40px hsla(352, 82%, 52%, 0.04);
          animation: urgent-glow 2s ease-in-out infinite;
        }
        @keyframes urgent-glow {
          0%, 100% { box-shadow: 0 0 16px hsla(352, 82%, 52%, 0.12); }
          50% { box-shadow: 0 0 30px hsla(352, 82%, 52%, 0.25); }
        }
        .table-card-paid {
          background: hsla(142, 72%, 40%, 0.05);
          border-color: hsla(142, 72%, 40%, 0.25);
        }

        /* Pulse dot */
        .table-pulse-dot {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: tv-live-pulse 1.8s ease-in-out infinite;
        }
        .pulse-occupied { background: hsl(38, 92%, 50%); }
        .pulse-warning { background: hsl(30, 90%, 52%); }
        .pulse-urgent { background: hsl(352, 82%, 52%); animation: urgent-pulse-dot 1s ease-in-out infinite; }
        @keyframes urgent-pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 hsla(352, 82%, 52%, 0.7); }
          50% { box-shadow: 0 0 0 5px hsla(352, 82%, 52%, 0); }
        }

        /* Card Header */
        .table-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .table-num-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          color: var(--text-dark-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .table-status-pill {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 3px 8px;
          border-radius: var(--radius-full);
        }
        .pill-available { background: rgba(255,255,255,0.05); color: var(--text-dark-muted); }
        .pill-occupied { background: hsla(38, 92%, 50%, 0.15); color: hsl(38, 92%, 60%); }
        .pill-warning { background: hsla(30, 90%, 52%, 0.15); color: hsl(30, 90%, 62%); }
        .pill-urgent { background: hsla(352, 82%, 52%, 0.18); color: hsl(352, 82%, 72%); }
        .pill-paid { background: hsla(142, 72%, 40%, 0.15); color: var(--success); }

        /* Big Number */
        .table-number-display {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px 0;
        }
        .table-big-num {
          font-family: var(--font-brand);
          font-size: 38px;
          font-weight: 900;
          color: var(--text-dark-primary);
          line-height: 1;
          letter-spacing: -0.02em;
          opacity: 0.9;
        }
        .table-card-available .table-big-num {
          opacity: 0.25;
        }

        /* Order Info inside card */
        .table-order-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .table-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }
        .table-meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-dark-muted);
        }
        .table-total-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          background: rgba(255,255,255,0.04);
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .table-total-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-dark-muted);
          text-transform: uppercase;
        }
        .table-total-val {
          font-family: var(--font-brand);
          font-size: 14px;
          font-weight: 800;
          color: var(--text-dark-primary);
        }

        /* Empty/Free state */
        .table-empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 40px;
        }
        .table-free-label {
          font-size: 11px;
          color: var(--text-dark-muted);
          opacity: 0.5;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* Action Buttons */
        .table-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-top: 2px;
        }
        .tbl-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 7px 10px;
          border-radius: var(--radius-sm);
          border: 1px solid;
          font-size: 11px;
          font-weight: 700;
          font-family: var(--font-brand);
          cursor: pointer;
          transition: all 0.18s ease;
          letter-spacing: 0.02em;
        }
        .tbl-btn-info {
          background: hsla(200, 85%, 48%, 0.1);
          border-color: hsla(200, 85%, 48%, 0.3);
          color: var(--info);
        }
        .tbl-btn-info:hover:not(:disabled) {
          background: hsla(200, 85%, 48%, 0.18);
          border-color: hsla(200, 85%, 48%, 0.5);
          transform: translateY(-1px);
        }
        .tbl-btn-bill {
          background: hsla(var(--primary-hue), 95%, 52%, 0.12);
          border-color: hsla(var(--primary-hue), 95%, 52%, 0.35);
          color: var(--primary);
        }
        .tbl-btn-bill:hover:not(:disabled) {
          background: hsla(var(--primary-hue), 95%, 52%, 0.22);
          border-color: var(--primary);
          transform: translateY(-1px);
        }
        .tbl-btn-disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }
        .tbl-btn-disabled:hover {
          transform: none !important;
        }

        /* ─── Loader ─── */
        .tv-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          min-height: 300px;
          color: var(--text-dark-muted);
          font-size: 13px;
        }
        .tv-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.05);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ─── Modal Overlay ─── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
          animation: fadeIn 0.2s ease;
        }
        .modal-panel {
          width: 100%;
          max-width: 480px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(0,0,0,0.5);
          animation: slideUp 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Modal Header */
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-dark);
          gap: 12px;
        }
        .modal-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .modal-icon {
          color: var(--info);
          flex-shrink: 0;
        }
        .bill-icon { color: var(--primary); }
        .modal-title-group h3 {
          font-size: 16px;
          margin-bottom: 2px;
        }
        .modal-subtitle {
          font-size: 11px;
          color: var(--text-dark-muted);
        }
        .modal-close-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-dark);
          background: rgba(255,255,255,0.04);
          color: var(--text-dark-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-fast);
          flex-shrink: 0;
        }
        .modal-close-btn:hover {
          background: rgba(255,255,255,0.08);
          color: var(--text-dark-primary);
        }

        /* Modal Body */
        .modal-body {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 60vh;
          overflow-y: auto;
        }

        /* Batch sections */
        .modal-batch {
          display: flex;
          flex-direction: column;
          gap: 6px;
          border-left: 2px solid rgba(255,255,255,0.07);
          padding-left: 12px;
        }
        .modal-batch-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }
        .modal-batch-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--primary);
        }
        .modal-batch-time {
          font-size: 10px;
          color: var(--text-dark-muted);
          font-family: monospace;
        }
        .modal-item-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          padding: 4px 0;
        }
        .modal-item-qty {
          font-weight: 700;
          color: var(--text-dark-muted);
          min-width: 26px;
          font-size: 12px;
        }
        .modal-item-name {
          flex: 1;
          color: var(--text-dark-primary);
        }
        .modal-item-price {
          font-weight: 700;
          color: var(--text-dark-secondary);
          font-family: var(--font-brand);
          font-size: 13px;
        }

        /* Total row */
        .modal-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-dark-secondary);
          margin-top: 4px;
        }
        .modal-total-val {
          font-family: var(--font-brand);
          font-size: 20px;
          font-weight: 900;
          color: var(--text-dark-primary);
        }

        /* Paid badge in info modal */
        .modal-paid-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: hsla(142, 72%, 40%, 0.1);
          border: 1px solid hsla(142, 72%, 40%, 0.25);
          border-radius: var(--radius-md);
          color: var(--success);
          font-size: 13px;
          font-weight: 600;
        }

        /* Modal Footer */
        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border-dark);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        /* ─── Bill Modal Specifics ─── */
        .bill-items-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .bill-total-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          background: hsla(var(--primary-hue), 95%, 52%, 0.08);
          border: 1.5px solid hsla(var(--primary-hue), 95%, 52%, 0.25);
          border-radius: var(--radius-lg);
          gap: 4px;
          margin-top: 4px;
        }
        .bill-total-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-dark-muted);
        }
        .bill-total-amount {
          font-family: var(--font-brand);
          font-size: 36px;
          font-weight: 900;
          color: var(--primary);
          line-height: 1;
        }

        .bill-pay-prompt {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-dark-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          text-align: center;
          margin-top: 4px;
        }
        .bill-pay-methods {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .bill-pay-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 10px;
          border-radius: var(--radius-md);
          border: 1.5px solid;
          font-size: 13px;
          font-weight: 700;
          font-family: var(--font-brand);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .bill-pay-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .bill-pay-cash {
          background: hsla(142, 72%, 40%, 0.08);
          border-color: hsla(142, 72%, 40%, 0.3);
          color: var(--success);
        }
        .bill-pay-cash:hover:not(:disabled) {
          background: hsla(142, 72%, 40%, 0.18);
          border-color: var(--success);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px hsla(142, 72%, 40%, 0.15);
        }
        .bill-pay-upi {
          background: hsla(38, 92%, 50%, 0.08);
          border-color: hsla(38, 92%, 50%, 0.3);
          color: var(--warning);
        }
        .bill-pay-upi:hover:not(:disabled) {
          background: hsla(38, 92%, 50%, 0.18);
          border-color: var(--warning);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px hsla(38, 92%, 50%, 0.15);
        }
        .bill-pay-card {
          background: hsla(200, 85%, 48%, 0.08);
          border-color: hsla(200, 85%, 48%, 0.3);
          color: var(--info);
        }
        .bill-pay-card:hover:not(:disabled) {
          background: hsla(200, 85%, 48%, 0.18);
          border-color: var(--info);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px hsla(200, 85%, 48%, 0.15);
        }

        /* Settled animation */
        .bill-settled-animation {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }
        .settled-check {
          color: var(--success);
          animation: pop-in 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        @keyframes pop-in {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .bill-settled-animation p {
          font-size: 15px;
          font-weight: 700;
          color: var(--success);
          font-family: var(--font-brand);
        }

        /* Responsive */
        @media (max-width: 600px) {
          .tv-table-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 12px;
          }
          .table-big-num { font-size: 30px; }
          .bill-pay-methods { grid-template-columns: 1fr 1fr 1fr; }
          .modal-panel { max-width: 100%; margin: 0 0; }
        }
      `}</style>
    </div>
  );
}
