import React, { useState } from 'react';
import './SplitWorkspaceLayout.css';

export const SplitWorkspaceLayout = ({ leftPane, rightPane, isItemSelected }) => {
  const [showDrawerMobile, setShowDrawerMobile] = useState(false);

  return (
    <div className="siids-split-workspace">
      {/* Left Column Pane (Primary Listing) */}
      <div className={`workspace-left-pane ${isItemSelected ? 'has-active-detail' : ''}`}>
        {leftPane}
      </div>

      {/* Right Column Pane (Detail Inspector / Action Sheet) */}
      {rightPane && (
        <div className={`workspace-right-pane ${isItemSelected ? 'item-selected' : ''}`}>
          <div className="inspector-content-wrapper glass-panel">
            {rightPane}
          </div>
        </div>
      )}
    </div>
  );
};
