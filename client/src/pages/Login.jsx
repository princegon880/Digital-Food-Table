import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignIn, useAuth } from '@clerk/clerk-react';
import { api } from '../utils/api';
import { Sparkles, Phone, Mail, Lock, AlertCircle, Loader, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const isClerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function ClerkLogin() {
  const navigate = useNavigate();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  
  const [view, setView] = useState('login'); // 'login', 'forgot-send', 'forgot-reset'
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password states
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // OTP states for reset password verification
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const inputRefs = useRef([]);

  // Auto-redirect to dashboard if user is already signed in
  useEffect(() => {
    if (authLoaded && isSignedIn) {
      navigate('/dashboard');
    }
  }, [authLoaded, isSignedIn, navigate]);

  // Timer effect for OTP resend countdown
  useEffect(() => {
    let interval = null;
    if (view === 'forgot-reset' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [view, timer]);

  // Focus the first OTP input when transitioning to forgot-reset
  useEffect(() => {
    if (view === 'forgot-reset' && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0].focus();
      }, 100);
    }
  }, [view]);

  // Handle standard Clerk login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (!emailOrPhone || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    if (!isLoaded) {
      setError('Clerk is loading. Please try again.');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn.create({
        identifier: emailOrPhone,
        password: password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        
        // Wait briefly for token resolver propagation
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Fetch user profile from database
        const data = await api.get('/auth/me');
        
        // Save profile locally
        localStorage.setItem('profile', JSON.stringify(data.profile));

        navigate('/dashboard');
      } else {
        setError(`Login status: ${result.status}. Uncompleted.`);
      }
    } catch (err) {
      console.error('Clerk login error:', err);
      const isAlreadySignedIn = err.errors?.some(e => e.code === 'already_signed_in') || err.message?.includes('already signed in');
      if (isAlreadySignedIn) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const data = await api.get('/auth/me');
          localStorage.setItem('profile', JSON.stringify(data.profile));
          navigate('/dashboard');
          return;
        } catch (syncErr) {
          setError('Already logged in, but failed to fetch your profile. Please log out and try again.');
          setLoading(false);
          return;
        }
      }
      setError(err.errors?.[0]?.longMessage || err.message || 'Invalid email/phone number or password.');
    } finally {
      setLoading(false);
    }
  };

  // Handle sending Clerk Forgot Password OTP
  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (!resetEmail) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: resetEmail,
      });
      setView('forgot-reset');
      setTimer(30);
    } catch (err) {
      console.error('Clerk forgot password request error:', err);
      setError(err.errors?.[0]?.longMessage || err.message || 'Failed to send OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle resetting password with OTP code in Clerk
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const passwordRegex = /^[a-zA-Z]{4,}[^a-zA-Z0-9][0-9]{3,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('Password must start with at least 4 letters, 1 special character, and end with at least 3 digits (e.g. abcd@123).');
      return;
    }

    setLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: otpCode,
        password: newPassword,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        
        // Wait briefly for token resolver propagation
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Fetch user profile from database
        const data = await api.get('/auth/me');
        
        // Save profile locally
        localStorage.setItem('profile', JSON.stringify(data.profile));

        setSuccessMessage('Password reset and logged in successfully!');
        navigate('/dashboard');
      } else {
        setError(`Password reset status: ${result.status}. Uncompleted.`);
      }
    } catch (err) {
      console.error('Clerk reset password complete error:', err);
      setError(err.errors?.[0]?.longMessage || err.message || 'Failed to reset password. Please verify the code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP for forgot password
  const handleResendResetOtpCode = async () => {
    if (timer > 0) return;
    setError('');
    setLoading(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: resetEmail,
      });
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
    <LoginFormView
      view={view}
      setView={setView}
      emailOrPhone={emailOrPhone}
      setEmailOrPhone={setEmailOrPhone}
      password={password}
      setPassword={setPassword}
      loading={loading}
      error={error}
      setError={setError}
      successMessage={successMessage}
      setSuccessMessage={setSuccessMessage}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      showNewPassword={showNewPassword}
      setShowNewPassword={setShowNewPassword}
      showConfirmPassword={showConfirmPassword}
      setShowConfirmPassword={setShowConfirmPassword}
      resetEmail={resetEmail}
      setResetEmail={setResetEmail}
      newPassword={newPassword}
      setNewPassword={setNewPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      otp={otp}
      setOtp={setOtp}
      timer={timer}
      inputRefs={inputRefs}
      handleLoginSubmit={handleLoginSubmit}
      handleSendResetOtp={handleSendResetOtp}
      handleResetPasswordSubmit={handleResetPasswordSubmit}
      handleResendResetOtpCode={handleResendResetOtpCode}
      handleChange={handleChange}
      handleKeyDown={handleKeyDown}
      handlePaste={handlePaste}
    />
  );
}

function LocalLogin() {
  const navigate = useNavigate();
  const [view, setView] = useState('login'); // 'login', 'forgot-send', 'forgot-reset'
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password states
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // OTP states for reset password verification
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
    if (view === 'forgot-reset' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [view, timer]);

  // Focus the first OTP input when transitioning to forgot-reset
  useEffect(() => {
    if (view === 'forgot-reset' && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0].focus();
      }, 100);
    }
  }, [view]);

  // Generate random OTP and log to console
  const generateMockOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setExpectedOtp(code);
    console.log("======================================================");
    console.log("[FALLBACK OTP CONSOLE] Target Email: " + resetEmail);
    console.log("[FALLBACK OTP CONSOLE] OTP Code: " + code);
    console.log("======================================================");
  };

  // Handle standard local mock login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (!emailOrPhone || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    try {
      // Set local mock token
      const mockToken = 'mock-token-' + emailOrPhone.split('@')[0];
      localStorage.setItem('token', mockToken);

      // Fetch user profile from database
      const data = await api.get('/auth/me');
      
      // Save profile locally
      localStorage.setItem('profile', JSON.stringify(data.profile));

      navigate('/dashboard');
    } catch (err) {
      console.error('Local login profile fetch failed:', err);
      setError('Restaurant profile not found. Please register first.');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  // Handle sending Forgot Password OTP (mock)
  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (!resetEmail) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }

    // Simulate sending OTP
    setTimeout(() => {
      generateMockOtp();
      setView('forgot-reset');
      setTimer(30);
      setLoading(false);
    }, 600);
  };

  // Handle resetting password with OTP code
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (otpCode !== expectedOtp && otpCode !== '123456') {
      setError('Invalid verification code.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const passwordRegex = /^[a-zA-Z]{4,}[^a-zA-Z0-9][0-9]{3,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('Password must start with at least 4 letters, 1 special character, and end with at least 3 digits (e.g. abcd@123).');
      return;
    }

    setLoading(true);

    // Simulate password reset completion
    setTimeout(() => {
      setSuccessMessage('Password reset successfully! Please log in with your new password.');
      setView('login');
      setEmailOrPhone(resetEmail);
      setPassword('');
      setResetEmail('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp(['', '', '', '', '', '']);
      setLoading(false);
    }, 800);
  };

  // Resend OTP for forgot password
  const handleResendResetOtpCode = async () => {
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
    <LoginFormView
      view={view}
      setView={setView}
      emailOrPhone={emailOrPhone}
      setEmailOrPhone={setEmailOrPhone}
      password={password}
      setPassword={setPassword}
      loading={loading}
      error={error}
      setError={setError}
      successMessage={successMessage}
      setSuccessMessage={setSuccessMessage}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      showNewPassword={showNewPassword}
      setShowNewPassword={setShowNewPassword}
      showConfirmPassword={showConfirmPassword}
      setShowConfirmPassword={setShowConfirmPassword}
      resetEmail={resetEmail}
      setResetEmail={setResetEmail}
      newPassword={newPassword}
      setNewPassword={setNewPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      otp={otp}
      setOtp={setOtp}
      timer={timer}
      inputRefs={inputRefs}
      handleLoginSubmit={handleLoginSubmit}
      handleSendResetOtp={handleSendResetOtp}
      handleResetPasswordSubmit={handleResetPasswordSubmit}
      handleResendResetOtpCode={handleResendResetOtpCode}
      handleChange={handleChange}
      handleKeyDown={handleKeyDown}
      handlePaste={handlePaste}
    />
  );
}

// Presentational component that houses the JSX and styling
function LoginFormView({
  view,
  setView,
  emailOrPhone,
  setEmailOrPhone,
  password,
  setPassword,
  loading,
  error,
  setError,
  successMessage,
  setSuccessMessage,
  showPassword,
  setShowPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  resetEmail,
  setResetEmail,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  otp,
  timer,
  inputRefs,
  handleLoginSubmit,
  handleSendResetOtp,
  handleResetPasswordSubmit,
  handleResendResetOtpCode,
  handleChange,
  handleKeyDown,
  handlePaste,
}) {
  const renderIcon = () => {
    if (emailOrPhone.includes('@')) {
      return <Mail className="input-icon" size={18} />;
    }
    return <Phone className="input-icon" size={18} />;
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
          {view === 'login' && (
            <>
              <h2>Welcome Back</h2>
              <p>Login to manage your digital restaurant menu</p>
            </>
          )}
          {view === 'forgot-send' && (
            <>
              <h2>Reset Password</h2>
              <p>Enter your email to receive a password reset code</p>
            </>
          )}
          {view === 'forgot-reset' && (
            <>
              <h2>Enter Verification Code</h2>
              <p>We sent a reset OTP code to <strong>{resetEmail}</strong></p>
            </>
          )}
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="auth-success">
            <CheckCircle2Icon size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email or Phone Number</label>
              <div className="input-with-icon">
                {renderIcon()}
                <input 
                  type="text"
                  className="form-control"
                  placeholder="e.g. owner@example.com or 919876543210"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <button 
                  type="button" 
                  onClick={() => { setView('forgot-send'); setError(''); setSuccessMessage(''); }}
                  className="auth-link-btn"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock className="input-icon" size={18} />
                <input 
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="••••••••"
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
            </div>

            <button 
              type="submit" 
              className="btn btn-primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="spinner" size={16} />
                  <span>Logging In...</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>
          </form>
        )}

        {view === 'forgot-send' && (
          <form onSubmit={handleSendResetOtp} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={18} />
                <input 
                  type="email"
                  className="form-control"
                  placeholder="owner@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
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
                <span>Send Reset Code</span>
              )}
            </button>

            <div className="back-btn-container">
              <button 
                type="button" 
                onClick={() => { setView('login'); setError(''); }} 
                className="back-btn"
                disabled={loading}
              >
                <ArrowLeft size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Back to Login
              </button>
            </div>
          </form>
        )}

        {view === 'forgot-reset' && (
          <form onSubmit={handleResetPasswordSubmit} className="auth-form">
            <div className="form-group" style={{ marginBottom: '20px' }}>
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

             <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock className="input-icon" size={18} />
                <input 
                  type={showNewPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="e.g. abcd@123"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="input-hint" style={{ fontSize: '11px', color: 'var(--text-dark-muted)', marginTop: '4px', display: 'block' }}>
                At least 8 chars: 4 letters, followed by 1 special char, and ending with at least 3 numbers (e.g. abcd@123).
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock className="input-icon" size={18} />
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
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
                  <span>Resetting Password...</span>
                </>
              ) : (
                <span>Reset Password</span>
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
                    onClick={handleResendResetOtpCode} 
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
                onClick={() => { setView('forgot-send'); setError(''); }} 
                className="back-btn"
                disabled={loading}
              >
                <ArrowLeft size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Edit Email
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          <span>Don't have an account? </span>
          <Link to="/register" className="auth-link">Sign Up</Link>
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

        .auth-success {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(46, 213, 115, 0.1);
          border: 1px solid rgba(46, 213, 115, 0.2);
          color: #2ed573;
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

        .auth-link-btn {
          background: none;
          border: none;
          color: var(--primary);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s;
        }
        .auth-link-btn:hover {
          color: var(--primary-hover);
          text-decoration: underline;
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

function CheckCircle2Icon({ size }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size || 16}
      height={size || 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default isClerkEnabled ? ClerkLogin : LocalLogin;
