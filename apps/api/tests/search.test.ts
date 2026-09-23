import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { api } from './helpers';

afterAll(async () => {
  await prisma.$disconnect();
});

const search = (q: string) => api().get('/api/v1/search').query({ q });

describe('GET /search', () => {
  it('finds dermatologists by specialty with a route to the doctor list', async () => {
    const res = await search('dermatologist');
    expect(res.status).toBe(200);
    const { doctors, specialties } = res.body.data.groups;
    expect(specialties[0]).toMatchObject({ type: 'specialty', title: 'Dermatologist', href: '/doctors?specialty=dermatologist' });
    expect(doctors.map((d: { title: string }) => d.title)).toContain('Dr. Maya Rao');
  });

  it('finds doctors by full name, ignoring the "Dr." prefix', async () => {
    const res = await search('Dr. Maya Rao');
    const [first] = res.body.data.groups.doctors;
    expect(first).toMatchObject({ title: 'Dr. Maya Rao', subtitle: 'Dermatologist · Sunrise Family Clinic', badge: '4.8★' });
    expect(first.href).toBe(`/doctors/${first.id}`);
  });

  it('finds medicines, pharmacies and clinics with meaningful routes', async () => {
    const medicines = (await search('paracetamol')).body.data.groups.medicines;
    expect(medicines.length).toBeGreaterThanOrEqual(2);
    expect(medicines[0].href).toMatch(/^\/medicines\//);

    const pharmacies = (await search('city care')).body.data.groups.pharmacies;
    expect(pharmacies[0]).toMatchObject({ title: 'City Care Pharmacy', type: 'pharmacy' });
    expect(pharmacies[0].href).toMatch(/^\/pharmacies\//);

    const clinics = (await search('sunrise')).body.data.groups.clinics;
    expect(clinics[0]).toMatchObject({ title: 'Sunrise Family Clinic', type: 'clinic' });
    expect(clinics[0].href).toMatch(/^\/organizations\//);

    const hospitals = (await search('hospital')).body.data.groups.hospitals;
    expect(hospitals.map((h: { title: string }) => h.title)).toEqual(expect.arrayContaining(['Community Health Hospital', 'Metro Care Hospital']));
  });

  it('excludes pending and rejected providers', async () => {
    const res = await search('pharmacy');
    const names = res.body.data.groups.pharmacies.map((p: { title: string }) => p.title);
    expect(names).not.toContain('NorthStar Pharmacy');
    expect((await search('QuickMeds')).body.data.total).toBe(0);
    expect((await search('Lakeside Maternity')).body.data.groups.hospitals).toEqual([]);
  });

  it('requires at least 2 characters', async () => {
    const res = await search('a');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('reference data', () => {
  it('returns public config', async () => {
    const res = await api().get('/api/v1/config');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ marketplaceName: 'CareBridge', currency: 'INR', platformFee: 5, timezone: 'Asia/Kolkata', demoMode: true });
    expect(res.body.data.disclaimer).toMatch(/demonstration application/);
  });

  it('lists specialties with approved doctor counts', async () => {
    const res = await api().get('/api/v1/specialties');
    expect(res.body.data.length).toBeGreaterThanOrEqual(10);
    const dermatology = res.body.data.find((s: { slug: string }) => s.slug === 'dermatologist');
    const approved = await prisma.doctor.count({ where: { approvalStatus: 'APPROVED', isActive: true, specialties: { some: { specialty: { slug: 'dermatologist' } } } } });
    expect(dermatology.doctorCount).toBe(approved);
  });

  it('lists all 12 medicine categories in order', async () => {
    const res = await api().get('/api/v1/medicine-categories');
    expect(res.body.data).toHaveLength(12);
    expect(res.body.data[0]).toMatchObject({ name: 'Pain Relief', slug: 'pain-relief', colorTheme: 'mint' });
    expect(res.body.data.every((c: { medicineCount: number }) => c.medicineCount > 0)).toBe(true);
  });
});
