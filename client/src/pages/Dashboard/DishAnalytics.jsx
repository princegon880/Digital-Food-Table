import { useState, useEffect, useMemo } from 'react';
import { api } from '../../utils/api';
import {
  BarChart2,
  TrendingUp,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Utensils,
  Calendar,
  CalendarDays,
  CalendarRange,
  Infinity as InfinityIcon,
  Trophy,
  ShoppingCart,
} from 'lucide-react';


// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(symbol, value) {
  if (value >= 100000) return `${symbol}${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${symbol}${(value / 1000).toFixed(1)}k`;
  return `${symbol}${Math.round(value)}`;
}

function MedalIcon({ rank }) {
  if (rank === 1) return <span className="medal medal-gold">🥇</span>;
  if (rank === 2) return <span className="medal medal-silver">🥈</span>;
  if (rank === 3) return <span className="medal medal-bronze">🥉</span>;
  return <span className="rank-num">#{rank}</span>;
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 4;
  return (
    <div className="mini-bar-bg">
      <div className="mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DishAnalytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState('totalQty');
  const [sortDir, setSortDir] = useState('desc');
  const [period, setPeriod]   = useState('all'); // 'day' | 'month' | 'year' | 'all'
  const [showRevenueTooltip, setShowRevenueTooltip] = useState(false);

  const profile = JSON.parse(localStorage.getItem('profile') || '{}');
  const currency = profile.currency || '₹';

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await api.get('/orders/analytics');
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Column definitions ─────────────────────────────────────────────────────
  const columns = [
    { key: 'rank',        label: 'Rank',         sortable: false },
    { key: 'name',        label: 'Dish',          sortable: true  },
    { key: 'dailyQty',    label: 'Today',         sortable: true  },
    { key: 'monthlyQty',  label: 'This Month',    sortable: true  },
    { key: 'yearlyQty',   label: 'This Year',     sortable: true  },
    { key: 'totalQty',    label: 'All-Time',      sortable: true  },
    { key: 'totalRevenue',label: 'Revenue',       sortable: true  },
  ];

  // ── Derived sort key from period ───────────────────────────────────────────
  const periodSortKey = useMemo(() => {
    if (period === 'day')   return 'dailyQty';
    if (period === 'month') return 'monthlyQty';
    if (period === 'year')  return 'yearlyQty';
    return 'totalQty';
  }, [period]);

  // Auto-update sortKey when period changes (if user hasn't manually overridden)
  useEffect(() => {
    setSortKey(periodSortKey);
  }, [periodSortKey]);

  // ── Filtered + sorted dishes ───────────────────────────────────────────────
  const filteredDishes = useMemo(() => {
    if (!data?.dishes) return [];
    let list = data.dishes.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase())
    );
    list = [...list].sort((a, b) => {
      const av = typeof a[sortKey] === 'string' ? a[sortKey].localeCompare(b[sortKey]) : a[sortKey] - b[sortKey];
      if (typeof av === 'number') {
        return sortDir === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey];
      }
      return sortDir === 'desc'
        ? b[sortKey].toString().localeCompare(a[sortKey].toString())
        : a[sortKey].toString().localeCompare(b[sortKey].toString());
    });
    return list;
  }, [data, search, sortKey, sortDir]);

  // ── Max values for bar scaling ─────────────────────────────────────────────
  const maxDaily   = useMemo(() => Math.max(...(filteredDishes.map(d => d.dailyQty)),   1), [filteredDishes]);
  const maxMonthly = useMemo(() => Math.max(...(filteredDishes.map(d => d.monthlyQty)), 1), [filteredDishes]);
  const maxYearly  = useMemo(() => Math.max(...(filteredDishes.map(d => d.yearlyQty)),  1), [filteredDishes]);
  const maxTotal   = useMemo(() => Math.max(...(filteredDishes.map(d => d.totalQty)),   1), [filteredDishes]);

  // ── Top 3 (unfiltered, all-time) ──────────────────────────────────────────
  const top3 = useMemo(() => (data?.dishes || []).slice(0, 3), [data]);

  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // ── Period value helper ────────────────────────────────────────────────────
  const getPeriodQty = (dish) => {
    if (period === 'day')   return dish.dailyQty;
    if (period === 'month') return dish.monthlyQty;
    if (period === 'year')  return dish.yearlyQty;
    return dish.totalQty;
  };

  const SortIcon = ({ col }) => {
    if (!col.sortable) return null;
    if (sortKey !== col.key) return <ArrowUpDown size={12} style={{ opacity: 0.35 }} />;
    return sortDir === 'desc' ? <ArrowDown size={12} style={{ color: 'var(--primary)' }} /> : <ArrowUp size={12} style={{ color: 'var(--primary)' }} />;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="da-wrapper animated">

      {/* ── Page header ── */}
      <div className="da-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart2 size={24} style={{ color: 'var(--primary)' }} />
            Dish Analytics
          </h2>
          <p style={{ color: 'var(--text-dark-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Track which dishes your customers love most — by day, month, year, or all-time.
          </p>
        </div>
      </div>

      {loading && (
        <div className="da-loader">
          <div className="loader" />
          <p>Loading analytics…</p>
        </div>
      )}

      {error && !loading && (
        <div className="da-error glass">
          <p>⚠️ {error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* ── Summary Stat Cards ── */}
          <div className="da-stats-grid">
            <div className="glass da-stat-card">
              <div className="da-stat-icon" style={{ background: 'rgba(255,94,0,0.12)', color: 'var(--primary)' }}>
                <Utensils size={20} />
              </div>
              <div>
                <div className="da-stat-label">Unique Dishes</div>
                <div className="da-stat-value" style={{ color: 'var(--primary)' }}>{data.summary.uniqueDishes}</div>
              </div>
            </div>

            <div className="glass da-stat-card">
              <div className="da-stat-icon" style={{ background: 'rgba(99,179,237,0.12)', color: '#63B3ED' }}>
                <CalendarDays size={20} />
              </div>
              <div>
                <div className="da-stat-label">Sold Today</div>
                <div className="da-stat-value" style={{ color: '#63B3ED' }}>{data.summary.totalSoldToday}</div>
              </div>
            </div>

            <div className="glass da-stat-card">
              <div className="da-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success)' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div className="da-stat-label">Sold This Month</div>
                <div className="da-stat-value" style={{ color: 'var(--success)' }}>{data.summary.totalSoldMonth}</div>
              </div>
            </div>

            <div className="glass da-stat-card">
              <div className="da-stat-icon" style={{ background: 'rgba(255,179,0,0.12)', color: 'var(--warning)' }}>
                <CalendarRange size={20} />
              </div>
              <div>
                <div className="da-stat-label">Sold This Year</div>
                <div className="da-stat-value" style={{ color: 'var(--warning)' }}>{data.summary.totalSoldYear}</div>
              </div>
            </div>

            <div className="glass da-stat-card">
              <div className="da-stat-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA' }}>
                <InfinityIcon size={20} />
              </div>
              <div>
                <div className="da-stat-label">All-Time Sold</div>
                <div className="da-stat-value" style={{ color: '#A78BFA' }}>{data.summary.totalSoldAllTime}</div>
              </div>
            </div>

            <div 
              className="glass da-stat-card da-revenue-card"
              onMouseEnter={() => setShowRevenueTooltip(true)}
              onMouseLeave={() => setShowRevenueTooltip(false)}
              style={{ position: 'relative', cursor: 'pointer' }}
            >
              <div className="da-stat-icon" style={{ background: 'rgba(236,72,153,0.12)', color: '#F472B6' }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="da-stat-label">Total Revenue</div>
                <div className="da-stat-value" style={{ color: '#F472B6' }}>
                  {formatCurrency(currency, data.summary.totalRevenueAllTime)}
                </div>
              </div>

              {showRevenueTooltip && (
                <div className="glass da-revenue-popover animated fadeIn">
                  <div className="da-popover-header">
                    <h4>Revenue Breakdown</h4>
                    <span className="da-popover-total">{currency}{Math.round(data.summary.totalRevenueAllTime).toLocaleString()}</span>
                  </div>

                  <div className="da-popover-bars">
                    <div className="da-popover-bar-label">Revenue by Period</div>
                    <div className="da-period-row">
                      <span className="da-period-label">Today</span>
                      <div className="da-period-progress-bg">
                        <div className="da-period-progress-fill" style={{ width: `${data.summary.totalRevenueAllTime > 0 ? (data.summary.totalRevenueToday / data.summary.totalRevenueAllTime) * 100 : 0}%`, background: '#10B981' }} />
                      </div>
                      <span className="da-period-val">{currency}{Math.round(data.summary.totalRevenueToday || 0).toLocaleString()}</span>
                    </div>

                    <div className="da-period-row">
                      <span className="da-period-label">This Month</span>
                      <div className="da-period-progress-bg">
                        <div className="da-period-progress-fill" style={{ width: `${data.summary.totalRevenueAllTime > 0 ? (data.summary.totalRevenueMonth / data.summary.totalRevenueAllTime) * 100 : 0}%`, background: '#3B82F6' }} />
                      </div>
                      <span className="da-period-val">{currency}{Math.round(data.summary.totalRevenueMonth || 0).toLocaleString()}</span>
                    </div>

                    <div className="da-period-row">
                      <span className="da-period-label">This Year</span>
                      <div className="da-period-progress-bg">
                        <div className="da-period-progress-fill" style={{ width: `${data.summary.totalRevenueAllTime > 0 ? (data.summary.totalRevenueYear / data.summary.totalRevenueAllTime) * 100 : 0}%`, background: '#8B5CF6' }} />
                      </div>
                      <span className="da-period-val">{currency}{Math.round(data.summary.totalRevenueYear || 0).toLocaleString()}</span>
                    </div>

                    <div className="da-period-row">
                      <span className="da-period-label">All-Time</span>
                      <div className="da-period-progress-bg">
                        <div className="da-period-progress-fill" style={{ width: '100%', background: '#F472B6' }} />
                      </div>
                      <span className="da-period-val">{currency}{Math.round(data.summary.totalRevenueAllTime || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Top 3 Podium ── */}
          {top3.length > 0 && (
            <div className="glass da-podium-card">
              <div className="da-section-header">
                <Trophy size={18} style={{ color: '#FFB300' }} />
                <h3>Top Performing Dishes</h3>
                <span className="da-section-badge">All-Time</span>
              </div>
              <div className="da-podium">
                {top3.map((dish, idx) => {
                  const podiumColors = [
                    { text: '#FFD700', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.2)' },
                    { text: '#C0C0C0', bg: 'rgba(192,192,192,0.08)', border: 'rgba(192,192,192,0.2)' },
                    { text: '#CD7F32', bg: 'rgba(205,127,50,0.08)', border: 'rgba(205,127,50,0.2)' },
                  ];
                  const c = podiumColors[idx];
                  return (
                    <div
                      key={dish.name}
                      className="da-podium-item"
                      style={{ background: c.bg, border: `1px solid ${c.border}` }}
                    >
                      <div className="da-podium-rank">{['🥇', '🥈', '🥉'][idx]}</div>
                      <div className="da-podium-name" style={{ color: c.text }}>{dish.name}</div>
                      <div className="da-podium-qty">
                        <ShoppingCart size={12} />
                        <span>{dish.totalQty} sold</span>
                      </div>
                      <div className="da-podium-rev">
                        {formatCurrency(currency, dish.totalRevenue)}
                      </div>
                      <div className="da-podium-badges">
                        <span className="da-mini-badge" style={{ background: 'rgba(99,179,237,0.15)', color: '#63B3ED' }}>
                          Today: {dish.dailyQty}
                        </span>
                        <span className="da-mini-badge" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>
                          Month: {dish.monthlyQty}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Controls ── */}
          <div className="da-controls glass">
            {/* Period Toggle */}
            <div className="da-period-group">
              {[
                { key: 'day',   label: 'Today',      icon: <CalendarDays size={13} /> },
                { key: 'month', label: 'This Month',  icon: <Calendar size={13} /> },
                { key: 'year',  label: 'This Year',   icon: <CalendarRange size={13} /> },
                { key: 'all',   label: 'All-Time',    icon: <InfinityIcon size={13} /> },
              ].map(p => (
                <button
                  key={p.key}
                  className={`da-period-btn ${period === p.key ? 'active' : ''}`}
                  onClick={() => setPeriod(p.key)}
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="da-search-wrap">
              <Search size={14} className="da-search-icon" />
              <input
                id="dish-search-input"
                type="text"
                placeholder="Search dish…"
                className="da-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* ── Ranked Table ── */}
          {filteredDishes.length === 0 ? (
            <div className="glass da-empty">
              <Utensils size={36} style={{ opacity: 0.2 }} />
              <p>No dishes found{search ? ` for "${search}"` : ''}.</p>
              {!data.summary.uniqueDishes && <p style={{ fontSize: '12px', color: 'var(--text-dark-muted)' }}>Orders with items will appear here once placed.</p>}
            </div>
          ) : (
            <div className="glass da-table-wrapper">
              <div className="da-table-header">
                <h3>
                  Dish Rankings
                  <span className="da-count-badge">{filteredDishes.length}</span>
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dark-muted)' }}>
                  Sorted by{' '}
                  <strong style={{ color: 'var(--text-dark-secondary)' }}>
                    {columns.find(c => c.key === sortKey)?.label}
                  </strong>{' '}
                  ({sortDir === 'desc' ? 'highest first' : 'lowest first'})
                </p>
              </div>
              <div className="da-table-scroll">
                <table className="da-table">
                  <thead>
                    <tr>
                      {columns.map(col => (
                        <th
                          key={col.key}
                          className={col.sortable ? 'sortable' : ''}
                          onClick={() => col.sortable && handleSort(col.key)}
                          style={sortKey === col.key ? { color: 'var(--primary)' } : {}}
                        >
                          <span>{col.label}</span>
                          <SortIcon col={col} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDishes.map((dish, idx) => {
                      const globalRank = (data.dishes || []).findIndex(d => d.name.toLowerCase() === dish.name.toLowerCase()) + 1;
                      return (
                        <tr key={dish.name} className={idx % 2 === 0 ? 'row-even' : ''}>
                          {/* Rank */}
                          <td className="td-rank">
                            <MedalIcon rank={globalRank} />
                          </td>

                          {/* Dish name */}
                          <td className="td-name">
                            <div className="dish-name-cell">
                              <div className="dish-dot" style={{
                                background: globalRank === 1 ? '#FFD700'
                                  : globalRank === 2 ? '#C0C0C0'
                                  : globalRank === 3 ? '#CD7F32'
                                  : 'var(--border-dark)'
                              }} />
                              <span>{dish.name}</span>
                            </div>
                          </td>

                          {/* Today */}
                          <td className="td-num">
                            <div className="num-cell">
                              <span className={period === 'day' ? 'highlight-val' : ''}>{dish.dailyQty}</span>
                              <MiniBar value={dish.dailyQty} max={maxDaily} color="#63B3ED" />
                            </div>
                          </td>

                          {/* This Month */}
                          <td className="td-num">
                            <div className="num-cell">
                              <span className={period === 'month' ? 'highlight-val' : ''}>{dish.monthlyQty}</span>
                              <MiniBar value={dish.monthlyQty} max={maxMonthly} color="var(--success)" />
                            </div>
                          </td>

                          {/* This Year */}
                          <td className="td-num">
                            <div className="num-cell">
                              <span className={period === 'year' ? 'highlight-val' : ''}>{dish.yearlyQty}</span>
                              <MiniBar value={dish.yearlyQty} max={maxYearly} color="var(--warning)" />
                            </div>
                          </td>

                          {/* All-Time */}
                          <td className="td-num">
                            <div className="num-cell">
                              <span className={period === 'all' ? 'highlight-val' : ''}>{dish.totalQty}</span>
                              <MiniBar value={dish.totalQty} max={maxTotal} color="#A78BFA" />
                            </div>
                          </td>

                          {/* Revenue */}
                          <td className="td-rev">
                            <span className="rev-val">{formatCurrency(currency, dish.totalRevenue)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Styles ── */}
      <style>{`
        .da-wrapper {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Header */
        .da-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .da-header h2 {
          font-size: 24px;
          margin: 0;
        }

        /* Loader */
        .da-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          min-height: 320px;
          color: var(--text-dark-muted);
          font-size: 14px;
        }
        .loader {
          width: 44px;
          height: 44px;
          border: 3px solid rgba(255,255,255,0.05);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Error */
        .da-error {
          padding: 20px;
          border-radius: var(--radius-md);
          color: var(--danger);
          text-align: center;
        }

        /* ── Stats Grid ── */
        .da-stats-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 14px;
        }
        @media (max-width: 1300px) { .da-stats-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px)  { .da-stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px)  { .da-stats-grid { grid-template-columns: 1fr 1fr; } }

        .da-stat-card {
          padding: 18px 16px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 14px;
          transition: var(--transition-fast);
        }
        .da-stat-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.12);
        }
        .da-stat-icon {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .da-stat-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-dark-muted);
          margin-bottom: 4px;
        }
        .da-stat-value {
          font-family: var(--font-brand);
          font-size: 26px;
          font-weight: 800;
          line-height: 1;
        }

        /* ── Podium ── */
        .da-podium-card {
          padding: 24px;
          border-radius: var(--radius-lg);
        }
        .da-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .da-section-header h3 {
          font-size: 16px;
          margin: 0;
        }
        .da-section-badge {
          margin-left: auto;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-dark-muted);
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-full);
          padding: 3px 10px;
        }

        .da-podium {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        @media (max-width: 600px) {
          .da-podium { grid-template-columns: 1fr; }
        }

        .da-podium-item {
          border-radius: var(--radius-md);
          padding: 20px 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: var(--transition-fast);
        }
        .da-podium-item:hover {
          transform: translateY(-3px);
        }
        .da-podium-rank {
          font-size: 28px;
          line-height: 1;
        }
        .da-podium-name {
          font-family: var(--font-brand);
          font-size: 17px;
          font-weight: 700;
          line-height: 1.2;
        }
        .da-podium-qty {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--text-dark-secondary);
        }
        .da-podium-rev {
          font-size: 20px;
          font-weight: 800;
          font-family: var(--font-brand);
          color: var(--text-dark-primary);
        }
        .da-podium-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }
        .da-mini-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: var(--radius-full);
        }

        /* ── Controls ── */
        .da-controls {
          padding: 14px 18px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .da-period-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .da-period-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 600;
          font-family: var(--font-brand);
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-full);
          background: transparent;
          color: var(--text-dark-secondary);
          cursor: pointer;
          transition: var(--transition-fast);
          white-space: nowrap;
        }
        .da-period-btn:hover {
          background: rgba(255,255,255,0.05);
          color: var(--text-dark-primary);
        }
        .da-period-btn.active {
          background: var(--primary-glow);
          border-color: rgba(255,94,0,0.35);
          color: var(--primary);
        }

        .da-search-wrap {
          position: relative;
          margin-left: auto;
        }
        .da-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-dark-muted);
          pointer-events: none;
        }
        .da-search {
          padding: 8px 14px 8px 34px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-full);
          color: var(--text-dark-primary);
          font-family: var(--font-sans);
          font-size: 13px;
          width: 220px;
          outline: none;
          transition: var(--transition-fast);
        }
        .da-search:focus {
          border-color: var(--primary);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 0 3px var(--primary-glow);
        }
        @media (max-width: 600px) {
          .da-search-wrap { margin-left: 0; width: 100%; }
          .da-search { width: 100%; }
        }

        /* ── Table ── */
        .da-table-wrapper {
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .da-table-header {
          padding: 20px 24px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          border-bottom: 1px solid var(--border-dark);
        }
        .da-table-header h3 {
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .da-count-badge {
          font-size: 11px;
          font-weight: 600;
          background: rgba(255,255,255,0.07);
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-full);
          padding: 2px 8px;
          color: var(--text-dark-muted);
        }
        .da-table-scroll {
          overflow-x: auto;
        }
        .da-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }
        .da-table thead th {
          padding: 12px 16px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-dark-muted);
          text-align: left;
          white-space: nowrap;
          border-bottom: 1px solid var(--border-dark);
        }
        .da-table thead th.sortable {
          cursor: pointer;
          user-select: none;
          transition: var(--transition-fast);
        }
        .da-table thead th.sortable:hover {
          color: var(--text-dark-primary);
        }
        .da-table thead th span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .da-table tbody tr {
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background 0.12s;
        }
        .da-table tbody tr.row-even {
          background: rgba(255,255,255,0.015);
        }
        .da-table tbody tr:hover {
          background: rgba(255,255,255,0.04);
        }
        .da-table tbody tr:last-child {
          border-bottom: none;
        }
        .da-table td {
          padding: 12px 16px;
          font-size: 13px;
          vertical-align: middle;
        }

        /* Rank column */
        .td-rank {
          width: 60px;
          text-align: center;
        }
        .medal {
          font-size: 18px;
        }
        .rank-num {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-dark-muted);
          font-family: var(--font-brand);
        }

        /* Dish name */
        .td-name { min-width: 160px; }
        .dish-name-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          font-size: 13px;
          color: var(--text-dark-primary);
        }
        .dish-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Numeric columns */
        .td-num { min-width: 110px; }
        .num-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .num-cell span {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-dark-secondary);
        }
        .num-cell .highlight-val {
          font-size: 15px;
          font-weight: 800;
          color: var(--primary);
        }

        /* Mini Bar */
        .mini-bar-bg {
          height: 4px;
          background: rgba(255,255,255,0.06);
          border-radius: 4px;
          overflow: hidden;
          width: 100%;
          max-width: 120px;
        }
        .mini-bar-fill {
          height: 4px;
          border-radius: 4px;
          transition: width 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        /* Revenue */
        .td-rev { min-width: 90px; }
        .rev-val {
          font-weight: 700;
          font-family: var(--font-brand);
          font-size: 13px;
          color: #F472B6;
        }

        /* Empty State */
        .da-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-height: 240px;
          border-radius: var(--radius-lg);
          color: var(--text-dark-muted);
          font-size: 13px;
          text-align: center;
        }

        /* ─── Revenue Popover ─── */
        .da-revenue-card {
          position: relative;
        }
        .da-revenue-card:hover {
          z-index: 100 !important;
        }

        .da-revenue-popover {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
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
          .da-revenue-popover {
            width: 280px;
          }
        }

        .da-popover-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 8px;
        }

        .da-popover-header h4 {
          font-size: 13px;
          font-weight: 700;
          margin: 0;
          color: var(--text-dark-primary);
        }

        .da-popover-total {
          font-size: 14px;
          font-weight: 800;
          font-family: var(--font-brand);
          color: #F472B6;
        }

        .da-popover-bar-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-dark-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 10px;
        }

        .da-popover-bars {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .da-period-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
        }

        .da-period-label {
          width: 75px;
          color: var(--text-dark-muted);
        }

        .da-period-progress-bg {
          flex-grow: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
          overflow: hidden;
        }

        .da-period-progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .da-period-val {
          width: 75px;
          text-align: right;
          font-weight: 600;
          color: var(--text-dark-primary);
        }
      `}</style>
    </div>
  );
}
