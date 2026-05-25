import React, { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, User as UserIcon, Menu, ChevronDown, Lock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import axios from 'axios';
import API_URL from '../utils/api';

export default function Header({ onToggleSidebar }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateType, setUpdateType] = useState(''); // 'email' or 'password'
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newValue, setNewValue] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const menuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileUpdate = async () => {
    if (!currentPassword || !newValue) {
      setUpdateError('Please fill in all fields.');
      return;
    }
    setUpdateError('');
    setUpdateSuccess('');
    setIsUpdating(true);

    try {
      const payload = { currentPassword };
      if (updateType === 'email') payload.newEmail = newValue;
      if (updateType === 'password') payload.newPassword = newValue;

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/auth/update-profile`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUpdateSuccess(res.data.message);
      setCurrentPassword('');
      setNewValue('');
      
      // Update local storage if email changed
      if (updateType === 'email') {
        const storedUserStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (storedUserStr) {
          const storedUser = JSON.parse(storedUserStr);
          storedUser.email = res.data.email;
          if (localStorage.getItem('user')) localStorage.setItem('user', JSON.stringify(storedUser));
          if (sessionStorage.getItem('user')) sessionStorage.setItem('user', JSON.stringify(storedUser));
        }
      }

      setTimeout(() => {
        setShowUpdateModal(false);
        setUpdateSuccess('');
      }, 2000);

    } catch (err) {
      setUpdateError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <header className="app-header">
      {/* Hamburger — visible only on mobile */}
      <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Toggle menu">
        <Menu size={24} />
      </button>

      {/* Spacer to push right items to the end on mobile */}
      <div style={{ flex: 1 }} className="show-on-mobile" />

      <NotificationBell />
      
      <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div 
          className="header-user-section" 
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--color-border)', paddingLeft: '1.5rem', cursor: 'pointer' }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserIcon size={18} />
          </div>
          <div className="header-user-name" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name}</span>
          </div>
          <ChevronDown size={16} color="var(--color-text-muted)" />
        </div>

        {showProfileMenu && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: '1rem',
            backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
            width: '200px', zIndex: 100, overflow: 'hidden'
          }}>
            <button 
              onClick={() => { setUpdateType('email'); setShowUpdateModal(true); setShowProfileMenu(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border)' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Mail size={16} /> Change Email
            </button>
            <button 
              onClick={() => { setUpdateType('password'); setShowUpdateModal(true); setShowProfileMenu(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-main)' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Lock size={16} /> Change Password
            </button>
          </div>
        )}
      </div>

      <button onClick={handleLogout} className="btn" style={{ padding: '0.5rem', marginLeft: '0.5rem', color: 'var(--color-text-muted)', backgroundColor: 'transparent' }} title="Logout">
        <LogOut size={20} />
      </button>

      {/* ── PROFILE UPDATE MODAL ── */}
      {showUpdateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2rem', animation: 'slideUp 0.3s ease', borderTop: '4px solid var(--color-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
              {updateType === 'email' ? <Mail size={32} /> : <Lock size={32} />}
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Change {updateType === 'email' ? 'Email' : 'Password'}</h2>
            </div>

            {updateError && <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem' }}>{updateError}</div>}
            {updateSuccess && <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem' }}>{updateSuccess}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>Current Password <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>New {updateType === 'email' ? 'Email' : 'Password'} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input type={updateType === 'email' ? 'email' : 'password'} value={newValue} onChange={e => setNewValue(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                className="btn"
                onClick={() => { setShowUpdateModal(false); setCurrentPassword(''); setNewValue(''); setUpdateError(''); setUpdateSuccess(''); }}
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-main)', padding: '0.6rem 2rem', backgroundColor: 'transparent' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleProfileUpdate}
                style={{ padding: '0.6rem 2rem' }}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}

