# Device Repair Assistant

A fast, responsive, and accessible decision platform designed to help customers choose between repairing damaged electronics or upgrading to certified replacements.

The system is deliberately designed with an editorial, human-crafted visual identity, avoiding the generic tropes of template-generated interfaces. It is architected on a single-server model engineered to withstand viral traffic spikes through indexed PostgreSQL schemas, multi-tier TTL caching, rate limiting, and zero-downtime process management.

---

## Technical Stack & Typography

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons (consistent 18/20px, 1.5 stroke, used sparingly), jsPDF.
- **Backend**: Node.js, Express, TypeScript (executed via `tsx`), `compression` (Gzip/Deflate), `express-rate-limit`, `cookie-parser`, `bcryptjs`, `jsonwebtoken`.
- **Database & Storage**: PostgreSQL (with indexed schema & DDL migrations) plus an embedded relational engine with in-memory indexes for zero-dependency standalone execution. Disk object storage abstraction for photographs.
- **Caching**: Multi-tier in-memory TTL caching with Redis plug-and-play support.
- **Testing**: Vitest (Unit & Integration), Playwright (Desktop & Mobile E2E), k6 (Viral Load Testing).

### Deliberate Typeface Pairing
In compliance with the design requirements (avoiding Inter/Geist/Space Grotesk defaults):
1. **Headings**: **`Newsreader`** (Serif) — A refined, editorial typeface conveying craftsmanship, bench precision, and authority.
2. **Body & Controls**: **`Plus Jakarta Sans`** — A modern, geometric sans-serif offering readability across mobile viewports and technical spec tables.

---

## 7-Step Customer Journey

1. **Sign In**: Real email/phone authentication with password hashing (bcrypt), JWT cookie/bearer tokens, forgot password recovery, and route guards protecting steps 2 through 7.
2. **Photo Upload**: Supports JPG, PNG, and HEIC up to 10 MB with client and server validation, drag & drop, mobile camera capture (`capture="environment"`), image preview, and photo replacement.
3. **Product Details**: Device category (Smartphone, Laptop, Tablet), manufacturer brand, marketing name, model number, serial number/IMEI, and multi-fault symptom selection. Includes brand-specific format validation (e.g. Apple `A\d{4}`, Samsung `SM-[A-Z0-9]{4,6}`, Dell 7-char Service Tag).
4. **Budget & Area**: Maximum repair budget in INR (positive number) and 6-digit Indian PIN code validated against database coverage to instantly assign the nearest authorised service centre.
5. **Bench Estimate**: Calculated breakdown of original OEM parts vs labour, turnaround days, budget comparison pill, cheaper component-level alternative with plain-language trade-off note, and official physical bench inspection disclaimer.
6. **Replacements Comparison**: Structured, responsive comparison table (not 3 marketing cards) showing 3 certified options with prices, specs, and "Best for" tags. Features an algorithmic recommendation based on fault severity and budget.
7. **Final Itemised Bill**: Full tax invoice with 18% GST (CGST 9% + SGST 9%), downloadable PDF generator, nearest service centre hotline and physical address, and a "Start Over" control that safely purges session state.

---

## Performance & Viral Traffic Scaling ("Survive Going Viral")

### 1. Database Indexes and Technical Rationale

The schema (`src/server/db/schema.sql`) explicitly indexes every column used in `WHERE`, `JOIN`, or `ORDER BY` operations:

```sql
-- 1. Users Table
CREATE UNIQUE INDEX idx_users_email ON users(email);
-- RATIONALE: Instant O(1) user identification during login and registration.

CREATE UNIQUE INDEX idx_users_phone ON users(phone);
-- RATIONALE: High-speed lookup for phone/SMS authentication pathways.

-- 2. Sessions Table
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
-- RATIONALE: Rapid JOIN between active sessions and user profiles.

CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
-- RATIONALE: High-frequency WHERE filter for cron jobs pruning expired sessions.

-- 3. Service Centres & Serviceable Postal Codes
CREATE INDEX idx_service_centres_pin_code ON service_centres(pin_code);
-- RATIONALE: Direct WHERE lookup mapping customer's PIN code to local facility.

CREATE INDEX idx_service_centres_city ON service_centres(city);
-- RATIONALE: Fallback regional query WHERE city = ? when precise PIN has no direct center.

CREATE INDEX idx_serviceable_pins_code ON serviceable_pins(pin_code);
-- RATIONALE: Sub-millisecond validation WHERE pin_code = ? AND is_active = TRUE.

CREATE INDEX idx_serviceable_pins_centre_id ON serviceable_pins(service_centre_id);
-- RATIONALE: Foreign key JOIN linking postal codes to specific service hubs.

-- 4. Device Catalog
CREATE INDEX idx_device_catalog_brand_type ON device_catalog(brand, device_type);
-- RATIONALE: Fast filtered dropdown queries WHERE brand = ? AND device_type = ?.

CREATE INDEX idx_device_catalog_model_number ON device_catalog(model_number);
-- RATIONALE: Strict model number verification WHERE model_number = ?.

-- 5. Repair Estimates Matrix
CREATE INDEX idx_repair_estimates_device_brand_fault ON repair_estimates(device_type, brand, fault_type);
-- RATIONALE: 3-column composite index for multi-fault queries WHERE device_type = ? AND brand = ? AND fault_type = ?.

CREATE INDEX idx_repair_estimates_brand_fault ON repair_estimates(brand, fault_type);
-- RATIONALE: Fallback 2-column composite index.

CREATE INDEX idx_repair_estimates_device_fault ON repair_estimates(device_type, fault_type);
-- RATIONALE: Category-level pricing fallback and aggregations.

-- 6. Replacement Options Table
CREATE INDEX idx_replacement_options_device_type ON replacement_options(device_type);
-- RATIONALE: Fetching relevant replacement alternatives WHERE device_type = ?.

CREATE INDEX idx_replacement_options_price ON replacement_options(price ASC);
-- RATIONALE: Sorting replacement devices by price ascending in budget comparisons.

-- 7. Customer Repair Requests / Orders
CREATE INDEX idx_repair_requests_user_id ON repair_requests(user_id);
-- RATIONALE: User order history query WHERE user_id = ?.

CREATE INDEX idx_repair_requests_created_at ON repair_requests(created_at DESC);
-- RATIONALE: Chronological ORDER BY sorting for administrative dispatch logs.

CREATE INDEX idx_repair_requests_pin_status ON repair_requests(pin_code, status);
-- RATIONALE: Regional dispatch queue filtering WHERE pin_code = ? AND status = ?.
```

