import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignUp, useAuth } from '@clerk/clerk-react';
import { api } from '../utils/api';
import { Sparkles, Phone, Lock, Store, AlertCircle, Loader, Mail, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const isClerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function ClerkRegister() {
  const navigate = useNavigate();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  
  const [step, setStep] = useState('details'); // 'details' or 'otp'
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // OTP step states
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const inputRefs = useRef([]);

  // Auto-redirect if already logged in and not in the process of signing up
  useEffect(() => {
    if (authLoaded && isSignedIn && !isSigningUp) {
      navigate('/dashboard');
    }
  }, [authLoaded, isSignedIn, isSigningUp, navigate]);

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

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      setLoading(false);
      return;
    }

    const passwordRegex = /^[a-zA-Z]{4,}[^a-zA-Z0-9][0-9]{3,}$/;
    if (!passwordRegex.test(password)) {
      setError('Password must start with at least 4 letters, 1 special character, and end with at least 3 digits (e.g. abcd@123).');
      setLoading(false);
      return;
    }

    if (!isLoaded) {
      setError('Clerk is loading. Please try again in a moment.');
      setLoading(false);
      return;
    }

    try {
      // Start Clerk sign up
      await signUp.create({
        emailAddress: email,
        password: password,
      });

      // Prepare verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      
      setStep('otp');
      setTimer(30);
    } catch (err) {
      console.error('Clerk Sign Up Start Error:', err);
      const isAlreadySignedIn = err.errors?.some(e => e.code === 'already_signed_in') || err.message?.includes('already signed in');
      if (isAlreadySignedIn) {
        // Redirect to dashboard since session is active
        navigate('/dashboard');
        return;
      }
      setError(err.errors?.[0]?.longMessage || err.message || 'Failed to start signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Verify OTP and complete registration
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsSigningUp(true); // Lock auto-redirects during process

    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter the 6-digit verification code.');
      setLoading(false);
      setIsSigningUp(false);
      return;
    }

    try {
      // Attempt verification
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: otpCode,
      });

      if (completeSignUp.status === 'complete') {
        // Activate session
        await setActive({ session: completeSignUp.createdSessionId });
        
        // Wait briefly for token resolver propagation
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Sync profile with database
        const data = await api.post('/auth/sync-profile', {
          restaurantName,
          email,
          phoneNumber
        });

        // Save profile locally for state tracking
        localStorage.setItem('profile', JSON.stringify(data.profile));

        setIsSigningUp(false);
        navigate('/dashboard');
      } else {
        setError(`Registration status: ${completeSignUp.status}. Verification incomplete.`);
        setIsSigningUp(false);
      }
    } catch (err) {
      console.error('Clerk Sign Up Complete Error:', err);
      const isAlreadySignedIn = err.errors?.some(e => e.code === 'already_signed_in') || err.message?.includes('already signed in');
      
      if (isAlreadySignedIn) {
        // If already signed in, try direct sync profile
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const data = await api.post('/auth/sync-profile', {
            restaurantName,
            email,
            phoneNumber
          });
          localStorage.setItem('profile', JSON.stringify(data.profile));
          setIsSigningUp(false);
          navigate('/dashboard');
          return;
        } catch (syncErr) {
          console.error('Direct sync failed:', syncErr);
          setError(syncErr.message || 'Already logged in, but failed to link your restaurant profile. Please log out and try again.');
          setIsSigningUp(false);
          setLoading(false);
          return;
        }
      }

      setError(err.errors?.[0]?.longMessage || err.message || 'Invalid or expired verification code.');
      setIsSigningUp(false);
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
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setTimer(30);
      setOtp(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } catch (err) {
      setError(err.errors?.[0]?.longMessage || err.message || 'Failed to resend verification code.');
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
        if (index > 0) {
          newOtp[index - 1] = '';
          setOtp(newOtp);
          inputRefs.current[index - 1].focus();
        }
      } else {
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
    <RegisterFormView
      step={step}
      restaurantName={restaurantName}
      setRestaurantName={setRestaurantName}
      email={email}
      setEmail={setEmail}
      phoneNumber={phoneNumber}
      setPhoneNumber={setPhoneNumber}
      password={password}
      setPassword={setPassword}
      loading={loading}
      error={error}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      otp={otp}
      timer={timer}
      inputRefs={inputRefs}
      handleSendOtp={handleSendOtp}
      handleVerifyOtp={handleVerifyOtp}
      handleResend={handleResend}
      handleGoBack={handleGoBack}
      handleChange={handleChange}
      handleKeyDown={handleKeyDown}
      handlePaste={handlePaste}
    />
  );
}

function LocalRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState('details'); // 'details' or 'otp'
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP step states
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [expectedOtp, setExpectedOtp] = useState('');
  const inputRefs = useRef([]);

  // Auto-redirect local user if token is active on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && token.startsWith('mock-token-')) {
      navigate('/dashboard');
    }
  }, [navigate]);

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

  // Generate random OTP and log to console
  const generateMockOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setExpectedOtp(code);
    console.log("======================================================");
    console.log("[FALLBACK OTP CONSOLE] Target Email: " + email);
    console.log("[FALLBACK OTP CONSOLE] OTP Code: " + code);
    console.log("======================================================");
  };

  // Handle Step 1: Send registration OTP (mock code)
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!restaurantName || !email || !phoneNumber || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      setLoading(false);
      return;
    }

    const passwordRegex = /^[a-zA-Z]{4,}[^a-zA-Z0-9][0-9]{3,}$/;
    if (!passwordRegex.test(password)) {
      setError('Password must start with at least 4 letters, 1 special character, and end with at least 3 digits (e.g. abcd@123).');
      setLoading(false);
      return;
    }

    // Simulate sending OTP
    setTimeout(() => {
      generateMockOtp();
      setStep('otp');
      setTimer(30);
      setLoading(false);
    }, 800);
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

    if (otpCode !== expectedOtp && otpCode !== '123456') {
      setError('Invalid verification code.');
      setLoading(false);
      return;
    }

    try {
      // Set mock token
      const mockToken = 'mock-token-' + email.split('@')[0];
      localStorage.setItem('token', mockToken);

      // Sync profile with database
      const data = await api.post('/auth/sync-profile', {
        restaurantName,
        email,
        phoneNumber
      });

      // Save profile locally
      localStorage.setItem('profile', JSON.stringify(data.profile));

      navigate('/dashboard');
    } catch (err) {
      console.error('Local Register Error:', err);
      setError(err.message || 'Server error during local registration.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResend = async () => {
    if (timer > 0) return;
    setError('');
    setLoading(true);
    setTimeout(() => {
      generateMockOtp();
      setTimer(30);
      setOtp(['', '', '', '', '', '']);
      setLoading(false);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }, 500);
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
        if (index > 0) {
          newOtp[index - 1] = '';
          setOtp(newOtp);
          inputRefs.current[index - 1].focus();
        }
      } else {
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
    <RegisterFormView
      step={step}
      restaurantName={restaurantName}
      setRestaurantName={setRestaurantName}
      email={email}
      setEmail={setEmail}
      phoneNumber={phoneNumber}
      setPhoneNumber={setPhoneNumber}
      password={password}
      setPassword={setPassword}
      loading={loading}
      error={error}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      otp={otp}
      timer={timer}
      inputRefs={inputRefs}
      handleSendOtp={handleSendOtp}
      handleVerifyOtp={handleVerifyOtp}
      handleResend={handleResend}
      handleGoBack={handleGoBack}
      handleChange={handleChange}
      handleKeyDown={handleKeyDown}
      handlePaste={handlePaste}
    />
  );
}

// Presentational component that houses the JSX and styling
function RegisterFormView({
  step,
  restaurantName,
  setRestaurantName,
  email,
  setEmail,
  phoneNumber,
  setPhoneNumber,
  password,
  setPassword,
  loading,
  error,
  showPassword,
  setShowPassword,
  otp,
  timer,
  inputRefs,
  handleSendOtp,
  handleVerifyOtp,
  handleResend,
  handleGoBack,
  handleChange,
  handleKeyDown,
  handlePaste,
}) {
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
                  placeholder="e.g. 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={10}
                  required
                />
              </div>
              <span className="input-hint" style={{ fontSize: '11px', color: 'var(--text-dark-muted)', marginTop: '4px', display: 'block' }}>
                10-digit mobile number without country code or spaces.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock className="input-icon" size={18} />
                <input 
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="e.g. abcd@123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="input-hint" style={{ fontSize: '11px', color: 'var(--text-dark-muted)', marginTop: '4px', display: 'block' }}>
                At least 8 chars: 4 letters, followed by 1 special char, and ending with at least 3 numbers (e.g. abcd@123).
              </span>
            </div>

            <div id="clerk-captcha" />

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
        .password-toggle-btn {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: var(--text-dark-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: color 0.2s, transform 0.2s;
          z-index: 10;
        }
        .password-toggle-btn:hover {
          color: var(--text-dark-primary);
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}

export default isClerkEnabled ? ClerkRegister : LocalRegister;
