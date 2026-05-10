import React from 'react';
import { format } from 'date-fns';

const TIMELINE_COLORS = {
  CREATED:    { dot: '#003DA5', line: '#D6E4FA', label: 'text-blue-700' },
  SUBMITTED:  { dot: '#F5A800', line: '#FEF0C7', label: 'text-amber-700' },
  ESCALATED:  { dot: '#E05C00', line: '#FAEAE0', label: 'text-orange-700' },
  APPROVED:   { dot: '#009A44', line: '#D1FAE5', label: 'text-green-700' },
  REJECTED:   { dot: '#C62828', line: '#FDECEA', label: 'text-red-700' },
  TRANSFERRED:{ dot: '#7C3AED', line: '#F3F0FF', label: 'text-purple-700' },
  RELEASED:   { dot: '#009A44', line: '#D1FAE5', label: 'text-green-700' }
};

const AuditTimeline = ({ events }) => {
  if (!events || events.length === 0) return <p style={{font: '13px var(--font-body)', color: 'var(--gray-500)'}}>No history available.</p>;

  return (
    <div style={{ position: 'relative', paddingLeft: 24 }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute', left: 8, top: 8, bottom: 8,
        width: 1, background: 'var(--gray-200)'
      }} />
      {events.map((ev, i) => {
        const cfg = TIMELINE_COLORS[ev.actionType] || TIMELINE_COLORS.CREATED;
        return (
          <div key={i} style={{ position: 'relative', marginBottom: i < events.length-1 ? 18 : 0 }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: -20, top: 3,
              width: 10, height: 10, borderRadius: '50%',
              background: cfg.dot, border: '2px solid #FFF',
              boxShadow: `0 0 0 2px ${cfg.dot}40`
            }} />
            {/* Content */}
            <div>
              <p style={{ font: '500 13px var(--font-body)', color: 'var(--gray-800)', marginBottom: 2 }}>
                {ev.details}
              </p>
              <p style={{ font: '12px var(--font-body)', color: 'var(--gray-500)' }}>
                {ev.actorName || 'System'}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginLeft: 8, color: 'var(--gray-400)' }}>
                  {format(new Date(ev.timestamp), 'dd MMM yyyy HH:mm')}
                </span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AuditTimeline;
