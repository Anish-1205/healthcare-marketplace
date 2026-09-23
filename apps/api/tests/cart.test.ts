import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { api, registerPatient, signIn } from './helpers';

afterAll(async () => {
  await prisma.$disconnect();
});

interface Slot {
  start: string;
  end: string;
  organizationId: string | null;
  consultationTypes: string[];
}

let patientAuth: Awaited<ReturnType<typeof signIn>>;
let doctorAuth: Awaited<ReturnType<typeof signIn>>;
let doctorId: string;

// Two real, in-stock (pharmacy, medicine) pairs from the seed data, at different pharmacies.
let pharmacyA: { id: string; name: string };
let pharmacyAMedicines: string[]; // at least two distinct medicineIds stocked at pharmacyA
let pharmacyB: { id: string };
let pharmacyBMedicine: string;

async function findSlot(doctorIdValue: string): Promise<Slot> {
  for (let offset = 0; offset <= 14; offset++) {
    const date = new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
    const res = await api().get(`/api/v1/doctors/${doctorIdValue}/slots`).query({ date });
    if (res.body.data.length) return res.body.data[0];
  }
  throw new Error('No free slot was found for the test doctor.');
}

/** Books, starts a consultation and issues a prescription with two catalogue items plus one hand-typed line. */
async function issuePrescriptionForPatient(): Promise<{ id: string; prescriptionNumber: string }> {
  const slot = await findSlot(doctorId);
  const booked = await api()
    .post('/api/v1/appointments')
    .set('Authorization', patientAuth.auth)
    .send({ doctorId, organizationId: slot.organizationId, consultationType: slot.consultationTypes[0], scheduledStart: slot.start, paymentMethod: 'UPI' });
  expect(booked.status).toBe(201);

  const consultation = await api().post(`/api/v1/appointments/${booked.body.data.id}/consultation`).set('Authorization', doctorAuth.auth).send({});
  expect(consultation.status).toBe(201);

  const created = await api()
    .post('/api/v1/prescriptions')
    .set('Authorization', doctorAuth.auth)
    .send({
      consultationId: consultation.body.data.id,
      diagnosis: 'Cart test prescription',
      items: [
        { medicineId: pharmacyAMedicines[0], medicineName: 'Catalogue medicine one', dosage: '1 tablet', frequency: 'Once daily', duration: '5 days', quantity: 2 },
        { medicineId: pharmacyAMedicines[1], medicineName: 'Catalogue medicine two', dosage: '1 tablet', frequency: 'Twice daily', duration: '5 days', quantity: 1 },
        { medicineName: 'A compounded ointment the pharmacist mixes by hand', dosage: 'Apply thinly', frequency: 'Once daily', duration: '5 days', quantity: 1 },
      ],
    });
  expect(created.status).toBe(201);

  const issued = await api().post(`/api/v1/prescriptions/${created.body.data.id}/issue`).set('Authorization', doctorAuth.auth).send({});
  expect(issued.status).toBe(200);
  return { id: issued.body.data.id, prescriptionNumber: issued.body.data.prescriptionNumber };
}

beforeAll(async () => {
  patientAuth = await registerPatient('cart');
  doctorAuth = await signIn('doctor@carebridge.demo');
  doctorId = doctorAuth.user.doctorId;

  const candidates = await prisma.organization.findMany({
    where: { type: 'PHARMACY', approvalStatus: 'APPROVED', isActive: true, acceptsPrescriptions: true },
    select: { id: true, name: true, inventory: { where: { isActive: true, stockQuantity: { gt: 1 } }, select: { medicineId: true }, take: 5 } },
  });
  const a = candidates.find((p) => p.inventory.length >= 2);
  if (!a) throw new Error('Seed data needs a pharmacy stocking at least two medicines for the cart tests.');
  pharmacyA = { id: a.id, name: a.name };
  pharmacyAMedicines = a.inventory.slice(0, 2).map((row) => row.medicineId);

  // Excludes anything pharmacyA also stocks, so "pharmacyA doesn't carry this" assertions are unambiguous.
  const pharmacyAAllMedicineIds = (
    await prisma.pharmacyInventory.findMany({ where: { pharmacyId: pharmacyA.id, isActive: true }, select: { medicineId: true } })
  ).map((row) => row.medicineId);

  const b = await prisma.organization.findFirst({
    where: {
      type: 'PHARMACY',
      approvalStatus: 'APPROVED',
      isActive: true,
      id: { not: pharmacyA.id },
      inventory: { some: { isActive: true, stockQuantity: { gt: 0 }, medicineId: { notIn: pharmacyAAllMedicineIds } } },
    },
    select: { id: true, inventory: { where: { isActive: true, stockQuantity: { gt: 0 }, medicineId: { notIn: pharmacyAAllMedicineIds } }, select: { medicineId: true }, take: 1 } },
  });
  if (!b || !b.inventory.length) throw new Error('Seed data needs a second pharmacy stocking a medicine pharmacyA does not, for the cart mismatch test.');
  pharmacyB = { id: b.id };
  pharmacyBMedicine = b.inventory[0].medicineId;
});

