import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../utils/api';
import {
  Clock,
  Check,
  X,
  Play,
  Inbox,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  RefreshCw,
  Flame,
  ShoppingBag,
  IndianRupee,
  Zap,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

// ─── Sound Engine ────────────────────────────────────────────────────────────
function playNewOrderAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 — pleasant major chord arp
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.01 + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3 + i * 0.12);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + 0.5 + i * 0.12);
    });
  } catch {
    // Blocked by browser autoplay policy — silent fail
  }
}

// ─── Elapsed Timer ───────────────────────────────────────────────────────────
function useElapsedSeconds(createdAt) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
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

// ─── Single Order Card ────────────────────────────────────────────────────────
function OrderCard({ order, currency, onAccept, onComplete, onCancel, isNew }) {
  const elapsed = useElapsedSeconds(order.created_at);
  const isUrgent = elapsed > 10 * 60; // >10 mins = urgent
  const isWarning = elapsed > 5 * 60 && !isUrgent; // 5–10 mins = warning

  const urgencyClass = isUrgent ? 'card-urgent' : isWarning ? 'card-warning' : '';
  const newClass = isNew ? 'card-new-flash' : '';

  return (
    <div className={`kds-order-card glass ${urgencyClass} ${newClass}`}>
      {/* Card Top */}
      <div className="kdc-top">
        <div className="kds-table-badge">
          <span>TABLE</span>
          <span className="kds-table-num">{order.table_number}</span>
        </div>
        <div className="kds-elapsed-badge" data-urgent={isUrgent} data-warning={isWarning}>
          <Clock size={12} />
          <span>{formatElapsed(elapsed)}</span>
        </div>
      </div>

      {/* Items List */}
      <div className="kds-items-list">
        {order.items.map((item, idx) => (
          <div key={idx} className="kds-item-row">
            <span className="kds-qty">{item.quantity}×</span>
            <span className="kds-iname">{item.name}</span>
            <span className="kds-iprice">{currency}{item.price * item.quantity}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="kds-total-row">
        <span>Total</span>
        <span className="kds-total-val">{currency}{order.total_price}</span>
      </div>

      {/* Actions */}
      {order.status === 'Pending' && (
        <div className="kds-actions two-col">
          <button className="kds-btn kds-btn-cancel" onClick={() => onCancel(order.id)}>
            <X size={14} /> Cancel
          </button>
          <button className="kds-btn kds-btn-accept" onClick={() => onAccept(order.id)}>
            <Play size={14} /> Accept
          </button>
        </div>
      )}
      {order.status === 'Preparing' && (
        <div className="kds-actions one-col">
          <button className="kds-btn kds-btn-complete" onClick={() => onComplete(order.id)}>
            <Check size={14} /> Mark Food Ready
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LiveDashboard() {
  const [orders, setOrders] = useState([]);
  const [newOrderIds, setNewOrderIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [pulse, setPulse] = useState(false);
  const [expandedDoneId, setExpandedDoneId] = useState(null);
  const knownIdsRef = useRef(new Set());
  const wrapperRef = useRef(null);
  const profile = JSON.parse(localStorage.getItem('profile') || '{}');
  const currency = profile.currency || '₹';

  const fetchOrders = useCallback(async (isInitial = false) => {
    try {
      const data = await api.get('/orders');
      const incoming = Array.isArray(data) ? data : [];

      if (!isInitial) {
        // Find truly new pending orders not seen before
        const freshNewIds = incoming
          .filter(o => o.status === 'Pending' && !knownIdsRef.current.has(o.id))
          .map(o => o.id);

        if (freshNewIds.length > 0) {
          if (soundEnabled) playNewOrderAlert();
          setNewOrderIds(prev => new Set([...prev, ...freshNewIds]));
          // Remove "new" flash after 4 seconds
          setTimeout(() => {
            setNewOrderIds(prev => {
              const next = new Set(prev);
              freshNewIds.forEach(id => next.delete(id));
              return next;
            });
          }, 4000);
        }
      }

      // Record all currently known IDs
      incoming.forEach(o => knownIdsRef.current.add(o.id));

      setOrders(incoming);
      setLastRefresh(new Date());
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
      if (isInitial) setError('');
    } catch (err) {
      if (isInitial) setError('Failed to load orders: ' + err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [soundEnabled]);

  useEffect(() => {
    fetchOrders(true);
    const interval = setInterval(() => fetchOrders(false), 3000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Fullscreen API
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const updateStatus = async (orderId, status) => {
    try {
      const updated = await api.put(`/orders/${orderId}/status`, { status });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: updated.status } : o));
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
  };

  // Stats
  const pendingOrders = orders.filter(o => o.status === 'Pending');
  const preparingOrders = orders.filter(o => o.status === 'Preparing');
  const isToday = (iso) => {
    const d = new Date(iso);
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };
  const completedOrders = orders.filter(o => o.status === 'Completed' && isToday(o.created_at));
  const todayOrders = orders.filter(o => isToday(o.created_at));
  const todayRevenue = todayOrders
    .filter(o => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.total_price || 0), 0);

  return (
    <div className="kds-wrapper animated" ref={wrapperRef}>

      {/* ─ Header ─ */}
      <div className="kds-header">
        <div className="kds-title-group">
          <div className="live-dot-container">
            <span className="live-dot" />
          </div>
          <div>
            <h2>Live Kitchen Display</h2>
            <p>Auto-refreshes every 3 seconds</p>
          </div>
        </div>

        <div className="kds-header-actions">
          {/* Last refresh indicator */}
          <div className={`refresh-indicator ${pulse ? 'pulsing' : ''}`}>
            <RefreshCw size={12} />
            <span>{lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          <button
            className={`kds-icon-btn ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled(v => !v)}
            title={soundEnabled ? 'Mute alerts' : 'Enable alerts'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button className="kds-icon-btn" onClick={toggleFullscreen} title="Toggle fullscreen">
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* ─ Live Stats Bar ─ */}
      <div className="kds-stats-bar">
        <div className="kds-stat">
          <div className="kds-stat-icon kds-stat-pending">
            <Zap size={18} />
          </div>
          <div>
            <span className="kds-stat-label">New Orders</span>
            <span className="kds-stat-val">{pendingOrders.length}</span>
          </div>
        </div>
        <div className="kds-stat">
          <div className="kds-stat-icon kds-stat-preparing">
            <Flame size={18} />
          </div>
          <div>
            <span className="kds-stat-label">In Kitchen</span>
            <span className="kds-stat-val">{preparingOrders.length}</span>
          </div>
        </div>
        <div className="kds-stat">
          <div className="kds-stat-icon kds-stat-orders">
            <ShoppingBag size={18} />
          </div>
          <div>
            <span className="kds-stat-label">Today's Orders</span>
            <span className="kds-stat-val">{todayOrders.length}</span>
          </div>
        </div>
        <div className="kds-stat">
          <div className="kds-stat-icon kds-stat-revenue">
            <IndianRupee size={18} />
          </div>
          <div>
            <span className="kds-stat-label">Today's Revenue</span>
            <span className="kds-stat-val">{currency}{todayRevenue.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="kds-error-bar">⚠ {error}</div>
      )}

      {loading ? (
        <div className="kds-loader-box">
          <div className="kds-spinner" />
          <p>Connecting to live feed...</p>
        </div>
      ) : (
        <div className="kds-board kds-board-3col">

          {/* ── Column: New Orders ── */}
          <div className="kds-column">
            <div className="kds-col-header kds-col-pending">
              <span className="kds-col-dot dot-pending" />
              <h3>New Orders</h3>
              <span className="kds-col-count">{pendingOrders.length}</span>
            </div>
            <div className="kds-cards-list">
              {pendingOrders.length === 0 ? (
                <div className="kds-empty-col glass">
                  <Inbox size={32} />
                  <p>Waiting for orders...</p>
                  <span>New customer orders will appear here instantly</span>
                </div>
              ) : (
                pendingOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    currency={currency}
                    isNew={newOrderIds.has(order.id)}
                    onAccept={(id) => updateStatus(id, 'Preparing')}
                    onCancel={(id) => updateStatus(id, 'Cancelled')}
                    onComplete={(id) => updateStatus(id, 'Completed')}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Column: In Kitchen ── */}
          <div className="kds-column">
            <div className="kds-col-header kds-col-preparing">
              <span className="kds-col-dot dot-preparing" />
              <h3>In Kitchen</h3>
              <span className="kds-col-count">{preparingOrders.length}</span>
            </div>
            <div className="kds-cards-list">
              {preparingOrders.length === 0 ? (
                <div className="kds-empty-col glass">
                  <Flame size={32} />
                  <p>Kitchen is idle</p>
                  <span>Accepted orders will be shown here</span>
                </div>
              ) : (
                preparingOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    currency={currency}
                    isNew={false}
                    onAccept={(id) => updateStatus(id, 'Preparing')}
                    onCancel={(id) => updateStatus(id, 'Cancelled')}
                    onComplete={(id) => updateStatus(id, 'Completed')}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Column: Completed Today ── */}
          <div className="kds-column">
            <div className="kds-col-header kds-col-completed">
              <span className="kds-col-dot dot-completed" />
              <h3>Completed Today</h3>
              <span className="kds-col-count kds-col-count-done">{completedOrders.length}</span>
            </div>
            <div className="kds-cards-list">
              {completedOrders.length === 0 ? (
                <div className="kds-empty-col glass">
                  <CheckCircle2 size={32} />
                  <p>No completed orders yet</p>
                  <span>Orders marked as Food Ready will appear here</span>
                </div>
              ) : (
                completedOrders.map(order => {
                  const isExpanded = expandedDoneId === order.id;
                  return (
                    <div
                      key={order.id}
                      className={`kds-order-card kds-done-card glass ${isExpanded ? 'done-card-open' : ''}`}
                      onClick={() => setExpandedDoneId(isExpanded ? null : order.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Card top row */}
                      <div className="kdc-top">
                        <div className="kds-table-badge">
                          <span>TABLE</span>
                          <span className="kds-table-num">{order.table_number}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="kds-done-badge">
                            <CheckCircle2 size={13} />
                            <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <button
                            className={`done-expand-btn ${isExpanded ? 'done-expanded' : ''}`}
                            onClick={e => { e.stopPropagation(); setExpandedDoneId(isExpanded ? null : order.id); }}
                            title={isExpanded ? 'Collapse' : 'View full order'}
                          >
                            <ChevronDown size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Collapsed summary — items in one line */}
                      {!isExpanded && (
                        <div className="done-collapsed-summary">
                          {order.items.map(i => `${i.quantity}× ${i.name}`).join(' · ')}
                        </div>
                      )}

                      {/* Expanded detail breakdown */}
                      {isExpanded && (
                        <div className="done-detail-body">
                          <div className="done-detail-head">
                            <span>Item</span>
                            <span>Qty</span>
                            <span>Unit</span>
                            <span>Subtotal</span>
                          </div>
                          {order.items.map((item, idx) => (
                            <div key={idx} className="done-detail-row">
                              <span className="ddr-name">{item.name}</span>
                              <span className="ddr-qty">{item.quantity}</span>
                              <span className="ddr-unit">{currency}{item.price}</span>
                              <span className="ddr-sub">{currency}{item.price * item.quantity}</span>
                            </div>
                          ))}
                          <div className="done-detail-total">
                            <span>Grand Total</span>
                            <span className="done-total-val">{currency}{order.total_price}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      <style>{`
        /* ─── KDS Wrapper ─── */
        .kds-wrapper {
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-height: 100vh;
          background: var(--bg-dark);
        }
        .kds-wrapper:fullscreen,
        .kds-wrapper:-webkit-full-screen {
          padding: 24px 32px;
          overflow-y: auto;
          background: var(--bg-dark);
        }

        /* ─── Header ─── */
        .kds-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-dark);
        }
        .kds-title-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .kds-title-group h2 {
          font-size: 26px;
          margin-bottom: 2px;
        }
        .kds-title-group p {
          font-size: 13px;
          color: var(--text-dark-muted);
        }

        /* Live dot */
        .live-dot-container {
          position: relative;
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }
        .live-dot {
          display: block;
          width: 14px;
          height: 14px;
          background: var(--success);
          border-radius: 50%;
          position: absolute;
          animation: live-pulse 1.8s ease-in-out infinite;
        }
        @keyframes live-pulse {
          0%, 100% { box-shadow: 0 0 0 0 hsla(142, 72%, 40%, 0.6); }
          50% { box-shadow: 0 0 0 8px hsla(142, 72%, 40%, 0); }
        }

        /* Header Actions */
        .kds-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .refresh-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-dark-muted);
          padding: 6px 12px;
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-full);
          background: rgba(255,255,255,0.02);
          transition: all 0.3s;
          font-family: 'Courier New', monospace;
        }
        .refresh-indicator.pulsing {
          color: var(--success);
          border-color: hsla(142, 72%, 40%, 0.4);
          background: hsla(142, 72%, 40%, 0.08);
        }

        .kds-icon-btn {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-dark);
          background: rgba(255,255,255,0.03);
          color: var(--text-dark-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .kds-icon-btn:hover {
          background: rgba(255,255,255,0.08);
          color: var(--text-dark-primary);
          border-color: rgba(255,255,255,0.15);
        }
        .kds-icon-btn.active {
          background: hsla(142, 72%, 40%, 0.12);
          color: var(--success);
          border-color: hsla(142, 72%, 40%, 0.3);
        }

        /* ─── Stats Bar ─── */
        .kds-stats-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .kds-stat {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--bg-card-dark-trans);
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-lg);
          padding: 18px 20px;
          backdrop-filter: blur(10px);
        }

        .kds-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .kds-stat-pending { background: hsla(var(--primary-hue), 95%, 52%, 0.15); color: var(--primary); }
        .kds-stat-preparing { background: hsla(38, 92%, 50%, 0.15); color: var(--warning); }
        .kds-stat-orders { background: hsla(200, 85%, 48%, 0.15); color: var(--info); }
        .kds-stat-revenue { background: hsla(142, 72%, 40%, 0.15); color: var(--success); }

        .kds-stat-label {
          display: block;
          font-size: 11px;
          color: var(--text-dark-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
        }
        .kds-stat-val {
          display: block;
          font-family: var(--font-brand);
          font-size: 24px;
          font-weight: 800;
          color: var(--text-dark-primary);
          line-height: 1;
        }

        /* ─── Board ─── */
        .kds-board {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        .kds-board-3col {
          grid-template-columns: 1fr 1fr 1fr;
        }

        .kds-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .kds-col-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: var(--radius-md);
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-dark);
        }
        .kds-col-header h3 {
          font-size: 15px;
          flex-grow: 1;
        }
        .kds-col-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .dot-pending { background: var(--primary); box-shadow: 0 0 8px var(--primary-glow); }
        .dot-preparing { background: var(--warning); box-shadow: 0 0 8px hsla(38, 92%, 50%, 0.4); }
        .dot-completed { background: var(--success); box-shadow: 0 0 8px hsla(142, 72%, 40%, 0.4); }

        .kds-col-count {
          font-size: 12px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          background: var(--border-dark);
          color: var(--text-dark-secondary);
        }
        .kds-col-pending .kds-col-count { background: var(--primary-glow); color: var(--primary); }
        .kds-col-preparing .kds-col-count { background: hsla(38, 92%, 50%, 0.15); color: var(--warning); }
        .kds-col-count-done { background: hsla(142, 72%, 40%, 0.15) !important; color: var(--success) !important; }

        /* Completed column done badge */
        .kds-done-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          background: hsla(142, 72%, 40%, 0.12);
          color: var(--success);
          border: 1px solid hsla(142, 72%, 40%, 0.25);
        }
        .kds-done-card {
          opacity: 0.78;
          border-left: 4px solid var(--success) !important;
          transition: opacity 0.2s, transform 0.2s;
        }
        .kds-done-card:hover { opacity: 1; }
        .kds-done-card.done-card-open { opacity: 1; }
        .done-total { color: var(--success) !important; }

        /* Expand button on done card */
        .done-expand-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid hsla(142, 72%, 40%, 0.3);
          background: hsla(142, 72%, 40%, 0.08);
          color: var(--success);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .done-expand-btn:hover {
          background: hsla(142, 72%, 40%, 0.2);
          border-color: var(--success);
          transform: scale(1.1);
        }
        .done-expand-btn.done-expanded {
          background: hsla(142, 72%, 40%, 0.2);
          border-color: var(--success);
          transform: rotate(180deg);
        }

        /* Collapsed one-liner summary */
        .done-collapsed-summary {
          font-size: 13px;
          color: var(--text-dark-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 2px 0;
        }

        /* Expanded detail panel inside done card */
        .done-detail-body {
          display: flex;
          flex-direction: column;
          gap: 0;
          animation: kds-done-slide 0.2s ease-out forwards;
        }
        @keyframes kds-done-slide {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .done-detail-head {
          display: grid;
          grid-template-columns: 1fr 40px 70px 80px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-dark-muted);
          padding-bottom: 6px;
          border-bottom: 1px solid var(--border-dark);
          margin-bottom: 4px;
        }
        .done-detail-row {
          display: grid;
          grid-template-columns: 1fr 40px 70px 80px;
          font-size: 13px;
          padding: 5px 0;
          border-bottom: 1px dashed rgba(255,255,255,0.04);
        }
        .done-detail-row:last-child { border-bottom: none; }
        .ddr-name { color: var(--text-dark-secondary); }
        .ddr-qty  { color: var(--primary); font-weight: 800; font-family: var(--font-brand); }
        .ddr-unit { color: var(--text-dark-muted); font-size: 12px; }
        .ddr-sub  { color: var(--text-dark-primary); font-weight: 600; }
        .done-detail-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          padding-top: 10px;
          border-top: 2px solid var(--border-dark);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-dark-secondary);
        }
        .done-total-val {
          font-family: var(--font-brand);
          font-size: 17px;
          font-weight: 800;
          color: var(--success);
        }

        /* ─── Empty Column ─── */
        .kds-empty-col {
          padding: 48px 24px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
          color: var(--text-dark-muted);
        }
        .kds-empty-col p {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-dark-secondary);
        }
        .kds-empty-col span {
          font-size: 13px;
        }

        .kds-cards-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* ─── Order Card ─── */
        .kds-order-card {
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-left: 4px solid transparent;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .kds-order-card:hover {
          border-color: rgba(255,255,255,0.1);
          transform: translateY(-1px);
        }
        .kds-order-card.card-urgent {
          border-left-color: var(--danger) !important;
          background: hsla(352, 82%, 52%, 0.05) !important;
        }
        .kds-order-card.card-warning {
          border-left-color: var(--warning);
          background: hsla(38, 92%, 50%, 0.04);
        }

        /* New order flash animation */
        .kds-order-card.card-new-flash {
          animation: new-order-flash 4s ease-out forwards;
        }
        @keyframes new-order-flash {
          0% {
            background: hsla(142, 72%, 40%, 0.25);
            border-color: var(--success);
            box-shadow: 0 0 0 2px hsla(142, 72%, 40%, 0.4), 0 8px 30px hsla(142, 72%, 40%, 0.2);
            transform: scale(1.02);
          }
          15% {
            background: hsla(142, 72%, 40%, 0.15);
          }
          100% {
            background: var(--bg-card-dark-trans);
            border-color: transparent;
            box-shadow: none;
            transform: scale(1);
          }
        }

        /* Card Top Row */
        .kdc-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-dark);
          padding-bottom: 10px;
        }
        .kds-table-badge {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }
        .kds-table-badge span:first-child {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-dark-muted);
        }
        .kds-table-num {
          font-family: var(--font-brand);
          font-size: 22px;
          font-weight: 800;
          color: var(--text-dark-primary);
        }

        .kds-elapsed-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: var(--radius-full);
          background: rgba(255,255,255,0.05);
          color: var(--text-dark-secondary);
          font-family: 'Courier New', monospace;
          border: 1px solid var(--border-dark);
        }
        .kds-elapsed-badge[data-urgent="true"] {
          background: hsla(352, 82%, 52%, 0.15);
          color: var(--danger);
          border-color: hsla(352, 82%, 52%, 0.3);
          animation: urgent-blink 0.8s ease-in-out infinite;
        }
        .kds-elapsed-badge[data-warning="true"] {
          background: hsla(38, 92%, 50%, 0.12);
          color: var(--warning);
          border-color: hsla(38, 92%, 50%, 0.3);
        }
        @keyframes urgent-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* Items */
        .kds-items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .kds-item-row {
          display: flex;
          align-items: center;
          font-size: 14px;
        }
        .kds-qty {
          width: 36px;
          font-weight: 800;
          color: var(--primary);
          font-family: var(--font-brand);
        }
        .kds-iname {
          flex-grow: 1;
          color: var(--text-dark-secondary);
        }
        .kds-iprice {
          font-size: 13px;
          color: var(--text-dark-muted);
        }

        /* Total */
        .kds-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px dashed var(--border-dark);
          padding-top: 10px;
          font-size: 13px;
          color: var(--text-dark-secondary);
        }
        .kds-total-val {
          font-family: var(--font-brand);
          font-size: 18px;
          font-weight: 800;
          color: var(--text-dark-primary);
        }

        /* Actions */
        .kds-actions {
          display: grid;
          gap: 10px;
        }
        .kds-actions.two-col { grid-template-columns: 1fr 1fr; }
        .kds-actions.one-col { grid-template-columns: 1fr; }

        .kds-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          font-family: var(--font-brand);
          border-radius: var(--radius-md);
          border: 1px solid transparent;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .kds-btn-accept {
          background: var(--gradient-brand);
          color: white;
          box-shadow: 0 4px 12px var(--primary-glow);
        }
        .kds-btn-accept:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px var(--primary-glow);
        }
        .kds-btn-cancel {
          background: rgba(255,70,70,0.06);
          color: var(--danger);
          border-color: rgba(255,70,70,0.15);
        }
        .kds-btn-cancel:hover {
          background: rgba(255,70,70,0.15);
          border-color: var(--danger);
        }
        .kds-btn-complete {
          background: hsla(142, 72%, 40%, 0.15);
          color: var(--success);
          border-color: hsla(142, 72%, 40%, 0.3);
        }
        .kds-btn-complete:hover {
          background: hsla(142, 72%, 40%, 0.25);
          border-color: var(--success);
          transform: translateY(-1px);
        }

        /* ─── Error Bar ─── */
        .kds-error-bar {
          padding: 12px 20px;
          background: hsla(352, 82%, 52%, 0.1);
          border: 1px solid hsla(352, 82%, 52%, 0.25);
          border-radius: var(--radius-md);
          font-size: 13px;
          color: var(--danger);
        }

        /* ─── Loader ─── */
        .kds-loader-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          height: 300px;
          color: var(--text-dark-muted);
        }
        .kds-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.06);
          border-top: 3px solid var(--primary);
          border-radius: 50%;
          animation: kds-spin 0.7s linear infinite;
        }
        @keyframes kds-spin {
          to { transform: rotate(360deg); }
        }

        /* ─── Responsive ─── */
        @media (max-width: 1200px) {
          .kds-board-3col {
            grid-template-columns: 1fr 1fr;
          }
          .kds-stats-bar {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 768px) {
          .kds-board, .kds-board-3col {
            grid-template-columns: 1fr;
          }
          .kds-stats-bar {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .kds-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .kds-header-actions {
            width: 100%;
            justify-content: flex-end;
          }
          .kds-stat-val { font-size: 20px; }
        }
        @media (max-width: 480px) {
          .kds-stats-bar { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
