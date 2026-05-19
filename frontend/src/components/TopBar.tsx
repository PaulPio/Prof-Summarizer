import React from 'react';

interface TopBarProps {
  breadcrumb: React.ReactNode;
  children?: React.ReactNode;
}

const TopBar: React.FC<TopBarProps> = ({ breadcrumb, children }) => (
  <header style={{
    height: 48,
    flexShrink: 0,
    padding: '0 16px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    zIndex: 5,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
      {breadcrumb}
    </div>
    {children && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {children}
      </div>
    )}
  </header>
);

export default TopBar;
