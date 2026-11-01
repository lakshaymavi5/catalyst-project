import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server/app.js';

const app = createApp();

let customerToken = '';
let repairmanToken = '';
let ticketId = '';
let bidId = '';

describe('Marketplace Flow', () => {
  beforeAll(async () => {
    // Register customer
    const cRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Test Customer',
        email: `testcustomer_${Date.now()}@test.com`,
        phone: '9876543210',
        password: 'Password123!',
        role: 'customer'
      });
    customerToken = cRes.body.data?.token || '';

    // Register repairman
    const rRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Test Repairman',
        email: `testrepairman_${Date.now()}@test.com`,
        phone: '9876543211',
        password: 'Password123!',
        role: 'repairman',
        shopName: 'Test Workshop',
        shopAddress: '123 MG Road',
        shopCity: 'Bengaluru',
        shopPin: '560001',
        shopPhone: '+91 80 1234 5678'
      });
    repairmanToken = rRes.body.data?.token || '';
  });

  it('customer can publish a repair ticket', async () => {
    const res = await request(app)
      .post('/api/bids/publish-ticket')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        deviceType: 'smartphone',
        brand: 'Samsung',
        productName: 'Galaxy S21',
        modelNumber: 'SM-G991B',
        serialNumber: 'R5CT90A1234',
        faultTypes: ['screen_crack'],
        budgetInr: 15000,
        pinCode: '560001',
        city: 'Bengaluru',
        serviceCentreId: 'sc_blr_01',
        subtotal: 12000,
        gstAmount: 2160,
        grandTotal: 14160,
        devicePhotoUrl: ''
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('id');
    ticketId = res.body.data.id;
  });

  it('repairman can view open tickets', async () => {
    const res = await request(app)
      .get('/api/bids/tickets')
      .set('Authorization', `Bearer ${repairmanToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.bids)).toBe(true);
  });

  it('repairman can submit a bid', async () => {
    if (!ticketId) return;
    const res = await request(app)
      .post('/api/bids/submit')
      .set('Authorization', `Bearer ${repairmanToken}`)
      .send({
        ticketId,
        bidPrice: 11000,
        turnaroundDays: 2,
        warrantyDays: 90,
        repairApproach: 'OEM screen replacement with diagnostic bench test'
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('bidId');
    bidId = res.body.data.bidId;
  });

  it('customer can view bids on their ticket', async () => {
    if (!ticketId) return;
    const res = await request(app)
      .get(`/api/bids/ticket/${ticketId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.bids)).toBe(true);
  });

  it('customer can accept a bid', async () => {
    if (!bidId) return;
    const res = await request(app)
      .post('/api/bids/accept')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bidId, ticketId });

    expect(res.status).toBe(200);
  });

  it('payment confirmation endpoint works', async () => {
    const res = await request(app)
      .post('/api/payment/confirm')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        invoiceNumber: 'INV-2026-TEST',
        requestId: 'req_test',
        paymentMode: 'pay_later',
        repairMode: 'service_centre',
        amount: 14160
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('transactionId');
    expect(res.body.data.status).toBe('pending');
  });

  it('online payment creates success transaction', async () => {
    const res = await request(app)
      .post('/api/payment/confirm')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        invoiceNumber: 'INV-2026-TEST2',
        requestId: 'req_test2',
        paymentMode: 'online',
        repairMode: 'service_centre',
        upiId: 'test@upi',
        amount: 14160
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('success');
  });
});
