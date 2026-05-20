import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Activity, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import logo from '../assets/Acropolis20Logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [requiresChange, setRequiresChange] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

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
      await axios.put('http://localhost:5000/api/auth/change-password', { newPassword });
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

  return (
    <div className="flex-center mesh-gradient" style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Decorative Blur Orbs */}
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(64,158,255,0.1) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 1 }}></div>
      <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: '450px', height: '450px', background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)', filter: 'blur(70px)', zIndex: 1 }}></div>

      <div className="premium-glass fade-in-up" style={{ width: '100%', maxWidth: '480px', padding: '3rem 3.5rem', borderRadius: '28px', zIndex: 10, backgroundColor: 'rgba(255, 255, 255, 0.9)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src={logo}
            alt="Acropolis Logo"
            style={{ width: '260px', marginBottom: '1rem' }}
          />
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--color-danger-light)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', padding: '1rem', borderRadius: '14px', marginBottom: '1.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={16} /> {error}
          </div>
        )}

        {requiresChange ? (
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
        ) : (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 500, color: 'var(--color-text-main)', fontSize: '0.85rem' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="email"
                  placeholder="name@acropolis.com"
                  style={{ paddingLeft: '3rem', background: '#FFFFFF', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', height: '54px', borderRadius: '14px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <label style={{ fontWeight: 500, color: 'var(--color-text-main)', fontSize: '0.85rem' }}>Password</label>
                <button type="button" style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', cursor: 'pointer' }}>Forgot Password?</button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  style={{ paddingLeft: '3rem', paddingRight: '3rem', background: '#FFFFFF', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', height: '54px', borderRadius: '14px' }}
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '54px', borderRadius: '14px', fontWeight: 600, marginTop: '1rem' }}>
              Login <ArrowRight size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}