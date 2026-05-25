import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';

export default function Header({ onToggleSidebar }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
      
      <div className="header-user-section" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--color-border)', paddingLeft: '1.5rem' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserIcon size={18} />
        </div>
        <div className="header-user-name" style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name}</span>
        </div>
      </div>

      <button onClick={handleLogout} className="btn" style={{ padding: '0.5rem', marginLeft: '0.5rem', color: 'var(--color-text-muted)', backgroundColor: 'transparent' }}>
        <LogOut size={20} />
      </button>
    </header>
  );
}
