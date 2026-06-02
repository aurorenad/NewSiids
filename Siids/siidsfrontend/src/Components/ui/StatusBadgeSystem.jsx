import React from 'react';
import './StatusBadgeSystem.css';

export const StatusBadgeSystem = ({ status, labelOverride }) => {
  const formatStatusText = (text) => {
    if (labelOverride) return labelOverride;
    if (!text) return '';
    return text.replace(/_/g, ' ').toLowerCase();
  };

  const getStatusClass = (text) => {
    switch (text) {
      case 'SEIZED':
        return 'badge-seized';
      case 'MAIN_STOCK':
        return 'badge-main-stock';
      case 'RELEASE_REQUEST_PENDING':
        return 'badge-release-pending';
      case 'RELEASE_APPROVED':
      case 'HANDED_OVER':
      case 'FINALISED':
        return 'badge-success';
      case 'RETURNED':
        return 'badge-returned';
      case 'EXCEPTION':
        return 'badge-exception';
      case 'PENDING_AC_SIGNATURE':
      case 'PENDING_DIRECTOR_SIGNATURE':
        return 'badge-signature-pending';
      case 'DRAFT':
      default:
        return 'badge-draft';
    }
  };

  return (
    <span className={`siids-badge ${getStatusClass(status)}`}>
      {formatStatusText(status)}
    </span>
  );
};
