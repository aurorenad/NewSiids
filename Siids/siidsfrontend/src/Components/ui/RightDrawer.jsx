import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const RightDrawer = ({ isOpen, onClose, title, children, footerActions }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>
        
        <div className="drawer-header">
          <h2 style={{ font: '600 17px var(--font-display)', color: 'var(--gray-900)', margin: 0 }}>
            {title}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close drawer" style={{background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--gray-500)'}}>
            <XMarkIcon style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div className="drawer-body">
          {children}
        </div>

        {footerActions && (
          <div className="drawer-footer">
            {footerActions}
          </div>
        )}
      </div>
    </>
  );
};

export default RightDrawer;
