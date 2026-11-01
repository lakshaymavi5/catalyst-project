# Open Questions for Product Owner & Stakeholders

The following operational, legal, and architectural questions are documented for the product owner and engineering leadership prior to full-scale commercial launch:

---

## 1. Legal & Regulatory Compliance
1. **Verified Counsel Review for Terms & Privacy**:
   - The current `/terms` and `/privacy` pages are marked with explicit placeholder banners. Has retained Indian corporate counsel reviewed:
     - The physical bench inspection disclaimer (waiver of liability for pre-existing internal micro-corrosion).
     - Storage and retention duration for customer device damage photographs under the Digital Personal Data Protection (DPDP) Act of India.
     - Uncollected hardware policy (45-day bench storage fee of ₹50/day).
2. **GST Registration & Invoicing**:
   - The platform calculates 18% GST (itemised as 9% CGST + 9% SGST for intrastate or 18% IGST for interstate transactions). Will the enterprise invoice under a single state GSTIN (e.g. Karnataka 29AAACD1234F1Z5) or implement multi-state GST registration dynamically based on customer postal PIN code?

---

## 2. Real Service-Centre Network & Logistics
1. **Authorised Service Centre Verification**:
   - Seven metropolitan service hubs (Bengaluru, Mumbai, Delhi, Hyderabad, Chennai, Pune) are seeded with representative addresses and operating hours. Do we have an authorised dealer network API or signed partnership agreements with OEM-authorised chains (e.g., Apple Authorised Service Providers, Samsung Care) for live routing?
2. **Mail-In Courier vs Physical Drop-Off**:
   - For customers outside direct 6-digit PIN delivery zones, should we integrate a logistics provider API (e.g., Blue Dart, Delhivery) to generate pre-paid, tamper-evident courier pick-up waybills directly at Step 7?

---

## 3. Dynamic Pricing Source & Margin Modeling
1. **Live Parts Catalog Integration**:
   - Currently, repair rates and cheaper alternatives are loaded from the indexed database matrix (`repair_estimates`). Will rates be periodically synchronised from ERP feeds (e.g., SAP / NetSuite / distributor CSVs) or updated manually via an admin back-office portal?
2. **Refurbished Device Inventory**:
   - In Step 6, three replacement options are dynamically evaluated. Should out-of-stock refurbished units automatically fall back to certified third-party vendor marketplaces (e.g. Cashify / ReFit) via webhook?

---

## 4. Object Storage & Infrastructure Architecture
1. **Production Cloud Storage**:
   - Uploads are currently managed by the disk object storage abstraction (`src/server/storage/index.ts`). For multi-instance horizontal scaling, would the team prefer AWS S3, Cloudflare R2, or Google Cloud Storage for media assets?
2. **SMS & WhatsApp Gateway**:
   - Would the team like to trigger automated WhatsApp or SMS appointment confirmations containing the PDF quote link when the user completes Step 7?
