import React from 'react';
import { PhoneCall, RotateCcw } from 'lucide-react';

interface SafetyNetFallbackProps {
  message?: string;
  phone?: string;
  centreName?: string;
  onRetry: () => void;
}

export const SafetyNetFallback: React.FC<SafetyNetFallbackProps> = ({
  message = 'We could not generate your live bench quote due to a temporary service timeout.',
  phone = '+91 80 4932 7700',
  centreName = 'Central Authorised Service Hub',
  onRetry
}) => {
  return (
    <div
      role="alert"
      className="p-6 my-6 bg-base-surface border border-base-border rounded-card text-ink-primary"
    >
      <div className="max-w-2xl">
        <h3 className="font-heading text-lg font-semibold text-ink-primary mb-2">
          Diagnostic Service Temporary Notice
        </h3>
        <p className="text-sm text-ink-secondary leading-relaxed mb-4">
          {message} Our service facilities remain fully operational, and our technician team is on standby to assist you directly.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-accent-text hover:bg-accent-hover text-sm font-medium rounded-control transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Diagnostic Calculation
          </button>

          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-base-muted hover:bg-base-border text-ink-primary text-sm font-medium rounded-control border border-base-border transition-colors"
          >
            <PhoneCall className="w-4 h-4 text-accent" />
            <span>Call {centreName}: {phone}</span>
          </a>
        </div>
        <p className="text-xs text-ink-muted mt-3">
          Reference your device model and fault type when speaking with the service desk.
        </p>
      </div>
    </div>
  );
};
