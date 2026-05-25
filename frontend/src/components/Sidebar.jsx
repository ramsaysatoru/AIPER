import React, { useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Activity, Users, FileText, LayoutDashboard, Settings, ClipboardCheck, Bug, X } from 'lucide-react';
import logo from '../assets/Acropolis20Logo.png';

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const getLinks = () => {
    switch(user?.role) {
      case 'ADMIN':
        return [
          { to: '/admin', icon: <LayoutDashboard size={20} />, label: 'Super Admin Tracker' },
          { to: '/admin/users', icon: <Users size={20} />, label: 'Staff Directory' },
          { to: '/admin/audit', icon: <FileText size={20} />, label: 'Activity Logs' },
        ];
      case 'LAB_HEAD':
        return [
          { to: '/lab-head', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
          { to: '/lab-head/jobs', icon: <Activity size={20} />, label: 'Job Distributor' },
          { to: '/lab-head/users', icon: <Users size={20} />, label: 'User Management' },
          { to: '/lab-head/audit', icon: <FileText size={20} />, label: 'Activity Logs' },
        ];
      case 'HEAD':
        return [
          { to: '/head', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
          { to: '/head/review', icon: <ClipboardCheck size={20} />, label: 'Review Queue' },
          { to: '/head/assistants', icon: <Users size={20} />, label: 'Assistants' },
          { to: '/head/dispatcher', icon: <Activity size={20} />, label: 'Job Dispatcher' },
          { to: '/head/audit', icon: <FileText size={20} />, label: 'Activity Logs' },
        ];
      case 'ASSISTANT':
        return [
          { to: '/assistant', icon: <Activity size={20} />, label: 'Task Queue' },
        ];
      default: return [];
    }
  };

  // Close sidebar on navigation (mobile)
  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo-area" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', borderBottom: '1px solid var(--color-primary-light)', backgroundColor: 'white', position: 'relative' }}>
        <img src={logo} alt="Acropolis Logo" style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain' }} />
        {/* Close button — visible only on mobile */}
        <button
          className="show-on-mobile"
          onClick={onClose}
          style={{
            position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)',
            padding: '0.25rem', display: 'flex', alignItems: 'center'
          }}
        >
          <X size={22} />
        </button>
      </div>
      
      <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {getLinks().map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/admin' || link.to === '/lab-head' || link.to === '/head' || link.to === '/assistant'}
            onClick={handleNavClick}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              color: isActive ? 'white' : 'var(--color-text-muted)',
              backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.2s'
            })}
          >
            {link.icon}
            <span style={{ fontWeight: 500 }}>{link.label}</span>
          </NavLink>
        ))}

      </nav>

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-primary-light)' }}>
        <NavLink
          to="/report-bug"
          onClick={handleNavClick}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            color: isActive ? 'white' : 'var(--color-text-muted)',
            backgroundColor: isActive ? 'var(--color-danger)' : 'transparent',
            textDecoration: 'none',
            transition: 'all 0.2s',
          })}
        >
          <Bug size={20} />
          <span style={{ fontWeight: 500 }}>Report Bugs</span>
        </NavLink>
      </div>
    </div>
  );
}
