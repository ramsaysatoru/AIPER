import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';

export default function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      height: '70px',
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 2rem',
      gap: '1.5rem'
    }}>
      <NotificationBell />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--color-border)', paddingLeft: '1.5rem' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserIcon size={18} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name}</span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{user?.branch || 'HQ System'}</span>
        </div>
      </div>

      <button onClick={handleLogout} className="btn" style={{ padding: '0.5rem', marginLeft: '0.5rem', color: 'var(--color-text-muted)', backgroundColor: 'transparent' }}>
        <LogOut size={20} />
      </button>
    </header>
  );
}
