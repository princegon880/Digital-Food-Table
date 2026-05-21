import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  QrCode, 
  Settings, 
  LogOut,
  Sparkles,
  Menu,
  X
} from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('profile') || '{}'));

  useEffect(() => {
    async function syncProfile() {
      try {
        const data = await api.get('/auth/me');
        if (data && data.profile) {
          localStorage.setItem('profile', JSON.stringify(data.profile));
          setProfile(data.profile);
        }
      } catch (err) {
        console.error('Failed to sync profile in Navbar:', err);
      }
    }
    syncProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
    navigate('/login');
  };

  const menuItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Menu Builder', path: '/dashboard/menu', icon: UtensilsCrossed },
    { name: 'QR Code Generator', path: '/dashboard/qr', icon: QrCode },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Header */}
      <div className="glass mobile-top-bar">
        <div className="nav-brand" style={{ marginBottom: 0 }}>
          <Sparkles className="brand-logo-icon" size={20} />
          <div>
            <span className="brand-title" style={{ fontSize: '16px' }}>QR Dine</span>
          </div>
        </div>
        <button className="mobile-menu-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Dim Overlay when Drawer is open */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)}></div>
      )}

      <nav className={`glass nav-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="nav-brand">
          <Sparkles className="brand-logo-icon" size={24} />
          <div>
            <span className="brand-title">QR Dine</span>
            <span className="brand-subtitle">SaaS Platform</span>
          </div>
        </div>

        <div className="nav-profile">
          <div className="profile-avatar">
            {profile.restaurant_name?.charAt(0).toUpperCase() || 'R'}
          </div>
          <div className="profile-info">
            <div className="profile-name">{profile.restaurant_name || 'Restaurant'}</div>
            <a 
              href={`/menu/${profile.slug}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="profile-link"
              onClick={() => setIsOpen(false)}
            >
              view menu ↗
            </a>
          </div>
        </div>

        <ul className="nav-links">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link 
                  to={item.path} 
                  className={`nav-link-item ${isActive ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <button className="nav-logout-btn btn btn-secondary btn-sm" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Log Out</span>
        </button>

      <style>{`
        .nav-sidebar {
          display: flex;
          flex-direction: column;
          width: 260px;
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          padding: 24px;
          border-radius: 0;
          border-right: 1px solid var(--border-dark);
          z-index: 100;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }

        .brand-logo-icon {
          color: var(--primary);
        }

        .brand-title {
          font-family: var(--font-brand);
          font-weight: 800;
          font-size: 18px;
          letter-spacing: -0.01em;
          display: block;
          background: var(--gradient-brand);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-subtitle {
          font-size: 11px;
          color: var(--text-dark-muted);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
          margin-top: -2px;
        }

        .nav-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-md);
          margin-bottom: 24px;
        }

        .profile-avatar {
          width: 36px;
          height: 36px;
          background: var(--gradient-brand);
          color: white;
          font-weight: 700;
          font-family: var(--font-brand);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }

        .profile-info {
          overflow: hidden;
        }

        .profile-name {
          font-weight: 600;
          font-size: 13px;
          color: var(--text-dark-primary);
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .profile-link {
          font-size: 11px;
          color: var(--primary);
          font-weight: 500;
        }
        .profile-link:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }

        .nav-links {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-grow: 1;
        }

        .nav-link-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 500;
          color: var(--text-dark-secondary);
          transition: var(--transition-fast);
        }

        .nav-link-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-dark-primary);
        }

        .nav-link-item.active {
          background: var(--primary-glow);
          color: var(--primary);
          font-weight: 600;
          border: 1px solid rgba(var(--primary-hue), 95%, 52%, 0.15);
        }

        .nav-logout-btn {
          margin-top: auto;
          width: 100%;
          justify-content: center;
          background: rgba(255, 255, 255, 0.02);
        }
        .nav-logout-btn:hover {
          background: rgba(255, 70, 70, 0.1);
          color: var(--danger);
          border-color: rgba(255, 70, 70, 0.2);
        }

        /* Mobile Top Bar default hidden */
        .mobile-top-bar {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 60px;
          padding: 0 20px;
          justify-content: space-between;
          align-items: center;
          z-index: 200;
          border-bottom: 1px solid var(--border-dark);
          border-radius: 0;
        }

        .mobile-menu-toggle {
          background: none;
          border: none;
          color: var(--text-dark-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: var(--radius-sm);
        }
        .mobile-menu-toggle:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        /* Dim overlay hidden on desktop */
        .sidebar-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(8, 10, 15, 0.6);
          backdrop-filter: blur(4px);
          z-index: 150;
        }

        @media (max-width: 768px) {
          .mobile-top-bar {
            display: flex;
          }
          .sidebar-overlay {
            display: block;
          }
          .nav-sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            height: calc(100vh - 60px);
            top: 60px;
            z-index: 160;
            border-right: 1px solid var(--border-dark);
            box-shadow: var(--shadow-lg);
          }
          .nav-sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </nav>
    </>
  );
}
