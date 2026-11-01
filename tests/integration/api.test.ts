import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server/app.js';
import { db } from '../../src/server/db/index.js';

describe('API Integration Endpoints', () => {
  let app: any;
  let authToken: string;

  beforeAll(async () => {
    await db.init();
    app = createApp();

    // Authenticate demo user to get JWT for protected steps 2-7
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'demo@repairassist.in',
        password: 'Password@123'
      });

    expect(loginRes.status).toBe(200);
    authToken = loginRes.body.data.token;
    expect(authToken).toBeDefined();
  });

  it('GET /api/health returns healthy server status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('POST /api/auth/login rejects incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'demo@repairassist.in',
        password: 'WrongPassword'
      });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /api/auth/me succeeds with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('demo@repairassist.in');
  });

  it('GET /api/auth/me rejects unauthenticated request (Protected Step Guard)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/catalog/validate-pin/:pin verifies serviceable postal code', async () => {
    const res = await request(app).get('/api/catalog/validate-pin/560038');
    expect(res.status).toBe(200);
    expect(res.body.data.city).toBe('Bengaluru');
    expect(res.body.data.serviceCentre.name).toContain('Indiranagar');
    expect(res.body.data.serviceCentre.phone).toBe('+91 80 4932 7700');
  });

  it('GET /api/catalog/validate-pin/:pin returns fallback helpline on unserviceable pin', async () => {
    const res = await request(app).get('/api/catalog/validate-pin/999999');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('UNSERVICEABLE_PIN');
    expect(res.body.fallbackServiceCentre.phone).toBe('+91 80 4932 7700');
  });

  it('POST /api/estimate/calculate calculates pricing matrix with caching', async () => {
    const payload = {
      deviceType: 'smartphone',
      brand: 'Apple',
      faults: ['screen_crack'],
      budget: 25000
    };

    // First call: Cache MISS
    const res1 = await request(app)
      .post('/api/estimate/calculate')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);

    expect(res1.status).toBe(200);
    expect(res1.header['x-cache']).toBe('MISS');
    expect(res1.body.data.originalRepair.subtotal).toBe(17900);
    expect(res1.body.data.originalRepair.fitsBudget).toBe(true);
    expect(res1.body.data.cheaperAlternative.savingsAmount).toBe(6700);

    // Second identical call: Cache HIT
    const res2 = await request(app)
      .post('/api/estimate/calculate')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);

    expect(res2.status).toBe(200);
    expect(res2.header['x-cache']).toBe('HIT');
  });

  it('POST /api/replacements/recommend returns 3 structured options with dynamic rationale', async () => {
    const res = await request(app)
      .post('/api/replacements/recommend')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        deviceType: 'smartphone',
        budget: 65000,
        faults: ['screen_crack'],
        repairSubtotal: 17900
      });

    expect(res.status).toBe(200);
    expect(res.body.data.options.length).toBe(3);
    expect(res.body.data.recommendedId).toBeDefined();
    expect(res.body.data.recommendationReason.length).toBeGreaterThan(10);
  });

  it('POST /api/bill/generate produces itemised bill with 18% GST and service centre contact', async () => {
    const res = await request(app)
      .post('/api/bill/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        optionType: 'repair_original',
        deviceType: 'smartphone',
        brand: 'Apple',
        productName: 'iPhone 15 Pro',
        modelNumber: 'A3106',
        serialNumber: 'F2LNQ1P0M9',
        faults: ['screen_crack'],
        budget: 20000,
        pinCode: '560038'
      });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.invoiceNumber).toMatch(/^INV-\d{4}-[A-F0-9]{6}$/);
    expect(data.serviceCentre.name).toContain('Indiranagar');
    expect(data.serviceCentre.phone).toBe('+91 80 4932 7700');
    expect(data.bill.subtotal).toBe(17900);
    expect(data.bill.totalGstRate).toBe(0.18);
    expect(data.bill.totalGstAmount).toBe(3222);
    expect(data.bill.grandTotal).toBe(21122);
  });
});
