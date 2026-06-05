import React from 'react';
import './TimelineActivityFeed.css';

export const TimelineActivityFeed = ({ activities }) => {
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="timeline-empty-state">
        No operational transactions recorded for this record.
      </div>
    );
  }

  return (
    <div className="siids-timeline-feed">
      {activities.map((item, index) => (
        <div key={item.id || index} className="timeline-item-row">
          <div className="timeline-track-node">
            <div className="timeline-bubble-dot" />
            {index < activities.length - 1 && <div className="timeline-line-connector" />}
          </div>
          
          <div className="timeline-content-pane">
            <div className="timeline-meta-header">
              <span className="timeline-actor-name">{item.actorName || item.revisedBy}</span>
              <span className="timeline-timestamp-label">{formatDate(item.timestamp || item.revisedAt)}</span>
            </div>
            <p className="timeline-activity-desc">{item.message || `Document content draft revised by DOI.`}</p>
            {item.correlationId && (
              <div className="timeline-correlation-tag">
                Trace Reference: {item.correlationId}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
