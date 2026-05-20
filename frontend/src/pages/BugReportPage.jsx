import React, { useState, useContext } from 'react';
import axios from 'axios';
import { Bug, Lightbulb, Send, CheckCircle, ArrowLeft, AlertTriangle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const TYPES = [
  { id: 'BUG', label: 'Bug Report', icon: <Bug size={32} />, color: 'var(--color-danger)', desc: 'Something is broken, crashing, or behaving unexpectedly.' },
  { id: 'FEATURE_REQUEST', label: 'Missing Feature', icon: <Lightbulb size={32} />, color: 'var(--color-warning)', desc: 'A feature that should exist but doesn\'t, or an improvement idea.' }
];

const SEVERITIES = [
  { id: 'LOW', label: 'Low', color: 'var(--color-text-muted)', desc: 'Minor issue, cosmetic' },
  { id: 'MEDIUM', label: 'Medium', color: 'var(--color-warning)', desc: 'Noticeable issue, workaround exists' },
  { id: 'HIGH', label: 'High', color: '#e67e22', desc: 'Significantly impacts workflow' },
  { id: 'CRITICAL', label: 'Critical', color: 'var(--color-danger)', desc: 'Blocks work entirely' }
];

const PAGES = [
  'Dashboard', 'Review Queue', 'Job Dispatcher', 'Task Queue', 'Activity Logs',
  'User Management', 'Notifications', 'Reports', 'Login', 'Other'
];

export default function BugReportPage() {
  const { user } = useContext(AuthContext);
  const [step, setStep] = useState('pick'); // 'pick', 'form', 'success'
  const [selectedType, setSelectedType] = useState(null);
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [pageOrFeature, setPageOrFeature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please describe the issue before submitting.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      await axios.post('http://localhost:5000/api/bug-reports', {
        type: selectedType,
        severity,
        description: description.trim(),
        pageOrFeature
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('pick');
    setSelectedType(null);
    setSeverity('MEDIUM');
    setDescription('');
    setPageOrFeature('');
    setError('');
  };

  const typeData = TYPES.find(t => t.id === selectedType);

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Bug size={28} style={{ color: 'var(--color-primary)' }} /> Report an Issue
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Help us improve! Your feedback is saved and reviewed by the development team.
      </p>

      {/* ── Step 1: Pick type ── */}
      {step === 'pick' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {TYPES.map(type => (
            <div
              key={type.id}
              onClick={() => { setSelectedType(type.id); setStep('form'); }}
              className="card"
              style={{
                cursor: 'pointer',
                padding: '2rem',
                textAlign: 'center',
                border: '2px solid var(--color-border)',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = type.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ 
                width: '64px', height: '64px', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${type.color}15`, color: type.color
              }}>
                {type.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.3rem' }}>{type.label}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{type.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Step 2: Fill form ── */}
      {step === 'form' && typeData && (
        <div className="card" style={{ borderTop: `4px solid ${typeData.color}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button onClick={() => setStep('pick')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.3rem' }}>
              <ArrowLeft size={20} />
            </button>
            <div style={{ color: typeData.color }}>{typeData.icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{typeData.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Reporting as {user?.name} ({user?.role})
              </div>
            </div>
          </div>

          {/* Severity selector (only for bugs) */}
          {selectedType === 'BUG' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Severity</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {SEVERITIES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSeverity(s.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: severity === s.id ? `2px solid ${s.color}` : '2px solid var(--color-border)',
                      backgroundColor: severity === s.id ? `${s.color}10` : 'transparent',
                      color: severity === s.id ? s.color : 'var(--color-text-muted)',
                      fontWeight: severity === s.id ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'all 0.15s'
                    }}
                    title={s.desc}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Page/feature selector */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Related Page / Feature <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span>
            </label>
            <select
              value={pageOrFeature}
              onChange={e => setPageOrFeature(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-main)' }}
            >
              <option value="">Select a page...</option>
              {PAGES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Describe the issue <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
              {selectedType === 'BUG'
                ? 'What happened? What did you expect to happen? Include steps to reproduce if possible.'
                : 'Describe the feature you\'d like to see. Why would it be useful?'}
            </p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={selectedType === 'BUG' ? 'e.g. When I click "Approve" on the review queue, the page freezes and...' : 'e.g. It would be helpful if there was a way to export reports as PDF...'}
              style={{
                width: '100%', minHeight: '150px', padding: '0.75rem',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem',
                backgroundColor: 'var(--color-surface)', color: 'var(--color-text-main)',
                lineHeight: 1.6
              }}
            />
          </div>

          {error && (
            <div style={{ 
              marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(231, 76, 60, 0.08)', border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !description.trim()}
            className="btn btn-primary"
            style={{ 
              width: '100%', justifyContent: 'center', padding: '0.75rem',
              fontSize: '1rem', fontWeight: 600,
              opacity: !description.trim() ? 0.5 : 1
            }}
          >
            <Send size={18} style={{ marginRight: '0.5rem' }} />
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      )}

      {/* ── Step 3: Success ── */}
      {step === 'success' && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <CheckCircle size={40} style={{ color: 'var(--color-success)' }} />
          </div>
          <h2 style={{ marginBottom: '0.5rem', color: 'var(--color-success)' }}>Report Submitted!</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Thank you for your feedback. The development team will review your report.
          </p>
          <button onClick={resetForm} className="btn btn-primary" style={{ padding: '0.6rem 2rem' }}>
            Submit Another Report
          </button>
        </div>
      )}
    </div>
  );
}
