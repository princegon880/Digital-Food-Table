import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Sparkles, Phone, Lock, Store, AlertCircle, Loader, Mail, KeyRound, ArrowLeft } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState('details'); // 'details' or 'otp'
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP step states
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const inputRefs = useRef([]);

  // Timer effect for OTP resend countdown
  useEffect(() => {
    let interval = null;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Focus the first OTP input when step changes to 'otp'
  useEffect(() => {
    if (step === 'otp' && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0].focus();
      }, 100);
    }
  }, [step]);

  // Handle Step 1: Send registration OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!restaurantName || !email || !phoneNumber || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/register/send-otp', {
        restaurantName,
        email,
        phoneNumber,
        password
      });
      setStep('otp');
      setTimer(30);
    } catch (err) {
      setError(err.message || 'Failed to send OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Verify OTP and complete registration
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter the 6-digit verification code.');
      setLoading(false);
      return;
    }

    try {
      const data = await api.post('/auth/register/verify-otp', {
        restaurantName,
        email,
        phoneNumber,
        password,
        otpCode
      });

      // Save credentials & profile
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('profile', JSON.stringify(data.profile));

      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResend = async () => {
    if (timer > 0) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register/send-otp', {
        restaurantName,
        email,
        phoneNumber,
        password
      });
      setTimer(30);
      setOtp(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } catch (err) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Go back to details step
  const handleGoBack = () => {
    setStep('details');
    setError('');
    setOtp(['', '', '', '', '', '']);
  };

  // OTP field handlers
  const handleChange = (element, index) => {
    const val = element.value;
    if (isNaN(val)) return false;

    const newOtp = [...otp];
    newOtp[index] = val.substring(val.length - 1);
    setOtp(newOtp);

    // Focus next input
    if (val !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      if (otp[index] === '') {
        // If current is empty, delete previous and focus previous
        if (index > 0) {
          newOtp[index - 1] = '';
          setOtp(newOtp);
          inputRefs.current[index - 1].focus();
        }
      } else {
        // If current is not empty, delete current
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (pasteData.length === 6 && /^\d+$/.test(pasteData)) {
      const newOtp = pasteData.split('');
      setOtp(newOtp);
      newOtp.forEach((char, index) => {
        if (inputRefs.current[index]) {
          inputRefs.current[index].value = char;
          inputRefs.current[index].focus();
        }
      });
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
          {step === 'details' ? (
            <>
              <h2>Create Restaurant Account</h2>
              <p>Get started with your free digital menu dashboard</p>
            </>
          ) : (
            <>
              <h2>Verify Your Email</h2>
              <p>We sent a 6-digit verification code to <strong>{email}</strong></p>
            </>
          )}
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {step === 'details' ? (
          <form onSubmit={handleSendOtp} className="auth-form">
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
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={18} />
                <input 
                  type="email"
                  className="form-control"
                  placeholder="owner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  <span>Sending OTP...</span>
                </>
              ) : (
                <span>Next</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ textAlign: 'center', display: 'block', marginBottom: '12px' }}>
                Enter 6-Digit Code
              </label>
              <div className="otp-grid">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={digit}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    onChange={(e) => handleChange(e.target, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    onPaste={handlePaste}
                    className="otp-field"
                    required
                    disabled={loading}
                  />
                ))}
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
                  <span>Verifying Code...</span>
                </>
              ) : (
                <span>Verify & Register</span>
              )}
            </button>

            <div className="resend-container">
              {timer > 0 ? (
                <span>Resend OTP in <strong style={{ color: 'var(--primary)' }}>{timer}s</strong></span>
              ) : (
                <span>
                  Didn't receive code?{' '}
                  <button 
                    type="button" 
                    onClick={handleResend} 
                    className="resend-btn"
                    disabled={loading}
                  >
                    Resend Code
                  </button>
                </span>
              )}
            </div>

            <div className="back-btn-container">
              <button 
                type="button" 
                onClick={handleGoBack} 
                className="back-btn"
                disabled={loading}
              >
                <ArrowLeft size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Edit Info
              </button>
            </div>
          </form>
        )}

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

        .otp-grid {
          display: flex;
          gap: 8px;
          justify-content: space-between;
          margin: 10px 0;
        }
        .otp-field {
          width: 48px;
          height: 54px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
          font-size: 22px;
          font-weight: 600;
          text-align: center;
          outline: none;
          transition: all 0.2s ease-in-out;
        }
        .otp-field:focus {
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 3px var(--primary-glow);
        }
        .resend-container {
          text-align: center;
          margin-top: 20px;
          font-size: 13px;
          color: var(--text-dark-secondary);
        }
        .resend-btn {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          transition: color 0.2s;
        }
        .resend-btn:hover {
          color: var(--primary-hover);
        }
        .back-btn-container {
          margin-top: 16px;
          text-align: center;
        }
        .back-btn {
          background: none;
          border: none;
          color: var(--text-dark-muted);
          font-size: 13px;
          cursor: pointer;
          transition: color 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .back-btn:hover {
          color: var(--text-dark-primary);
        }
      `}</style>
    </div>
  );
}
