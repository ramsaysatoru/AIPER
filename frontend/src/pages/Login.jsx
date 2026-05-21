import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Activity, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import logo from '../assets/Acropolis20Logo.png';
import API_URL from '../utils/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [requiresChange, setRequiresChange] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const { login, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // OTP state
  const [otpMode, setOtpMode] = useState(null); // null | 'email' | 'verify'
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const u = await login(email, password);
      if (u.requiresPasswordChange) {
        setRequiresChange(true);
      } else {
        redirectRole(u.role);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/api/auth/change-password`, { newPassword });
      const updatedUser = { ...JSON.parse(localStorage.getItem('user')), requiresPasswordChange: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      redirectRole(updatedUser.role);
    } catch (err) {
      setError('Failed to update password');
    }
  };

  const redirectRole = (role) => {
    if (role === 'ADMIN') navigate('/admin');
    else if (role === 'LAB_HEAD') navigate('/lab-head');
    else if (role === 'HEAD') navigate('/head');
    else if (role === 'ASSISTANT') navigate('/assistant');
  };

  // ── OTP Handlers ──

  const startCountdown = () => {
    setOtpCountdown(300); // 5 minutes in seconds
    const interval = setInterval(() => {
      setOtpCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setOtpMessage('');
    setOtpLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/request-otp`, { email: otpEmail });
      setOtpMessage(res.data.message);
      setOtpMode('verify');
      startCountdown();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setOtpLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/verify-otp`, { email: otpEmail, otp: otpCode });
      // Store user + token and redirect (direct login)
      const userData = res.data;
      localStorage.setItem('token', userData.token);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      setUser(userData);
      redirectRole(userData.role);
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed.');
    } finally {
      setOtpLoading(false);
    }
  };

  const exitOtpMode = () => {
    setOtpMode(null);
    setOtpEmail('');
    setOtpCode('');
    setOtpMessage('');
    setOtpCountdown(0);
    setError('');
  };

  return (
    <div className="flex-center mesh-gradient" style={{ height: '100dvh', width: '100vw', overflow: 'hidden', padding: '0', boxSizing: 'border-box' }}>
      {/* Decorative Blur Orbs */}
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(64,158,255,0.1) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 1 }}></div>
      <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: '450px', height: '450px', background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)', filter: 'blur(70px)', zIndex: 1 }}></div>

      <div className="premium-glass fade-in-up login-card" style={{ width: '100%', maxWidth: '480px', padding: '3rem 3.5rem', borderRadius: '28px', zIndex: 10, backgroundColor: 'rgba(255, 255, 255, 0.9)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src={logo}
            alt="Acropolis Logo"
            className="login-logo"
            style={{ width: '220px', marginBottom: '0.5rem' }}
          />
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--color-danger-light)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', padding: '1rem', borderRadius: '14px', marginBottom: '1.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={16} /> {error}
          </div>
        )}

        {otpMessage && !error && (
          <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '1rem', borderRadius: '14px', marginBottom: '1.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Mail size={16} /> {otpMessage}
          </div>
        )}

        {/* ── OTP Flow: Enter Email ── */}
        {otpMode === 'email' && (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <button type="button" onClick={exitOtpMode} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.25rem', display: 'flex' }}>
                <ArrowLeft size={20} />
              </button>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-main)' }}>Login via OTP</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Enter your registered email to receive a one-time code.</p>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 500, color: 'var(--color-text-main)', fontSize: '0.85rem' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="email"
                  placeholder="name@acropolis.com"
                  style={{ paddingLeft: '3rem', background: '#FFFFFF', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', height: '54px', borderRadius: '14px' }}
                  value={otpEmail}
                  onChange={e => setOtpEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={otpLoading} style={{ width: '100%', height: '54px', borderRadius: '14px', fontWeight: 600 }}>
              {otpLoading ? 'Sending OTP...' : 'Send OTP'} <Mail size={18} />
            </button>
          </form>
        )}

        {/* ── OTP Flow: Verify Code ── */}
        {otpMode === 'verify' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <button type="button" onClick={() => { setOtpMode('email'); setOtpCode(''); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.25rem', display: 'flex' }}>
                <ArrowLeft size={20} />
              </button>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-main)' }}>Enter OTP</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Check <strong>{otpEmail}</strong> for your 6-digit code.
                </p>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 500, color: 'var(--color-text-main)', fontSize: '0.85rem' }}>One-Time Password</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="• • • • • •"
                  style={{
                    paddingLeft: '3rem', background: '#FFFFFF', border: '1px solid var(--color-border)',
                    color: 'var(--color-text-main)', height: '54px', borderRadius: '14px',
                    fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 700, textAlign: 'center', fontFamily: "'Courier New', monospace"
                  }}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                />
              </div>
            </div>

            {otpCountdown > 0 && (
              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: otpCountdown < 60 ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                ⏱ Code expires in {formatCountdown(otpCountdown)}
              </div>
            )}
            {otpCountdown === 0 && otpMode === 'verify' && (
              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                Code expired.{' '}
                <button type="button" onClick={() => { setOtpMode('email'); setOtpCode(''); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', fontSize: '0.85rem' }}>
                  Resend OTP
                </button>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={otpLoading || otpCode.length < 6} style={{ width: '100%', height: '54px', borderRadius: '14px', fontWeight: 600, opacity: otpCode.length < 6 ? 0.5 : 1 }}>
              {otpLoading ? 'Verifying...' : 'Verify & Login'} <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* ── Password Change (first-time login) ── */}
        {!otpMode && requiresChange && (
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 500, color: 'var(--color-text-main)', fontSize: '0.85rem' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new secure password"
                  style={{ paddingLeft: '3rem', paddingRight: '3rem', background: '#FFFFFF', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', height: '54px', borderRadius: '14px' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '54px', borderRadius: '14px', fontWeight: 600 }}>
              Update Password <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* ── Normal Login ── */}
        {!otpMode && !requiresChange && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 500, color: 'var(--color-text-main)', fontSize: '0.85rem' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="email"
                  placeholder="name@acropolis.com"
                  style={{ paddingLeft: '3rem', background: '#FFFFFF', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', height: '48px', borderRadius: '14px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <label style={{ fontWeight: 500, color: 'var(--color-text-main)', fontSize: '0.85rem' }}>Password</label>
                <button type="button" onClick={() => { setOtpMode('email'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}>Login via OTP</button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  style={{ paddingLeft: '3rem', paddingRight: '3rem', background: '#FFFFFF', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', height: '48px', borderRadius: '14px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px', borderRadius: '14px', fontWeight: 600, marginTop: '0.5rem' }}>
              Login <ArrowRight size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}