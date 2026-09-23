-- ─────────────────────────────────────────────────────────────
-- Phase 8: prevent double-booking a doctor's slot.
-- Two patients can pass the "is this slot free?" check at the same time;
-- this partial unique index makes the database the final arbiter.
-- Cancelled appointments are excluded so a freed slot can be re-booked.
-- Partial indexes are not expressible in the Prisma schema, so this is hand-written.
-- ─────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "appointments_doctor_slot_active_key"
  ON "appointments" ("doctorId", "scheduledStart")
  WHERE "status" <> 'CANCELLED';
