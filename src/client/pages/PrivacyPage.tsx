import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
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
              This Privacy Policy contains indicative sample clauses for technical demonstration. It does not represent completed legal wording. Retain a qualified privacy practitioner to update this text to ensure full alignment with the Digital Personal Data Protection (DPDP) Act of India and your specific cloud storage policies.
            </p>
          </div>
        </div>
      </div>

      <article className="bg-base-surface border border-base-border rounded-card p-6 sm:p-10 shadow-card text-ink-primary space-y-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold mb-2">
            Privacy Policy & Data Handling
          </h1>
          <p className="text-xs text-ink-muted">
            Effective Date: October 2026 : Version 1.0 (Provisional)
          </p>
        </div>

        <section className="space-y-2 text-xs text-ink-secondary leading-relaxed">
          <h2 className="font-heading text-base font-semibold text-ink-primary">
            1. Information We Collect
          </h2>
          <p>
            When utilizing the Device Repair Assistant service, we collect personal and hardware telemetry strictly required to prepare estimates and fulfill repair orders:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Customer profile data: Full name, verified email address, and mobile phone number for status dispatches.</li>
            <li>Hardware identification: Device category, manufacturer brand, marketing name, model number, and serial number / IMEI.</li>
            <li>Photographic evidence: Uploaded photographs depicting physical damage and housing condition.</li>
            <li>Geographical telemetry: Postal PIN code to establish distance and routing to authorised repair workshops.</li>
          </ul>
        </section>

        <section className="space-y-2 text-xs text-ink-secondary leading-relaxed">
          <h2 className="font-heading text-base font-semibold text-ink-primary">
            2. Photographic Image Storage and Security
          </h2>
          <p>
            Customer device photographs are encrypted during transit using TLS 1.3 and stored in isolated cloud object storage containers. Access to photographs is restricted to authenticated workshop service managers assigned to evaluate the specific repair ticket. Photographs are purged after 90 days following order completion or quote cancellation.
          </p>
        </section>

        <section className="space-y-2 text-xs text-ink-secondary leading-relaxed">
          <h2 className="font-heading text-base font-semibold text-ink-primary">
            3. Session Tokens and Cookies
          </h2>
          <p>
            We implement secure HTTP-only cookies containing signed JSON Web Tokens (JWT) for the purpose of preserving authenticated sessions across multi-step forms. We do not use third-party tracking pixels, advertising retargeting cookies, or external behavioral profilers.
          </p>
        </section>

        <section className="space-y-2 text-xs text-ink-secondary leading-relaxed">
          <h2 className="font-heading text-base font-semibold text-ink-primary">
            4. Data Retention and Erasure Requests
          </h2>
          <p>
            Customers retain the right under the Indian Digital Personal Data Protection Act to request inspection, rectification, or complete deletion of their customer profile and order history by contacting our designated Data Protection Officer at privacy@repairassist.in.
          </p>
        </section>
      </article>
    </div>
  );
};
