import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-medium text-ink-secondary hover:text-ink-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Repair Assistant</span>
      </Link>

      {/* Clear Owner Replacement Banner */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-card mb-8">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <span className="font-semibold block uppercase tracking-wider mb-1">
              Notice to Product Owner: Placeholder Document
            </span>
            <p className="leading-relaxed">
              This document contains placeholder terms for development and demonstration purposes. It does not constitute formal legal counsel. Prior to commercial deployment, have your retained corporate attorney replace these clauses with verified agreements tailored to your jurisdiction and business operations.
            </p>
          </div>
        </div>
      </div>

      <article className="bg-base-surface border border-base-border rounded-card p-6 sm:p-10 shadow-card text-ink-primary space-y-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold mb-2">
            Terms of Service
          </h1>
          <p className="text-xs text-ink-muted">
            Effective Date: October 2026 : Version 1.0 (Provisional)
          </p>
        </div>

        <section className="space-y-2 text-xs text-ink-secondary leading-relaxed">
          <h2 className="font-heading text-base font-semibold text-ink-primary">
            1. Nature of Bench Estimates
          </h2>
          <p>
            All quotations generated through the Device Repair Assistant platform are provisional estimates calculated from standard component rates and user-reported defect descriptions. Physical inspection by a certified service technician at our authorised facility is required to confirm the final scope of work.
          </p>
          <p>
            Latent internal issues: including motherboard trace corrosion, liquid ingress beyond the seal boundaries, or prior uncertified repair attempts: may require an amended quotation before work commences.
          </p>
        </section>

        <section className="space-y-2 text-xs text-ink-secondary leading-relaxed">
          <h2 className="font-heading text-base font-semibold text-ink-primary">
            2. Customer Responsibilities and Data Backup
          </h2>
          <p>
            The customer is solely responsible for creating complete external backups of all device data, photographs, software configurations, and accounts prior to transferring hardware to our service network. The company and its affiliated workshops assume no liability for partial or total data loss resulting from motherboard reballing, logic replacement, or memory wiping.
          </p>
        </section>

        <section className="space-y-2 text-xs text-ink-secondary leading-relaxed">
          <h2 className="font-heading text-base font-semibold text-ink-primary">
            3. Warranty on Replacement Components
          </h2>
          <p>
            Original factory OEM components carry a standard 90-day limited warranty against manufacturing defects from the date of physical collection. Tier-1 certified alternative repairs carry a 60-day limited functional warranty. Warranties do not cover subsequent liquid damage, accidental drops, or tampering by third parties.
          </p>
        </section>

        <section className="space-y-2 text-xs text-ink-secondary leading-relaxed">
          <h2 className="font-heading text-base font-semibold text-ink-primary">
            4. Uncollected Hardware
          </h2>
          <p>
            Devices remaining uncollected 45 days after written notification of repair completion or inspection refusal may incur standard bench storage fees of ₹50 per day, up to the statutory limit permitted under Indian commercial law.
          </p>
        </section>

        <section className="space-y-2 text-xs text-ink-secondary leading-relaxed">
          <h2 className="font-heading text-base font-semibold text-ink-primary">
            5. Governing Law and Jurisdiction
          </h2>
          <p>
            These terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka.
          </p>
        </section>
      </article>
    </div>
  );
};
