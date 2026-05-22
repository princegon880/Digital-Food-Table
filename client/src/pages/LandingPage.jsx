import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  QrCode, 
  Flame, 
  ChevronRight
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="landing-wrapper">
      {/* Decorative Radial Lights */}
      <div className="radial-glow glow-1"></div>
      <div className="radial-glow glow-2"></div>

      {/* Header */}
      <header className="landing-header container">
        <div className="brand">
          <Sparkles className="logo-icon" size={24} />
          <span>QR Dine</span>
        </div>
        <div className="header-actions">
          <Link to="/login" className="btn btn-secondary btn-sm">Log In</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section container animated">
        <div className="hero-text">
          <div className="tagline">
            <Flame className="tag-icon" size={14} />
            <span>Modern QR Menu SaaS Platform</span>
          </div>
          <h1>
            Transform Your Restaurant with <span className="gradient-text">Contactless Ordering</span>
          </h1>
          <p>
            Create your digital menu in minutes, print custom table QR codes, and receive orders directly on your live dashboard and WhatsApp. Faster service, higher table turnovers, zero app installs.
          </p>
          <div className="hero-buttons">
            <Link to="/register" className="btn btn-primary btn-lg">
              <span>Create Your Menu</span>
              <ChevronRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">Dashboard Demo</Link>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-num">3x</span>
              <span className="stat-desc">Faster ordering</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">+22%</span>
              <span className="stat-desc">Average order value</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">0</span>
              <span className="stat-desc">App installs required</span>
            </div>
          </div>
        </div>

        {/* Hero Visual Mockup */}
        <div className="hero-mockup">
          <div className="glass mockup-card qr-card animated">
            <QrCode className="mockup-qr-icon" size={48} />
            <h4>Table 4 Menu</h4>
            <span className="mockup-tag">Scan to Order</span>
            <div className="mockup-scan-effect"></div>
          </div>
          <div className="glass mockup-card phone-card animated">
            <div className="phone-screen">
              <div className="phone-header">
                <span className="phone-title">Cafe Aroma</span>
                <span className="phone-table">Table 4</span>
              </div>
              <div className="phone-menu-item">
                <div className="item-details">
                  <h5>🍕 Margherita Pizza</h5>
                  <span>₹250</span>
                </div>
                <button className="phone-add-btn">+</button>
              </div>
              <div className="phone-menu-item">
                <div className="item-details">
                  <h5>☕ Cold Brew Coffee</h5>
                  <span>₹120</span>
                </div>
                <button className="phone-add-btn">+</button>
              </div>
              <div className="phone-cart">
                <span>Cart (2 items)</span>
                <span className="cart-total">₹370</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section container">
        <h2 className="section-title">How It Works in 4 Simple Steps</h2>
        <div className="steps-grid">
          <div className="glass step-card">
            <div className="step-num">01</div>
            <h3>Register & Design</h3>
            <p>Create your account, configure restaurant details, and set up your active menu categories and food dishes.</p>
          </div>
          <div className="glass step-card">
            <div className="step-num">02</div>
            <h3>Print Generated QRs</h3>
            <p>Generate table-specific QR codes automatically and place them on your restaurant tables or dining counters.</p>
          </div>
          <div className="glass step-card">
            <div className="step-num">03</div>
            <h3>Customers Scan & Choose</h3>
            <p>Customers scan the QR code to browse a visually rich mobile-optimized menu and place orders without installing any app.</p>
          </div>
          <div className="glass step-card">
            <div className="step-num">04</div>
            <h3>Instantly Receive Orders</h3>
            <p>Orders are delivered in real-time to your dashboard for preparation and sent to your WhatsApp for notifications.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer container">
        <p>&copy; 2026 QR Dine. All rights reserved. Created for premium dining experiences.</p>
      </footer>

      <style>{`
        .landing-wrapper {
          min-height: 100vh;
          background-color: var(--bg-dark);
          color: var(--text-dark-primary);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .landing-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 80px;
          height: auto;
          position: relative;
          z-index: 10;
          flex-wrap: wrap;
          gap: 16px;
          padding: 10px 24px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-brand);
          font-weight: 800;
          font-size: 22px;
          letter-spacing: -0.02em;
        }
        .logo-icon {
          color: var(--primary);
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        /* Radial Glow Background Elements */
        .radial-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.15;
          pointer-events: none;
          z-index: 1;
        }
        .glow-1 {
          top: -100px;
          left: -100px;
          background: var(--primary);
        }
        .glow-2 {
          bottom: -100px;
          right: -100px;
          background: var(--secondary);
        }

        /* Hero */
        .hero-section {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 60px;
          padding: 60px 24px 80px 24px;
          align-items: center;
          position: relative;
          z-index: 5;
          flex-grow: 1;
        }

        .hero-text {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .tagline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-dark);
          padding: 6px 14px;
          border-radius: var(--radius-full);
          align-self: flex-start;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-dark-secondary);
        }
        .tag-icon {
          color: var(--primary);
        }

        .hero-text h1 {
          font-size: 52px;
          line-height: 1.15;
        }
        .gradient-text {
          background: var(--gradient-brand);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-text p {
          font-size: 17px;
          color: var(--text-dark-secondary);
          line-height: 1.6;
        }

        .hero-buttons {
          display: flex;
          gap: 16px;
        }

        .hero-stats {
          display: flex;
          gap: 40px;
          margin-top: 20px;
          border-top: 1px solid var(--border-dark);
          padding-top: 30px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
        }
        .stat-num {
          font-family: var(--font-brand);
          font-size: 32px;
          font-weight: 800;
          color: var(--primary);
        }
        .stat-desc {
          font-size: 13px;
          color: var(--text-dark-muted);
        }

        /* Hero visual mockup */
        .hero-mockup {
          position: relative;
          height: 420px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .mockup-card {
          position: absolute;
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--shadow-lg);
        }

        .qr-card {
          width: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          z-index: 3;
          left: 10%;
          top: 10%;
          transform: rotate(-10deg);
          animation: floatQR 6s ease-in-out infinite;
        }
        .mockup-qr-icon {
          color: var(--text-dark-primary);
          padding: 8px;
          background: white;
          border-radius: var(--radius-sm);
        }
        .qr-card h4 {
          font-size: 14px;
        }
        .mockup-tag {
          font-size: 10px;
          padding: 4px 8px;
          background: var(--primary-glow);
          color: var(--primary);
          border-radius: var(--radius-full);
          font-weight: bold;
        }

        .phone-card {
          width: 250px;
          height: 380px;
          z-index: 2;
          right: 15%;
          bottom: 5%;
          padding: 12px;
          transform: rotate(5deg);
          animation: floatPhone 6s ease-in-out infinite 1s;
        }
        .phone-screen {
          background: var(--bg-dark);
          width: 100%;
          height: 100%;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border-dark);
          display: flex;
          flex-direction: column;
          padding: 14px;
        }

        .phone-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--border-dark);
          padding-bottom: 8px;
        }
        .phone-title {
          font-size: 12px;
          font-weight: bold;
        }
        .phone-table {
          font-size: 10px;
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }

        .phone-menu-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-dark);
          border-radius: 8px;
          margin-bottom: 8px;
        }
        .phone-menu-item h5 {
          font-size: 11px;
        }
        .phone-menu-item span {
          font-size: 10px;
          color: var(--primary);
        }
        .phone-add-btn {
          width: 20px;
          height: 20px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .phone-cart {
          margin-top: auto;
          background: var(--gradient-brand);
          color: white;
          font-size: 11px;
          padding: 10px;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
        }

        /* Animations */
        @keyframes floatQR {
          0%, 100% { transform: translateY(0) rotate(-10deg); }
          50% { transform: translateY(-15px) rotate(-8deg); }
        }
        @keyframes floatPhone {
          0%, 100% { transform: translateY(0) rotate(5deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }

        /* Features Section */
        .features-section {
          padding: 100px 24px;
          text-align: center;
        }

        .section-title {
          font-size: 36px;
          margin-bottom: 48px;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
        }

        .step-card {
          padding: 36px 24px;
          border-radius: var(--radius-lg);
          text-align: left;
          position: relative;
          transition: var(--transition);
        }
        .step-card:hover {
          transform: translateY(-5px);
          border-color: var(--primary);
          box-shadow: 0 10px 30px var(--primary-glow);
        }

        .step-num {
          font-size: 38px;
          font-weight: 800;
          font-family: var(--font-brand);
          background: var(--gradient-brand);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 16px;
          opacity: 0.8;
        }

        .step-card h3 {
          font-size: 18px;
          margin-bottom: 12px;
        }

        .step-card p {
          font-size: 14px;
          color: var(--text-dark-secondary);
          line-height: 1.5;
        }

        .landing-footer {
          margin-top: auto;
          text-align: center;
          padding: 40px 24px;
          border-top: 1px solid var(--border-dark);
          color: var(--text-dark-muted);
          font-size: 13px;
        }

        @media (max-width: 992px) {
          .hero-section {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 40px;
            padding: 40px 24px 60px 24px;
          }
          .tagline {
            align-self: center;
          }
          .hero-buttons {
            justify-content: center;
          }
          .hero-stats {
            justify-content: center;
          }
          .hero-mockup {
            height: 350px;
          }
        }

        @media (max-width: 768px) {
          .landing-header {
            flex-direction: column;
            height: auto;
            padding: 20px 24px;
            gap: 16px;
          }
          .hero-section {
            padding: 20px 24px 50px 24px;
          }
          .header-actions {
            width: 100%;
            justify-content: center;
          }
          .hero-buttons {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
            max-width: 320px;
            margin: 0 auto;
          }
          .hero-buttons .btn {
            width: 100%;
            justify-content: center;
          }
          .hero-mockup {
            height: 300px;
            width: 100%;
          }
          .qr-card {
            left: 5%;
            top: 5%;
            transform: scale(0.85) rotate(-10deg);
          }
          .phone-card {
            right: 5%;
            bottom: 5%;
            transform: scale(0.85) rotate(5deg);
          }
        }

        @media (max-width: 400px) {
          .hero-mockup {
            height: 250px;
          }
          .qr-card {
            width: 130px;
            padding: 12px;
            left: 2%;
            top: 5%;
            transform: scale(0.8) rotate(-10deg);
          }
          .phone-card {
            width: 180px;
            height: 280px;
            right: 2%;
            bottom: 5%;
            transform: scale(0.8) rotate(5deg);
          }
        }
      `}</style>
    </div>
  );
}