### 2. Multi-Tier Caching
- **Read-Heavy Data**: Estimates, replacement models, serviceable postal codes, and catalog items are cached with a TTL of 10 to 60 minutes (`src/server/cache/index.ts`).
- **HTTP Caching**: Public static catalog endpoints carry `Cache-Control: public, max-age=3600`. Static built assets from Vite in production carry `Cache-Control: public, max-age=31536000, immutable`.
- **Cache Invalidation**: Cache entries are invalidated on order confirmation and database seed updates.

### 3. Load Testing (k6)
The k6 load test script (`tests/load/k6-load-test.js`) simulates 200 concurrent users executing the full 7-step customer journey over 5 minutes:

- **Pass Criteria**:
  - `p95` response time under 500 ms (`http_req_duration: ['p(95)<500']`)
  - Overall transaction error rate under 1% (`http_req_failed: ['rate<0.01']`)

To execute the load test:
```bash
# Install k6 (https://k6.io) if not already installed
k6 run tests/load/k6-load-test.js
```

### 4. Simple Host Scaling & Adding a Second Instance
The app is engineered to run as a single process on simple hosts (Render, Railway, or VPS) with PM2:

1. **Process Management**:
   ```bash
   # Start with PM2 in cluster mode utilizing all CPU cores
   pm2 start ecosystem.config.cjs --env production
   ```
2. **Adding a Second Instance**:
   To scale horizontally across two VPS servers or cloud containers:
   - Configure a shared PostgreSQL instance via `DATABASE_URL`.
   - Set `REDIS_URL` in `.env` so both instances share the centralized TTL cache.
   - Point your DNS or Nginx / Caddy reverse proxy to both instances with round-robin or least-connections load balancing:
     ```nginx
     upstream repair_assistant {
         least_conn;
         server 10.0.0.1:3001;
         server 10.0.0.2:3001;
     }
     server {
         listen 80;
         server_name repairassist.in;
         location / {
             proxy_pass http://repair_assistant;
             proxy_set_header Host $host;
             proxy_set_header X-Real-IP $remote_addr;
         }
     }
     ```

### 5. Safety-Net Behavior & Rate Limiting
- **API Failure Fallback**: If the estimate or final bill API encounters a server or network failure, the application renders a dedicated safety-net card (`src/client/components/common/SafetyNetFallback.tsx`) with a one-click Retry action and the nearest service centre's direct telephone line (`+91 80 4932 7700`).
- **Rate Limiting**: Rate limits of 100 requests per 15 minutes per IP on `/api/auth/*` and 100 requests per 10 minutes on `/api/uploads/*` protect against brute force and bandwidth denial.

---

## Quickstart & Local Setup

### 1. Installation
Clone the repository and install all dependencies:
```bash
cd device-repair-assistant
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Default settings enable zero-configuration startup with the embedded indexed relational database and in-memory cache).*

### 3. Run the Application
Start the full-stack server and client with one command:
```bash
# Starts the server (serving API + built frontend) or dev watcher:
npm run dev
```
Open **`http://localhost:3001`** in your browser.

- **Demo Customer Credentials**:
  - Email: `demo@repairassist.in`
  - Password: `Password@123`
  - *(Or click "Insert Verified Demo Account" on Step 1).*

---

## Testing & Quality Assurance

### Run Unit Tests
```bash
npm run test:unit
```
*(Tests pricing algorithms, 18% GST calculation, budget delta thresholds, and brand format validators).*

### Run API Integration Tests
```bash
npm run test:integration
```
*(Verifies authentication, serviceable PIN resolution, caching headers, estimate calculation, and bill generation).*

### Run Playwright E2E Tests
```bash
npx playwright test
```
*(Executes the complete 7-step customer flow on Desktop Chrome (1280x720) and Mobile Viewport (375x667)).*

### Run Production Build Verification
```bash
npm run build
```
*(Compiles Vite frontend and verifies zero TypeScript errors with `tsc --noEmit`).*

---

## Compliance Documentation

- See [`CHANGELOG.md`](./CHANGELOG.md) for the exact code-mapping matrix covering all 30 Anti-Vibe Design Rules and 4 Scale Rules.
- See [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md) for legal, logistics, and pricing questions for the product owner.
- See [`src/server/db/schema.sql`](./src/server/db/schema.sql) and [`seed.sql`](./seed.sql) for database DDL and initial dataset.
