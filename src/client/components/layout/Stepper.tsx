import React from 'react';
import { useRepairFlow } from '../../context/RepairFlowContext.js';

const STEPS = [
  { step: 1, label: 'Sign In', shortLabel: 'Auth' },
  { step: 2, label: 'Photo Upload', shortLabel: 'Photo' },
  { step: 3, label: 'Device Specs', shortLabel: 'Specs' },
  { step: 4, label: 'Budget & Area', shortLabel: 'Location' },
  { step: 5, label: 'Bench Estimate', shortLabel: 'Estimate' },
  { step: 6, label: 'Replacements', shortLabel: 'Options' },
  { step: 7, label: 'Final Bill', shortLabel: 'Invoice' },
  { step: 8, label: 'Payment', shortLabel: 'Pay' },
];

export const Stepper: React.FC = () => {
  const { state, goToStep, canAccessStep } = useRepairFlow();
  const current = state.currentStep;

  return (
    <nav
      aria-label="Repair Decision Steps"
      className="w-full bg-base-surface border-y border-base-border py-3 px-4 sm:px-8 overflow-x-auto"
    >
      <ol className="flex items-center justify-between min-w-[620px] max-w-5xl mx-auto gap-2">
        {STEPS.map((item) => {
          const isCurrent = item.step === current;
          const isCompleted = item.step < current;
          const isAccessible = canAccessStep(item.step);

          return (
            <li key={item.step} className="flex-1 flex items-center">
              <button
                type="button"
                disabled={!isAccessible}
                onClick={() => isAccessible && goToStep(item.step)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`group flex items-center gap-2.5 text-left py-1 px-2 rounded-control transition-colors w-full ${
                  isCurrent
                    ? 'text-accent font-semibold'
                    : isCompleted
                    ? 'text-ink-primary hover:text-accent cursor-pointer'
                    : 'text-ink-muted cursor-not-allowed opacity-60'
                }`}
              >
                <span
                  className={`w-6 h-6 flex items-center justify-center text-xs rounded-full font-mono font-medium transition-colors ${
                    isCurrent
                      ? 'bg-accent text-accent-text'
                      : isCompleted
                      ? 'bg-accent-subtle text-accent border border-accent/30'
                      : 'bg-base-muted text-ink-muted border border-base-border'
                  }`}
                >
                  {item.step}
                </span>

                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider hidden sm:inline">
                    {item.label}
                  </span>
                  <span className="text-xs uppercase tracking-wider sm:hidden">
                    {item.shortLabel}
                  </span>
                </div>
              </button>

              {item.step < STEPS.length && (
                <div
                  aria-hidden="true"
                  className={`h-[1px] w-4 sm:w-8 mx-1 ${
                    item.step < current ? 'bg-accent/40' : 'bg-base-border'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
