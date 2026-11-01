import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-base-surface border-t border-base-border mt-16 text-sm text-ink-secondary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h4 className="font-heading font-semibold text-ink-primary mb-2 text-base">
              Device Repair Assistant
            </h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              Standardised diagnostic estimates, component-level alternative analysis, and certified replacement comparison for consumer electronics across India.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-ink-primary mb-2 text-base">
              National Service Support
            </h4>
            <p className="text-xs text-ink-muted leading-relaxed mb-1">
              Central Customer Helpline: +91 80 4932 7700
            </p>
            <p className="text-xs text-ink-muted leading-relaxed mb-1">
              Operating Hours: Monday to Saturday, 09:30 AM to 07:00 PM IST
            </p>
            <p className="text-xs text-ink-muted leading-relaxed">
              Direct Mail Inquiries: support@repairassist.in
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-ink-primary mb-2 text-base">
              Compliance & Legal
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link to="/terms" className="text-ink-secondary hover:text-accent underline underline-offset-4">
                  Terms of Service (Provisional Draft)
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-ink-secondary hover:text-accent underline underline-offset-4">
                  Privacy Policy & Data Handling
                </Link>
              </li>
              <li className="text-ink-muted pt-1">
                All listed diagnostic prices are indicative estimates subject to bench inspection.
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-base-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted">
          <p>© 2026 Device Repair Assistant Network. Registered GSTIN 29AAACD1234F1Z5.</p>
          <p>Built with React, TypeScript, and Express. Single-server architecture.</p>
        </div>
      </div>
    </footer>
  );
};
