import React from 'react';
import './WorkflowStepper.css';

export const WorkflowStepper = ({ steps, activeStep, isWarning, isOverdue }) => {
  return (
    <div className={`siids-stepper-container ${isWarning ? 'step-warning' : ''} ${isOverdue ? 'step-overdue' : ''}`}>
      <div className="stepper-track-wrapper">
        {steps.map((step, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;
          
          let stepClass = 'step-pending';
          if (isCompleted) stepClass = 'step-completed';
          if (isActive) stepClass = 'step-active';

          return (
            <div key={index} className={`stepper-step-item ${stepClass}`}>
              <div className="step-node-bubble">
                {isCompleted ? (
                  <svg className="step-check-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="step-label-text">{step}</span>
              {index < steps.length - 1 && <div className="step-connector-line" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
