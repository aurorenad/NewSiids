import React from 'react';
import './GlassMetricCard.css';

export const GlassMetricCard = ({ title, value, changePercent, icon, subtitle }) => {
  const isPositive = changePercent >= 0;

  return (
    <div className="siids-glass-card glass-card">
      <div className="card-header-row">
        <span className="card-title-label">{title}</span>
        {icon && <div className="card-icon-container">{icon}</div>}
      </div>
      
      <div className="card-value-display">{value}</div>
      
      {(changePercent !== undefined || subtitle) && (
        <div className="card-footer-row">
          {changePercent !== undefined && (
            <span className={`trend-badge ${isPositive ? 'trend-up' : 'trend-down'}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(changePercent)}%
            </span>
          )}
          {subtitle && <span className="card-subtitle-desc">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
