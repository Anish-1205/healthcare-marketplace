# Client demo guide

Run the setup in [README](../README.md), open `http://localhost:5173`, and keep `DEMO_MODE=true`. Use `pnpm db:seed:ready` before a live walkthrough; it replaces demo records and signs out old sessions. Every seeded account below uses `Demo@123`. Open another browser profile/private window when switching roles so the patient session stays available. Numbers such as `RX-<year>-00125` and `ORD-<year>-0042` are guaranteed only immediately after an untouched ready seed. All medical text, payments, documents, lab reports, and delivery are demo data.

## Demo 1 — Patient → doctor → prescription → pharmacy → delivery

| Account and screen | Click or enter | Expected result |
|---|---|
| Patient `patient@carebridge.demo`, `/doctors` | Search for Maya; open **Dr. Maya Rao**. Pick an available future time on her profile and click **Continue**. | Booking confirmation shows the chosen slot at Sunrise Family Clinic. The reserved 5:30 PM slot is usable only before it passes; otherwise choose another available slot. |
| Patient, booking screen | Enter reason `Itchy red patches on both forearms`; keep **UPI** and click **Pay … & confirm**. | Appointment detail shows **Confirmed**, a simulated **PAID** payment and an appointment number. Record that number. |
| Doctor `doctor@carebridge.demo`, `/doctor/appointments` | Open that appointment and click **Start consultation**. | Consultation workspace opens for Rahul Verma. |
| Doctor, consultation | Type chief complaint, observations and diagnosis (`Contact dermatitis (demo)`); click **Save notes**. Click **Add medicine**, search/select `Demo Hydrocortisone Cream`, fill dosage, frequency and duration, then **Add to prescription**. | Notes save; a draft prescription appears. The doctor chooses all clinical text manually. |
| Doctor, consultation | Click **Complete consultation**, then **Yes, complete**. | Appointment is completed, notes lock, and the draft prescription is issued to the patient. |
| Patient, `/prescriptions` | Open the new prescription, click **Order Medicines**, choose **City Care Pharmacy**, then **Proceed to Checkout**. | Cart contains the prescribed medicine from City Care; checkout shows actual stock/pricing and a simulated payment. |
| Patient, `/checkout` | Select **Home delivery**, enter an address or choose a saved one, keep **UPI**, click **Place Order**. | Order detail shows the new number, paid demo transaction, and tracking timeline. Record the order number. |
| Pharmacy `pharmacy@carebridge.demo`, `/pharmacy/orders` | Open that order. Click **Review prescription**, **Confirm stock & pricing**, **Preparing medicines**, **Ready for pickup**, **Assign demo delivery agent**, **Mark Picked up**, **Mark On the way**, then **Mark Delivered**. | Each allowed action advances the order/delivery history. The patient can refresh the order detail after each step and see the new timestamped status. |
| Platform Admin `admin@carebridge.demo`, `/admin/appointments` and `/admin/orders` | Search for the recorded appointment/order numbers. | Both completed transactions are visible to platform operations. |

The browser test `apps/web/e2e/golden-flow.spec.ts` exercises this path at desktop and 390px mobile widths. To show the finished state without clicking through, run `pnpm db:seed:complete` and sign in again; this creates a completed version of the chain.

## Demo 2 — Provider registration → admin approval

**Current boundary:** registration and approval work. Pharmacy profile editing, delivery settings and inventory entry are not implemented, so the final three steps of Scenario 2 in the master prompt cannot yet be presented. Use seeded City Care Pharmacy for the order-fulfillment demonstration.

| Account and screen | Click or enter | Expected result |
|---|---|
| No account, `/register/provider` | Click **Pharmacy**. Fill owner name, a new unique email, phone, a chosen strong password, business name/contact/registration number, address and PIN. Optionally enter `registration-certificate.pdf` in **Mock registration document**. Click **Submit for approval**. | The owner signs in automatically to the pharmacy portal. Their organization is **Pending approval** and is absent from public pharmacy results. The document is metadata; no PDF is uploaded. |
| Platform Employee `employee@carebridge.demo`, `/admin/approvals` | Find the submitted pharmacy name, inspect the listed document metadata, click **Approve**. | The entry leaves the approval queue and the pharmacy becomes eligible for public discovery. **Reject** instead requires a reason. |
| New pharmacy owner, `/pharmacy/orders` and public `/pharmacies` | Refresh or sign in again with the newly chosen credentials; locate the pharmacy in the public listing. | The pending-approval message disappears and the pharmacy has a public profile. New pharmacies have no inventory or orders; self-service inventory configuration is not yet available. |

Use a fresh email and registration number on each run, or reseed the demo first. A newly registered provider uses its chosen password; `Demo@123` applies only if that is what you entered.

## Demo 3 — Clinic management

| Account and screen | Click or enter | Expected result |
|---|---|
| Clinic Admin `clinic@carebridge.demo`, `/organization` | Sign in with **Clinic Demo**. | Sunrise Family Clinic dashboard shows today's appointments, doctors, patients, completed visits, revenue and availability. |
| Clinic Admin, **Doctors** | Click **Add doctor**. The form offers **Associate doctor** by an existing doctor's email, role/title and optional fee. | An associated doctor appears in this clinic's roster. Existing doctors can be activated/deactivated or have clinic fees edited. |
| Clinic Admin, **Services** | Click **Add service**, enter a unique service name (for example `Demo physiotherapy`) and price, then **Add service**. | The service appears in the list and can be hidden/activated. |
| Clinic Admin, **Staff** and **Schedules** | **Add staff** opens the member form; **Schedules** lets you select a doctor, choose days/hours and **Save schedule**. | Changes apply to Sunrise's membership and available slots, subject to validation. |
| Clinic Admin, **Organization Profile** and **Reports** | Edit a public field and click **Save profile**; open **Reports**. | A saved confirmation appears; reports show organization activity for the selected date range. |

These clicks update the database. Reseed with `pnpm db:seed:ready` to restore the starting presentation. A clinic staff account can view operations and act on appointments but cannot manage doctors, staff, services or schedules.
