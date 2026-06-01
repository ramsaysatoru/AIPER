import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Search, Folder, Settings, LayoutDashboard, Plus, FileText, Users } from 'lucide-react';
import { fetchWithCache, CACHE_KEYS } from '../utils/cache';
import API_URL from '../utils/api';
import { AuthContext } from '../context/AuthContext';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [jobs, setJobs] = useState([]);
  
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const { user } = useContext(AuthContext);

  // Toggle Command Palette with Ctrl+/ or Cmd+/
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Fetch jobs in the background when the palette opens for the first time
  useEffect(() => {
    if (isOpen && jobs.length === 0 && (user?.role === 'ADMIN' || user?.role === 'ADMIN_OFFICER' || user?.role === 'HEAD')) {
      const token = localStorage.getItem('token');
      if (token) {
        fetchWithCache(`${API_URL}/api/jobs`, CACHE_KEYS.JOBS, setJobs, {
          Authorization: `Bearer ${token}`
        }).catch(() => {});
      }
    }
    
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]); // Depend on isOpen to fetch when it opens

  // Setup Commands based on role
  const getStaticCommands = () => {
    const commands = [];
    
    if (user?.role === 'ADMIN') {
      commands.push({ id: 'nav-dashboard', type: 'navigation', title: 'Go to Dashboard', icon: <LayoutDashboard size={18} />, action: () => navigate('/admin') });
      commands.push({ id: 'nav-users', type: 'navigation', title: 'Go to User Management', icon: <Users size={18} />, action: () => navigate('/admin/users') });
      commands.push({ id: 'nav-audit', type: 'navigation', title: 'Go to Activity Logs', icon: <FileText size={18} />, action: () => navigate('/admin/audit') });
    } else if (user?.role === 'ADMIN_OFFICER') {
      commands.push({ id: 'nav-dashboard', type: 'navigation', title: 'Go to Job Distributor', icon: <LayoutDashboard size={18} />, action: () => navigate('/admin-officer') });
      commands.push({ id: 'nav-settings', type: 'navigation', title: 'Go to Data Settings', icon: <Settings size={18} />, action: () => navigate('/admin-officer/data-settings') });
      commands.push({ id: 'act-new-job', type: 'action', title: 'Create New Job', icon: <Plus size={18} />, action: () => { navigate('/admin-officer'); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    } else if (user?.role === 'HEAD') {
      commands.push({ id: 'nav-dashboard', type: 'navigation', title: 'Go to Department Dashboard', icon: <LayoutDashboard size={18} />, action: () => navigate('/head') });
      commands.push({ id: 'nav-settings', type: 'navigation', title: 'Go to Data Settings', icon: <Settings size={18} />, action: () => navigate('/head/data-settings') });
    } else if (user?.role === 'ASSISTANT') {
      commands.push({ id: 'nav-dashboard', type: 'navigation', title: 'Go to Task Queue', icon: <LayoutDashboard size={18} />, action: () => navigate('/assistant') });
    }
  
    // Common commands
    commands.push({ id: 'nav-notifications', type: 'navigation', title: 'View Notifications', icon: <FileText size={18} />, action: () => navigate('/notifications') });
    
    return commands;
  };

  const staticCommands = getStaticCommands();

  const jobCommands = (user?.role === 'ADMIN' || user?.role === 'ADMIN_OFFICER' || user?.role === 'HEAD')
    ? jobs.map(j => ({
        id: `job-${j._id}`,
        type: 'job',
        title: `Job: ${j.clientName} (${j.jobCode || 'Pending'})`,
        description: j.sample?.sample_name || 'No sample name',
        action: () => navigate(user.role === 'ADMIN' ? '/admin/audit' : (user.role === 'HEAD' ? '/head/audit' : '/admin-officer'), { state: { expandJobId: j._id } })
      }))
    : [];

  const allCommands = [...staticCommands, ...jobCommands];

  const fuse = new Fuse(allCommands, {
    keys: ['title', 'description', 'type'],
    threshold: 0.4,
  });

  const results = query ? fuse.search(query).map(r => r.item).slice(0, 10) : staticCommands;

  // Handle keyboard navigation within the palette
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      e.stopPropagation();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIndex]) {
        results[activeIndex].action();
        setIsOpen(false);
      }
    }
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000,
      display: 'flex', justifyContent: 'center', paddingTop: '10vh',
      backdropFilter: 'blur(4px)'
    }} onClick={() => setIsOpen(false)}>
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '600px', backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          border: '1px solid var(--color-border)',
          animation: 'slideUp 0.2s ease-out'
        }}
      >
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Search size={20} style={{ color: 'var(--color-text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search jobs, settings, or actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1.1rem', backgroundColor: 'transparent' }}
          />
        </div>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '0.5rem 0' }}>
          {results.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No results found for "{query}"
            </div>
          ) : (
            results.map((cmd, idx) => {
              const isActive = activeIndex === idx;
              return (
                <div
                  key={cmd.id}
                  onClick={() => { cmd.action(); setIsOpen(false); }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  style={{
                    padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                    cursor: 'pointer', backgroundColor: isActive ? 'var(--color-surface-hover)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent'
                  }}
                >
                  <div style={{ color: 'var(--color-text-muted)' }}>
                    {cmd.icon || <FileText size={18} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>{cmd.title}</div>
                    {cmd.description && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{cmd.description}</div>}
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-surface-hover)', fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Navigate with <kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd></span>
          <span>Open with <kbd style={kbdStyle}>Enter</kbd></span>
        </div>
      </div>
    </div>
  );
}

const kbdStyle = {
  backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px',
  padding: '0.1rem 0.3rem', fontFamily: 'monospace', fontWeight: 600,
  boxShadow: '0 1px 1px rgba(0,0,0,0.1)'
};
