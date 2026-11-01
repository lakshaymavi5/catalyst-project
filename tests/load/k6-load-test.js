import http from 'k6/http';
import { check, sleep } from 'k6';

// =============================================================================
// k6 Load Test: 200 Concurrent Users Running Full 7-Step Flow Over 5 Minutes
// Pass Criteria:
//   - p95 response time under 500 ms (http_req_duration p(95) < 500ms)
//   - Error rate under 1% (http_req_failed < 0.01)
// =============================================================================

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp-up to 50 users
    { duration: '1m', target: 200 },   // Ramp-up to peak 200 users
    { duration: '3m', target: 200 },   // Sustained viral traffic spike (200 concurrent users)
    { duration: '30s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    // 95% of all HTTP requests must complete within 500 milliseconds
    http_req_duration: ['p(95)<500'],
    // Overall transaction error rate must remain under 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  const headers = { 'Content-Type': 'application/json' };

  // 1. Customer Authentication (Step 1)
  const loginPayload = JSON.stringify({
    identifier: 'demo@repairassist.in',
    password: 'Password@123',
  });

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, { headers });
  check(loginRes, {
    'auth status is 200': (r) => r.status === 200,
    'auth token received': (r) => JSON.parse(r.body).data.token !== undefined,
  });

  if (loginRes.status !== 200) {
    sleep(1);
    return;
  }

  const token = JSON.parse(loginRes.body).data.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  sleep(0.5);

  // 2. Location & PIN Code Verification (Step 4)
  const pinRes = http.get(`${BASE_URL}/api/catalog/validate-pin/560038`, {
    headers: authHeaders,
  });
  check(pinRes, {
    'pin validation status is 200': (r) => r.status === 200,
    'pin resolved to Bangalore': (r) => JSON.parse(r.body).data.city === 'Bengaluru',
  });

  sleep(0.5);

  // 3. Bench Estimate Calculation (Step 5 - Read-Heavy Cached Query)
  const estimatePayload = JSON.stringify({
    deviceType: 'smartphone',
    brand: 'Apple',
    faults: ['screen_crack'],
    budget: 25000,
  });

  const estimateRes = http.post(`${BASE_URL}/api/estimate/calculate`, estimatePayload, {
    headers: authHeaders,
  });
  check(estimateRes, {
    'estimate status is 200': (r) => r.status === 200,
    'estimate subtotal matches': (r) => JSON.parse(r.body).data.originalRepair.subtotal === 17900,
  });

  sleep(0.5);

  // 4. Replacement Options & Recommendation (Step 6 - Cached Query)
  const repPayload = JSON.stringify({
    deviceType: 'smartphone',
    budget: 25000,
    faults: ['screen_crack'],
    repairSubtotal: 17900,
  });

  const repRes = http.post(`${BASE_URL}/api/replacements/recommend`, repPayload, {
    headers: authHeaders,
  });
  check(repRes, {
    'replacements status is 200': (r) => r.status === 200,
    'three options returned': (r) => JSON.parse(r.body).data.options.length === 3,
  });

  sleep(0.5);

  // 5. Final Bill Generation with 18% GST (Step 7)
  const billPayload = JSON.stringify({
    optionType: 'repair_original',
    deviceType: 'smartphone',
    brand: 'Apple',
    productName: 'iPhone 15 Pro',
    modelNumber: 'A3106',
    serialNumber: 'F2LNQ1P0M9',
    faults: ['screen_crack'],
    budget: 25000,
    pinCode: '560038',
  });

  const billRes = http.post(`${BASE_URL}/api/bill/generate`, billPayload, {
    headers: authHeaders,
  });
  check(billRes, {
    'bill status is 200': (r) => r.status === 200,
    'invoice number issued': (r) => JSON.parse(r.body).data.invoiceNumber.startsWith('INV-'),
    'gst is 18 percent': (r) => JSON.parse(r.body).data.bill.totalGstRate === 0.18,
  });

  // User think-time between sessions
  sleep(1);
}
