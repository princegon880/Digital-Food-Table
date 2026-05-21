import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Sparkles, Phone, Lock, Store, AlertCircle, Loader } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [restaurantName, setRestaurantName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!restaurantName || !phoneNumber || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    try {
      const data = await api.post('/auth/register', {
        restaurantName,
        phoneNumber,
        password
      });

      // Save credentials & profile
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('profile', JSON.stringify(data.profile));

      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="radial-glow bg-glow"></div>

      <div className="glass auth-card animated">
        <div className="auth-header">
          <Link to="/" className="brand">
            <Sparkles className="logo-icon" size={24} />
            <span>QR Dine</span>
          </Link>
          <h2>Create Restaurant Account</h2>
          <p>Get started with your free digital menu dashboard</p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Restaurant Name</label>
            <div className="input-with-icon">
              <Store className="input-icon" size={18} />
              <input 
                type="text"
                className="form-control"
                placeholder="e.g. Cafe Aroma"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number (WhatsApp)</label>
            <div className="input-with-icon">
              <Phone className="input-icon" size={18} />
              <input 
                type="tel"
                className="form-control"
                placeholder="e.g. 919876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <span className="input-hint" style={{ fontSize: '11px', color: 'var(--text-dark-muted)', marginTop: '4px', display: 'block' }}>
              Include country code (e.g. 91 for India, 1 for USA) without + or spaces.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input 
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader className="spinner" size={16} />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Sign Up</span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account? </span>
          <Link to="/login" className="auth-link">Log In</Link>
        </div>
      </div>

      <style>{`
        .auth-wrapper {
          min-height: 100vh;
          background-color: var(--bg-dark);
          color: var(--text-dark-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .bg-glow {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.12;
          background: var(--gradient-brand);
          z-index: 1;
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          padding: 40px;
          border-radius: var(--radius-lg);
          position: relative;
          z-index: 5;
        }

        .auth-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .auth-header .brand {
          justify-content: center;
          margin-bottom: 16px;
        }
        .auth-header h2 {
          font-size: 24px;
          margin-bottom: 6px;
        }
        .auth-header p {
          font-size: 13px;
          color: var(--text-dark-muted);
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-with-icon .form-control {
          padding-left: 44px;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          color: var(--text-dark-muted);
        }

        .auth-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 70, 70, 0.1);
          border: 1px solid rgba(255, 70, 70, 0.2);
          color: var(--danger);
          padding: 10px 14px;
          border-radius: var(--radius-md);
          font-size: 13px;
          margin-bottom: 20px;
        }

        .auth-submit-btn {
          width: 100%;
          padding: 12px;
          margin-top: 10px;
        }

        .auth-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: var(--text-dark-secondary);
        }
        .auth-link {
          color: var(--primary);
          font-weight: 600;
        }
        .auth-link:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