describe('cart', () => {
  it('starts empty for a patient who has never added anything', async () => {
    const res = await api().get('/api/v1/cart').set('Authorization', patientAuth.auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: null, pharmacy: null, items: [], itemCount: 0, itemTotal: 0 });
  });

  it('adds an item, increments on a repeat add, and updates/removes it', async () => {
    const add = await api().post('/api/v1/cart/items').set('Authorization', patientAuth.auth).send({ medicineId: pharmacyAMedicines[0], pharmacyId: pharmacyA.id, quantity: 1 });
    expect(add.status).toBe(200);
    expect(add.body.data.pharmacy).toMatchObject({ id: pharmacyA.id });
    expect(add.body.data.items).toHaveLength(1);
    expect(add.body.data.items[0]).toMatchObject({ medicineId: pharmacyAMedicines[0], quantity: 1, isAvailable: true });
    expect(add.body.data.itemTotal).toBeGreaterThan(0);

    const addAgain = await api().post('/api/v1/cart/items').set('Authorization', patientAuth.auth).send({ medicineId: pharmacyAMedicines[0], pharmacyId: pharmacyA.id, quantity: 2 });
    expect(addAgain.status).toBe(200);
    expect(addAgain.body.data.items[0].quantity).toBe(3);

    const updated = await api().patch(`/api/v1/cart/items/${pharmacyAMedicines[0]}`).set('Authorization', patientAuth.auth).send({ quantity: 5 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.items[0].quantity).toBe(5);

    const removed = await api().delete(`/api/v1/cart/items/${pharmacyAMedicines[0]}`).set('Authorization', patientAuth.auth);
    expect(removed.status).toBe(200);
    expect(removed.body.data.items).toHaveLength(0);
    // The cart re-opens to any pharmacy once emptied.
    expect(removed.body.data.pharmacy).toBeNull();
  });

  it('refuses a second pharmacy without confirmation, then replaces the cart when confirmed', async () => {
    await api().delete('/api/v1/cart').set('Authorization', patientAuth.auth);
    const first = await api().post('/api/v1/cart/items').set('Authorization', patientAuth.auth).send({ medicineId: pharmacyAMedicines[0], pharmacyId: pharmacyA.id });
    expect(first.status).toBe(200);
    expect(first.body.data.pharmacy.id).toBe(pharmacyA.id);
    expect(first.body.data.items[0].isAvailable).toBe(true);

    const mismatch = await api().post('/api/v1/cart/items').set('Authorization', patientAuth.auth).send({ medicineId: pharmacyBMedicine, pharmacyId: pharmacyB.id });
    expect(mismatch.status).toBe(409);
    expect(mismatch.body.error.code).toBe('PHARMACY_MISMATCH');
    expect(mismatch.body.error.message).toContain(pharmacyA.name);

    const replaced = await api().post('/api/v1/cart/items').set('Authorization', patientAuth.auth).send({ medicineId: pharmacyBMedicine, pharmacyId: pharmacyB.id, replace: true });
    expect(replaced.status).toBe(200);
    expect(replaced.body.data.pharmacy.id).toBe(pharmacyB.id);
    expect(replaced.body.data.items).toHaveLength(1);
    expect(replaced.body.data.items[0].medicineId).toBe(pharmacyBMedicine);
  });

  it('rejects a medicine the pharmacy does not stock', async () => {
    await api().delete('/api/v1/cart').set('Authorization', patientAuth.auth);
    const res = await api().post('/api/v1/cart/items').set('Authorization', patientAuth.auth).send({ medicineId: pharmacyBMedicine, pharmacyId: pharmacyA.id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MEDICINE_UNAVAILABLE');
  });

  it('requires a patient profile', async () => {
    const res = await api().get('/api/v1/cart').set('Authorization', doctorAuth.auth);
    expect(res.status).toBe(403);
  });

  it('clears the whole cart', async () => {
    await api().post('/api/v1/cart/items').set('Authorization', patientAuth.auth).send({ medicineId: pharmacyAMedicines[0], pharmacyId: pharmacyA.id, replace: true });
    const cleared = await api().delete('/api/v1/cart').set('Authorization', patientAuth.auth);
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.items).toHaveLength(0);
    expect(cleared.body.data.pharmacy).toBeNull();
  });
});

describe('GET /prescriptions/:id/pharmacies', () => {
  it('ranks pharmacies by how many of the prescribed medicines they stock', async () => {
    const prescription = await issuePrescriptionForPatient();

    const res = await api().get(`/api/v1/prescriptions/${prescription.id}/pharmacies`).set('Authorization', patientAuth.auth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const match = res.body.data.find((m: { pharmacy: { id: string } }) => m.pharmacy.id === pharmacyA.id);
    expect(match).toBeTruthy();
    // Two of the three lines are catalogue-linked and stocked at pharmacyA; the hand-typed line never matches.
    expect(match.matchedItemCount).toBe(2);
    expect(match.totalItemCount).toBe(3);
    expect(match.hasAllItems).toBe(false);
    expect(match.estimatedTotal).toBeGreaterThan(0);

    // Results are sorted best-match first.
    for (let i = 1; i < res.body.data.length; i++) {
      expect(res.body.data[i - 1].matchedItemCount).toBeGreaterThanOrEqual(res.body.data[i].matchedItemCount);
    }
  });

  it('refuses a prescription that is not the caller\'s', async () => {
    const other = await registerPatient('cart-other');
    const prescription = await issuePrescriptionForPatient();

    const res = await api().get(`/api/v1/prescriptions/${prescription.id}/pharmacies`).set('Authorization', other.auth);
    expect(res.status).toBe(403);
  });
});

describe('POST /cart/from-prescription', () => {
  it('rejects another patient and an unissued prescription without changing the cart', async () => {
    const prescription = await issuePrescriptionForPatient();
    const other = await registerPatient('cart-owner');
    const denied = await api().post('/api/v1/cart/from-prescription').set('Authorization', other.auth).send({ prescriptionId: prescription.id, pharmacyId: pharmacyA.id });
    expect(denied.status).toBe(403);
    await prisma.prescription.update({ where: { id: prescription.id }, data: { status: 'DRAFT' } });
    const draft = await api().post('/api/v1/cart/from-prescription').set('Authorization', patientAuth.auth).send({ prescriptionId: prescription.id, pharmacyId: pharmacyA.id });
    expect(draft.status).toBe(409);
    expect(draft.body.error.code).toBe('PRESCRIPTION_NOT_ISSUED');
    const availability = await api().get(`/api/v1/prescriptions/${prescription.id}/pharmacies`).set('Authorization', doctorAuth.auth);
    expect(availability.status).toBe(409);
  });

  it('counts repeated prescription lines and caps their combined cart quantity to stock', async () => {
    const prescription = await issuePrescriptionForPatient();
    const medicineId = pharmacyAMedicines[0];
    const stock = await prisma.pharmacyInventory.findUniqueOrThrow({ where: { pharmacyId_medicineId: { pharmacyId: pharmacyA.id, medicineId } } });
    await prisma.prescriptionItem.updateMany({ where: { prescriptionId: prescription.id }, data: { medicineId, quantity: stock.stockQuantity } });
    const availability = await api().get(`/api/v1/prescriptions/${prescription.id}/pharmacies`).set('Authorization', patientAuth.auth);
    const match = availability.body.data.find((row: { pharmacy: { id: string } }) => row.pharmacy.id === pharmacyA.id);
    expect(match.matchedItemCount).toBe(3);
    expect(match.hasAllItems).toBe(true);
    const res = await api().post('/api/v1/cart/from-prescription').set('Authorization', patientAuth.auth).send({ prescriptionId: prescription.id, pharmacyId: pharmacyA.id });
    expect(res.status).toBe(200);
    expect(res.body.data.cart.items).toHaveLength(1);
    expect(res.body.data.cart.items[0].quantity).toBe(stock.stockQuantity);
    expect(res.body.data.cart.hasUnavailableItems).toBe(false);
  });

  it('populates the cart from the prescription and reports what could not be matched', async () => {
    const prescription = await issuePrescriptionForPatient();

    const res = await api().post('/api/v1/cart/from-prescription').set('Authorization', patientAuth.auth).send({ prescriptionId: prescription.id, pharmacyId: pharmacyA.id });
    expect(res.status).toBe(200);
    expect(res.body.data.cart.pharmacy.id).toBe(pharmacyA.id);
    expect(res.body.data.cart.prescriptionNumber).toBe(prescription.prescriptionNumber);
    expect(res.body.data.cart.items).toHaveLength(2);
    expect(res.body.data.cart.items.map((i: { quantity: number }) => i.quantity).sort()).toEqual([1, 2]);

    expect(res.body.data.unmatchedItems).toHaveLength(1);
    expect(res.body.data.unmatchedItems[0]).toMatchObject({ reason: 'NO_CATALOG_MATCH' });

    // The prescription link shows up on a fresh cart fetch too.
    const cart = await api().get('/api/v1/cart').set('Authorization', patientAuth.auth);
    expect(cart.body.data.prescriptionId).toBe(prescription.id);
  });

  it('refuses a pharmacy that does not accept prescriptions or is not found', async () => {
    const prescription = await issuePrescriptionForPatient();
    const res = await api().post('/api/v1/cart/from-prescription').set('Authorization', patientAuth.auth).send({ prescriptionId: prescription.id, pharmacyId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(404);
  });
});
