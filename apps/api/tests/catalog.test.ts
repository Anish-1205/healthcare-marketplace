import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { api } from './helpers';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /doctors', () => {
  it('lists only approved, active doctors with pagination', async () => {
    const res = await api().get('/api/v1/doctors').query({ pageSize: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(20);
    for (const doctor of res.body.data) {
      expect(doctor.name).toMatch(/^Dr\. /);
      expect(doctor.primarySpecialty).toEqual(expect.any(String));
    }
  });

  it('filters by specialty slug', async () => {
    const res = await api().get('/api/v1/doctors').query({ specialty: 'dermatologist', pageSize: 50 });
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.every((d: { specialties: string[] }) => d.specialties.includes('Dermatologist'))).toBe(true);
  });

  it('filters by max fee and min rating', async () => {
    const res = await api().get('/api/v1/doctors').query({ feeMax: 500, pageSize: 50 });
    expect(res.body.data.every((d: { consultationFee: number }) => d.consultationFee <= 500)).toBe(true);

    const rated = await api().get('/api/v1/doctors').query({ minRating: 4.5, pageSize: 50 });
    expect(rated.body.data.every((d: { avgRating: number }) => d.avgRating >= 4.5)).toBe(true);
  });

  it('sorts by fee ascending', async () => {
    const res = await api().get('/api/v1/doctors').query({ sort: 'fee', pageSize: 50 });
    const fees = res.body.data.map((d: { consultationFee: number }) => d.consultationFee);
    expect([...fees].sort((a, b) => a - b)).toEqual(fees);
  });

  it('returns Dr. Maya Rao with her rating and next available slot', async () => {
    const list = await api().get('/api/v1/doctors').query({ q: 'Maya' });
    const maya = list.body.data[0];
    expect(maya).toMatchObject({ name: 'Dr. Maya Rao', primarySpecialty: 'Dermatologist' });
    expect(maya.avgRating).toBe(4.8);

    const detail = await api().get(`/api/v1/doctors/${maya.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.organizations.map((o: { organizationName: string }) => o.organizationName)).toContain('Sunrise Family Clinic');
    expect(detail.body.data.availability.length).toBeGreaterThan(0);
  });

  it('resolves a doctor by slug too', async () => {
    const bySlug = await api().get('/api/v1/doctors/dr-maya-rao');
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.data.name).toBe('Dr. Maya Rao');
  });

  it('404s for an unknown or pending doctor', async () => {
    expect((await api().get('/api/v1/doctors/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    const pending = await prisma.doctor.findFirstOrThrow({ where: { approvalStatus: 'PENDING_APPROVAL' } });
    expect((await api().get(`/api/v1/doctors/${pending.id}`)).status).toBe(404);
  });

  it('returns slots for a specific date, excluding already-booked times', async () => {
    const maya = await prisma.doctor.findFirstOrThrow({ where: { slug: 'dr-maya-rao' } });
    const booked = await prisma.appointment.findFirst({ where: { doctorId: maya.id, status: { not: 'CANCELLED' } }, orderBy: { scheduledStart: 'asc' } });
    expect(booked).not.toBeNull();
    const dateStr = booked!.scheduledStart.toISOString().slice(0, 10);

    const res = await api().get(`/api/v1/doctors/${maya.id}/slots`).query({ date: dateStr });
    expect(res.status).toBe(200);
    const starts = res.body.data.map((slot: { start: string }) => slot.start);
    expect(starts).not.toContain(booked!.scheduledStart.toISOString());
  });
});

describe('GET /organizations', () => {
  it('lists approved clinics and hospitals, excluding pharmacies by default filter', async () => {
    const res = await api().get('/api/v1/organizations').query({ type: 'CLINIC,HOSPITAL', pageSize: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.every((o: { type: string }) => o.type === 'CLINIC' || o.type === 'HOSPITAL')).toBe(true);
    expect(res.body.data.map((o: { name: string }) => o.name)).toContain('Sunrise Family Clinic');
    // Pending/rejected orgs never appear.
    expect(res.body.data.map((o: { name: string }) => o.name)).not.toContain('Riverside Skin & Hair Clinic');
  });

  it('computes open/closed status and doctor counts for a detail page', async () => {
    const list = await api().get('/api/v1/organizations').query({ q: 'Sunrise' });
    const sunrise = list.body.data[0];
    expect(sunrise.doctorCount).toBeGreaterThan(0);
    expect(sunrise.hoursLabel).toEqual(expect.any(String));

    const detail = await api().get(`/api/v1/organizations/${sunrise.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.doctors.length).toBe(sunrise.doctorCount);
    expect(detail.body.data.services.length).toBeGreaterThan(0);
  });

  it('filters organizations by specialty', async () => {
    const res = await api().get('/api/v1/organizations').query({ type: 'CLINIC,HOSPITAL', specialty: 'cardiologist', pageSize: 50 });
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((o: { specialties: string[] }) => o.specialties.includes('Cardiologist'))).toBe(true);
  });
});

