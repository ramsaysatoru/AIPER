import React from 'react';

/**
 * A centered loading spinner shown while data is being fetched
 * and there's nothing in the cache to show yet.
 *
 * @param {string} message - Optional label shown below the spinner.
 * @param {string} size - 'sm' for small inline spinner, default is large centered.
 */
export default function Spinner({ message = 'Loading...', size }) {
  if (size === 'sm') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
        <div className="spinner spinner-sm" />
        {message}
      </span>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      gap: '1rem',
      color: 'var(--color-text-muted)',
    }}>
      <div className="spinner" />
      <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{message}</span>
    </div>
  );
}
