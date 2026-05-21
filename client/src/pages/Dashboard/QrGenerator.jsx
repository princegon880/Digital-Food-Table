import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, 
  Download, 
  QrCode as QrIcon, 
  Sparkles, 
  HelpCircle
} from 'lucide-react';
import { api } from '../../utils/api';

export default function QrGenerator() {
  const [tableNumber, setTableNumber] = useState('1');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [serverIp, setServerIp] = useState('');
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('profile') || '{}'));
  const [customDomain, setCustomDomain] = useState(() => localStorage.getItem('qr_custom_domain') || '');
  const printAreaRef = useRef();

  useEffect(() => {
    async function fetchServerIpAndProfile() {
      try {
        const [ipData, meData] = await Promise.all([
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? api.get('/server-ip').catch(() => null)
            : Promise.resolve(null),
          api.get('/auth/me').catch(() => null)
        ]);

        if (ipData && ipData.ip && ipData.ip !== 'localhost') {
          setServerIp(ipData.ip);
        }

        if (meData && meData.profile) {
          localStorage.setItem('profile', JSON.stringify(meData.profile));
          setProfile(meData.profile);
        }
      } catch (err) {
        console.error('Failed to fetch data in QR Generator:', err);
      }
    }

    fetchServerIpAndProfile();
  }, []);

  // Always use the production domain for QR codes so they work when scanned
  // Falls back to local network IP or current origin for local development
  const defaultOrigin = import.meta.env.VITE_APP_URL || (
    serverIp 
      ? `http://${serverIp}:5173` 
      : window.location.origin
  );

  const appOrigin = customDomain.trim() !== '' ? customDomain.trim() : defaultOrigin;
  const formattedSlug = profile.slug || 'demo-restaurant';
  const qrUrl = `${appOrigin}/menu/${formattedSlug}?table=${tableNumber}`;

  // Re-generate QR Code when table number changes
  useEffect(() => {
    QRCode.toDataURL(
      qrUrl,
      {
        width: 300,
        margin: 1,
        color: {
          dark: '#080a0f', // Dark background theme
          light: '#ffffff'
        }
      },
      (err, dataUrl) => {
        if (err) {
          console.error(err);
          return;
        }
        setQrCodeDataUrl(dataUrl);
      }
    );
  }, [qrUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `${profile.slug}-table-${tableNumber}-qr.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  return (
    <div className="qr-generator-wrapper animated">
      <div className="dash-header">
        <div>
          <h2>QR Code Generator</h2>
          <p>Generate, customize, and print digital QR codes for your tables.</p>
        </div>
      </div>

      <div className="qr-layout">
        {/* Left Side: Customize Form */}
        <div className="glass settings-card">
          <h3>Customize QR Code</h3>
          <p className="settings-desc">Specify table identifiers. The QR code links directly to your digital menu.</p>
          
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label className="form-label">Table Number / Label</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="e.g. 5, Bar-2, Counter"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Base URL (Domain / Local IP)</label>
            <input 
              type="text" 
              className="form-control"
              placeholder={`Default: ${defaultOrigin}`}
              value={customDomain}
              onChange={(e) => {
                setCustomDomain(e.target.value);
                localStorage.setItem('qr_custom_domain', e.target.value);
              }}
            />
            <span className="input-hint">Specify your deployed domain (e.g. Vercel URL) or local network IP for the QR menu link.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Generated URL Link</label>
            <div className="url-preview-box">
              <span>{qrUrl}</span>
            </div>
          </div>

          <div className="qr-actions-row">
            <button className="btn btn-secondary" onClick={handleDownload} disabled={!qrCodeDataUrl}>
              <Download size={16} />
              <span>Download PNG</span>
            </button>
            <button className="btn btn-primary" onClick={handlePrint} disabled={!qrCodeDataUrl}>
              <Printer size={16} />
              <span>Print Table Card</span>
            </button>
          </div>

          <div className="instructions-box">
            <h4><HelpCircle size={14} /> Printing Tips:</h4>
            <ul>
              <li>Use high-quality cardstock paper.</li>
              <li>Cut along the borders to fit standard table acrylic stands (approx 4x6 inches).</li>
              <li>Test the scan using your phone camera before putting it on tables.</li>
            </ul>
          </div>
        </div>

        {/* Right Side: Print Template Preview */}
        <div className="preview-container">
          <h4>Print Preview Card</h4>
          
          {/* Printable Ticket Frame */}
          <div className="printable-frame-border" ref={printAreaRef}>
            <div className="qr-print-ticket">
              <div className="ticket-decor"></div>
              
              <div className="ticket-header">
                <Sparkles className="ticket-logo" size={20} />
                <h3>{profile.restaurant_name || 'Cafe Aroma'}</h3>
                <span>Digital Table Ordering</span>
              </div>

              <div className="ticket-body">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="QR Code" className="ticket-qr-img" />
                ) : (
                  <div className="ticket-qr-placeholder">
                    <QrIcon size={48} />
                  </div>
                )}
              </div>

              <div className="ticket-table-badge">
                <span>TABLE</span>
                <h2>{tableNumber}</h2>
              </div>

              <div className="ticket-footer">
                <div className="step-item">
                  <span className="step-badge">1</span>
                  <span>Scan QR Code</span>
                </div>
                <div className="step-item">
                  <span className="step-badge">2</span>
                  <span>Choose Dishes</span>
                </div>
                <div className="step-item">
                  <span className="step-badge">3</span>
                  <span>Place Order</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS style tags to support print layouts */}
      <style>{`
        .qr-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          align-items: start;
        }

        @media (max-width: 992px) {
          .qr-layout {
            grid-template-columns: 1fr;
          }
        }

        .settings-card {
          padding: 30px;
          border-radius: var(--radius-lg);
        }

        .settings-card h3 {
          font-size: 18px;
        }

        .settings-desc {
          font-size: 13px;
          color: var(--text-dark-secondary);
          margin-top: 4px;
        }

        .url-preview-box {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-md);
          padding: 12px;
          font-family: monospace;
          font-size: 12px;
          color: var(--primary);
          word-break: break-all;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .qr-actions-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 24px;
        }

        .instructions-box {
          margin-top: 24px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-dark);
        }

        .instructions-box h4 {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-dark-primary);
          margin-bottom: 8px;
        }

        .instructions-box ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .instructions-box li {
          font-size: 12px;
          color: var(--text-dark-secondary);
          padding-left: 12px;
          position: relative;
        }
        .instructions-box li:before {
          content: "•";
          color: var(--primary);
          position: absolute;
          left: 0;
          font-weight: bold;
        }

        /* Print preview container */
        .preview-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
        }
        .preview-container h4 {
          align-self: flex-start;
        }

        .printable-frame-border {
          background: white;
          padding: 16px;
          border-radius: 8px;
          box-shadow: var(--shadow-lg);
        }

        /* Standard Table Desk Frame CSS */
        .qr-print-ticket {
          width: 320px;
          background: #ffffff;
          color: #080a0f;
          border: 2px solid #080a0f;
          border-radius: 16px;
          padding: 32px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          box-shadow: inset 0 0 10px rgba(0,0,0,0.05);
        }

        .ticket-decor {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 12px;
          background: linear-gradient(90deg, #ff4e00 0%, #ec008c 100%);
          border-top-left-radius: 14px;
          border-top-right-radius: 14px;
        }

        .ticket-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin-top: 8px;
          margin-bottom: 20px;
        }

        .ticket-logo {
          color: #ff4e00;
        }

        .ticket-header h3 {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #080a0f;
        }

        .ticket-header span {
          font-size: 11px;
          font-weight: 600;
          color: #777;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .ticket-body {
          margin-bottom: 20px;
          background: #ffffff;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #eee;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ticket-qr-img {
          width: 170px;
          height: 170px;
        }

        .ticket-qr-placeholder {
          width: 170px;
          height: 170px;
          background: #eee;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #aaa;
        }

        .ticket-table-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #080a0f;
          color: #ffffff;
          padding: 8px 24px;
          border-radius: 12px;
          margin-bottom: 24px;
          min-width: 140px;
        }

        .ticket-table-badge span {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          opacity: 0.7;
        }

        .ticket-table-badge h2 {
          font-size: 26px;
          font-weight: 900;
          line-height: 1.1;
        }

        .ticket-footer {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          width: 100%;
          border-top: 1px dashed #ddd;
          padding-top: 16px;
          gap: 4px;
        }

        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .step-badge {
          width: 16px;
          height: 16px;
          background: #ff4e00;
          color: white;
          font-weight: bold;
          font-size: 9px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .step-item span:not(.step-badge) {
          font-size: 10px;
          font-weight: 600;
          color: #555;
        }

        /* CSS Print Styles */
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-frame-border, .printable-frame-border * {
            visibility: visible;
          }
          .printable-frame-border {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(1.3);
            box-shadow: none;
            background: transparent;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