describe('GET /pharmacies', () => {
  it('lists only approved pharmacies', async () => {
    const res = await api().get('/api/v1/pharmacies').query({ pageSize: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.every((p: { type: string }) => p.type === 'PHARMACY')).toBe(true);
    const names = res.body.data.map((p: { name: string }) => p.name);
    expect(names).toContain('City Care Pharmacy');
    expect(names).not.toContain('NorthStar Pharmacy'); // pending
    expect(names).not.toContain('QuickMeds Express'); // rejected
  });

  it('exposes pharmacy-only delivery fields', async () => {
    const res = await api().get('/api/v1/pharmacies').query({ q: 'City Care' });
    expect(res.body.data[0]).toMatchObject({ deliveryAvailable: true, acceptsPrescriptions: true });
  });

  it('gets a pharmacy detail page but not through /organizations for a non-pharmacy id mismatch', async () => {
    const cityCare = await prisma.organization.findFirstOrThrow({ where: { name: 'City Care Pharmacy' } });
    const res = await api().get(`/api/v1/pharmacies/${cityCare.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('City Care Pharmacy');

    const sunrise = await prisma.organization.findFirstOrThrow({ where: { name: 'Sunrise Family Clinic' } });
    expect((await api().get(`/api/v1/pharmacies/${sunrise.id}`)).status).toBe(404);
  });
});

describe('GET /medicines', () => {
  it('lists active medicines with category info and pagination', async () => {
    const res = await api().get('/api/v1/medicines').query({ pageSize: 10 });
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(50);
    expect(res.body.data[0].category).toHaveProperty('slug');
  });

  it('filters by category slug and prescription requirement', async () => {
    const painRelief = await api().get('/api/v1/medicines').query({ category: 'pain-relief', pageSize: 50 });
    expect(painRelief.body.data.every((m: { category: { slug: string } }) => m.category.slug === 'pain-relief')).toBe(true);

    const otc = await api().get('/api/v1/medicines').query({ requiresPrescription: 'false', pageSize: 100 });
    expect(otc.body.data.every((m: { requiresPrescription: boolean }) => m.requiresPrescription === false)).toBe(true);
  });

  it('computes best price and discount from pharmacy stock', async () => {
    const res = await api().get('/api/v1/medicines').query({ q: 'Paracetamol 500' });
    const item = res.body.data.find((m: { name: string }) => m.name === 'Demo Paracetamol 500mg');
    expect(item.mrp).toBe(35);
    expect(item.bestPrice).toBeLessThanOrEqual(35);
    expect(item.inStockPharmacyCount).toBeGreaterThan(0);
  });

  it('returns pharmacy offers on the detail page, cheapest first', async () => {
    const list = await api().get('/api/v1/medicines').query({ q: 'Paracetamol 500' });
    const detail = await api().get(`/api/v1/medicines/${list.body.data[0].id}`);
    expect(detail.status).toBe(200);
    const prices = detail.body.data.pharmacies.map((p: { sellingPrice: number }) => p.sellingPrice);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    expect(detail.body.data.pharmacies.every((p: { stockQuantity: number }) => p.stockQuantity > 0)).toBe(true);
  });

  it('404s for an unknown medicine', async () => {
    expect((await api().get('/api/v1/medicines/00000000-0000-0000-0000-000000000000')).status).toBe(404);
  });

  it('scopes to one pharmacy\'s stock and price when pharmacyId is given', async () => {
    const cityCare = await prisma.organization.findFirstOrThrow({ where: { name: 'City Care Pharmacy' } });
    const res = await api().get('/api/v1/medicines').query({ pharmacyId: cityCare.id, pageSize: 100 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);

    const item = res.body.data[0];
    const inventory = await prisma.pharmacyInventory.findFirstOrThrow({ where: { pharmacyId: cityCare.id, medicine: { id: item.id } } });
    expect(item.bestPrice).toBe(Number(inventory.sellingPrice));
    expect(item.inStockPharmacyCount).toBe(1);
  });
});
