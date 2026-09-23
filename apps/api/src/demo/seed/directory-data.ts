import type { ApprovalStatus, ConsultationType, Gender, OrganizationType } from '@prisma/client';

/** Fictional people and organizations for the demo. Any resemblance to real entities is coincidental. */

export interface PersonSeed {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  title?: string;
}

export interface OrganizationSeed {
  key: string;
  type: OrganizationType;
  name: string;
  category: string;
  locality: string;
  addressLine1: string;
  description: string;
  phone: string;
  email: string;
  opensAt: string | null;
  closesAt: string | null;
  is24Hours?: boolean;
  openDays: number[];
  distanceKm: number;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string;
  createdDaysAgo: number;
  bedCount?: number;
  emergencyAvailable?: boolean;
  pharmacy?: {
    deliveryAvailable: boolean;
    pickupAvailable: boolean;
    etaMin: number;
    etaMax: number;
    deliveryFee: number;
    freeDeliveryAbove: number;
    serviceRadiusKm: number;
    /** Share of the catalogue this pharmacy stocks (0–1). */
    catalogueCoverage: number;
  };
  services?: Array<{ name: string; specialty?: string; price: number; durationMinutes: number; description: string }>;
  admin: PersonSeed;
  staff?: PersonSeed[];
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const MON_SAT = [1, 2, 3, 4, 5, 6];

export const ORGANIZATIONS: OrganizationSeed[] = [
  // ── Clinics ──────────────────────────────────────────────
  {
    key: 'sunrise',
    type: 'CLINIC',
    name: 'Sunrise Family Clinic',
    category: 'Multi-Specialty Clinic',
    locality: 'Central District',
    addressLine1: '14, MG Link Road, Opp. Central Park',
    description:
      'A friendly neighbourhood multi-specialty clinic offering family medicine, dermatology, paediatrics and women’s health under one roof.',
    phone: '+91 80 4110 2201',
    email: 'hello@sunrise-clinic.demo',
    opensAt: '08:00',
    closesAt: '21:00',
    openDays: ALL_DAYS,
    distanceKm: 1.1,
    approvalStatus: 'APPROVED',
    createdDaysAgo: 175,
    services: [
      { name: 'General Consultation', specialty: 'general-physician', price: 500, durationMinutes: 20, description: 'Consultation for everyday health concerns.' },
      { name: 'Dermatology', specialty: 'dermatologist', price: 600, durationMinutes: 30, description: 'Skin, hair and nail consultations.' },
      { name: 'Pediatrics', specialty: 'pediatrician', price: 600, durationMinutes: 20, description: 'Child health consultations and vaccinations.' },
      { name: "Women's Health", specialty: 'gynecologist', price: 800, durationMinutes: 30, description: 'Gynaecology and antenatal consultations.' },
      { name: 'Dental Care', specialty: 'dentist', price: 350, durationMinutes: 30, description: 'Check-ups, cleaning and fillings.' },
      { name: 'Health Checkup', price: 1499, durationMinutes: 60, description: 'Annual preventive health checkup with doctor review.' },
    ],
    admin: { email: 'clinic@carebridge.demo', firstName: 'Anita', lastName: 'Desai', phone: '+91 98450 20011', title: 'Clinic Administrator' },
    staff: [
      { email: 'reception.sunrise@carebridge.demo', firstName: 'Pooja', lastName: 'Hegde', phone: '+91 98450 20012', title: 'Front Desk' },
      { email: 'nurse.sunrise@carebridge.demo', firstName: 'Mary', lastName: 'Thomas', phone: '+91 98450 20013', title: 'Staff Nurse' },
    ],
  },
  {
    key: 'greencare',
    type: 'CLINIC',
    name: 'Green Care Clinic',
    category: 'Family & Child Clinic',
    locality: 'Green Hills',
    addressLine1: '22, Hillside Avenue, Green Hills Main Road',
    description: 'Family and child care clinic known for its gentle paediatric team and same-day appointments.',
    phone: '+91 80 4110 3302',
    email: 'care@greencare-clinic.demo',
    opensAt: '09:00',
    closesAt: '20:00',
    openDays: MON_SAT,
    distanceKm: 3.2,
    approvalStatus: 'APPROVED',
    createdDaysAgo: 160,
    services: [
      { name: 'General Consultation', specialty: 'general-physician', price: 400, durationMinutes: 20, description: 'Family medicine consultation.' },
      { name: 'Pediatrics', specialty: 'pediatrician', price: 550, durationMinutes: 20, description: 'Child health and growth monitoring.' },
      { name: 'Dermatology', specialty: 'dermatologist', price: 500, durationMinutes: 20, description: 'Skin consultations.' },
      { name: 'Vaccination', price: 250, durationMinutes: 15, description: 'Child and adult vaccination service (demo).' },
    ],
    admin: { email: 'admin.greencare@carebridge.demo', firstName: 'Ramesh', lastName: 'Kulkarni', phone: '+91 98450 30011', title: 'Clinic Manager' },
    staff: [{ email: 'reception.greencare@carebridge.demo', firstName: 'Shalini', lastName: 'Rao', phone: '+91 98450 30012', title: 'Front Desk' }],
  },
  {
    key: 'cityhealth',
    type: 'CLINIC',
    name: 'City Health Clinic',
    category: 'General & Diagnostic Clinic',
    locality: 'City Centre',
    addressLine1: '5, Residency Road, Near City Mall',
    description: 'Walk-in friendly clinic in the heart of the city with extended hours and in-house diagnostics.',
    phone: '+91 80 4110 4403',
    email: 'info@cityhealth-clinic.demo',
    opensAt: '07:30',
    closesAt: '22:00',
    openDays: ALL_DAYS,
    distanceKm: 0.9,
    approvalStatus: 'APPROVED',
    createdDaysAgo: 150,
    services: [
      { name: 'General Consultation', specialty: 'general-physician', price: 450, durationMinutes: 15, description: 'Walk-in and scheduled consultations.' },
      { name: 'Dental Care', specialty: 'dentist', price: 400, durationMinutes: 30, description: 'Complete dental care.' },
      { name: 'Orthopedics', specialty: 'orthopedic', price: 700, durationMinutes: 20, description: 'Joint and bone consultations.' },
      { name: 'Health Checkup', price: 1299, durationMinutes: 45, description: 'Preventive health checkup.' },
    ],
    admin: { email: 'admin.cityhealth@carebridge.demo', firstName: 'Sanjay', lastName: 'Bhatt', phone: '+91 98450 40011', title: 'Operations Head' },
  },
  {
    key: 'wellness',
    type: 'CLINIC',
    name: 'Wellness Medical Centre',
    category: 'Multi-Specialty Clinic',
    locality: 'Lake View',
    addressLine1: '88, Lakeshore Drive, Lake View',
    description: 'Modern multi-specialty centre with dermatology, orthopaedics, eye care and mental wellness services.',
    phone: '+91 80 4110 5504',
    email: 'contact@wellness-centre.demo',
    opensAt: '08:00',
    closesAt: '20:30',
    openDays: MON_SAT,
    distanceKm: 2.4,
    approvalStatus: 'APPROVED',
    createdDaysAgo: 140,
    services: [
      { name: 'Dermatology', specialty: 'dermatologist', price: 650, durationMinutes: 30, description: 'Advanced skin care consultations.' },
      { name: 'Orthopedics', specialty: 'orthopedic', price: 900, durationMinutes: 20, description: 'Bone and joint care.' },
      { name: 'Eye Care', specialty: 'ophthalmologist', price: 650, durationMinutes: 20, description: 'Eye examinations.' },
      { name: 'Mental Wellness', specialty: 'psychiatrist', price: 900, durationMinutes: 45, description: 'Counselling and psychiatric consultations.' },
      { name: 'Physiotherapy', specialty: 'physiotherapist', price: 500, durationMinutes: 45, description: 'Rehabilitation sessions.' },
    ],
    admin: { email: 'admin.wellness@carebridge.demo', firstName: 'Nisha', lastName: 'Kapoor', phone: '+91 98450 50011', title: 'Centre Director' },
  },
  {
    key: 'riverside-skin',
    type: 'CLINIC',
    name: 'Riverside Skin & Hair Clinic',
    category: 'Dermatology Clinic',
    locality: 'Riverside',
    addressLine1: '3, Riverside Promenade',
    description: 'Specialist dermatology and hair care clinic (awaiting platform approval).',
    phone: '+91 80 4110 6605',
    email: 'hello@riverside-skin.demo',
    opensAt: '10:00',
    closesAt: '19:00',
    openDays: MON_SAT,
    distanceKm: 4.1,
    approvalStatus: 'PENDING_APPROVAL',
    createdDaysAgo: 2,
    admin: { email: 'admin.riverside@carebridge.demo', firstName: 'Kavita', lastName: 'Menon', phone: '+91 98450 60011', title: 'Owner' },
  },
  // ── Hospitals ────────────────────────────────────────────
  {
    key: 'community-hospital',
    type: 'HOSPITAL',
    name: 'Community Health Hospital',
    category: 'Multi-Specialty Hospital',
    locality: 'North Avenue',
    addressLine1: '101, North Avenue Main Road',
    description: 'A 120-bed community hospital with 24x7 emergency, maternity, cardiology and ENT departments.',
    phone: '+91 80 4220 1100',
    email: 'info@communityhealth-hospital.demo',
    opensAt: null,
    closesAt: null,
    is24Hours: true,
    openDays: ALL_DAYS,
    distanceKm: 3.7,
    approvalStatus: 'APPROVED',
    createdDaysAgo: 170,
    bedCount: 120,
    emergencyAvailable: true,
    services: [
      { name: 'Emergency Care', price: 1000, durationMinutes: 30, description: '24x7 emergency department (demo).' },
      { name: 'Cardiology', specialty: 'cardiologist', price: 1200, durationMinutes: 20, description: 'Heart care consultations.' },
      { name: 'Maternity & Gynaecology', specialty: 'gynecologist', price: 800, durationMinutes: 30, description: 'Pregnancy and women’s health.' },
      { name: 'ENT', specialty: 'ent-specialist', price: 700, durationMinutes: 20, description: 'Ear, nose and throat care.' },
      { name: 'General Medicine', specialty: 'general-physician', price: 500, durationMinutes: 15, description: 'Internal medicine consultations.' },
    ],
    admin: { email: 'hospital@carebridge.demo', firstName: 'Vikram', lastName: 'Singh', phone: '+91 98450 70011', title: 'Hospital Administrator' },
    staff: [{ email: 'desk.community@carebridge.demo', firstName: 'Rekha', lastName: 'Naidu', phone: '+91 98450 70012', title: 'Patient Services' }],
  },
  {
    key: 'metro-hospital',
    type: 'HOSPITAL',
    name: 'Metro Care Hospital',
    category: 'Super-Specialty Hospital',
    locality: 'Tech Park',
    addressLine1: '7, Outer Ring Road, Tech Park',
    description: 'A 250-bed super-specialty hospital for cardiac, neuro, orthopaedic and paediatric care.',
    phone: '+91 80 4220 2200',
    email: 'care@metrocare-hospital.demo',
    opensAt: null,
    closesAt: null,
    is24Hours: true,
    openDays: ALL_DAYS,
    distanceKm: 5.6,
    approvalStatus: 'APPROVED',
    createdDaysAgo: 165,
    bedCount: 250,
    emergencyAvailable: true,
    services: [
      { name: 'Cardiology', specialty: 'cardiologist', price: 1000, durationMinutes: 20, description: 'Cardiac consultations and diagnostics.' },
      { name: 'Neurology', specialty: 'neurologist', price: 1100, durationMinutes: 30, description: 'Neurological consultations.' },
      { name: 'Orthopedics', specialty: 'orthopedic', price: 900, durationMinutes: 20, description: 'Joint replacement and sports injury care.' },
      { name: 'Pediatrics', specialty: 'pediatrician', price: 600, durationMinutes: 20, description: 'Paediatric care.' },
      { name: 'Executive Health Checkup', price: 4999, durationMinutes: 180, description: 'Comprehensive health screening.' },
    ],
    admin: { email: 'admin.metro@carebridge.demo', firstName: 'Sunita', lastName: 'Reddy', phone: '+91 98450 80011', title: 'Medical Superintendent' },
  },
  {
    key: 'lakeside-maternity',
    type: 'HOSPITAL',
    name: 'Lakeside Maternity Hospital',
    category: 'Maternity Hospital',
    locality: 'Lake View',
    addressLine1: '41, Lake View Circle',
    description: 'Maternity and newborn care hospital (awaiting platform approval).',
    phone: '+91 80 4220 3300',
    email: 'hello@lakeside-maternity.demo',
    opensAt: null,
    closesAt: null,
    is24Hours: true,
    openDays: ALL_DAYS,
    distanceKm: 2.9,
    approvalStatus: 'PENDING_APPROVAL',
    createdDaysAgo: 4,
    bedCount: 40,
    emergencyAvailable: true,
    admin: { email: 'admin.lakeside@carebridge.demo', firstName: 'Leela', lastName: 'Fernandes', phone: '+91 98450 90011', title: 'Director' },
  },
  // ── Pharmacies ───────────────────────────────────────────
  {
    key: 'citycare',
    type: 'PHARMACY',
    name: 'City Care Pharmacy',
    category: 'Retail Pharmacy',
    locality: 'Central District',
    addressLine1: '9, MG Link Road, Central District',
    description: 'Trusted neighbourhood pharmacy with fast home delivery and prescription orders.',
    phone: '+91 80 4330 1001',
    email: 'orders@citycare-pharmacy.demo',
    opensAt: '08:00',
    closesAt: '23:00',
    openDays: ALL_DAYS,
    distanceKm: 1.2,
    approvalStatus: 'APPROVED',
    createdDaysAgo: 172,
    pharmacy: { deliveryAvailable: true, pickupAvailable: true, etaMin: 30, etaMax: 45, deliveryFee: 30, freeDeliveryAbove: 499, serviceRadiusKm: 6, catalogueCoverage: 0.92 },
    admin: { email: 'pharmacy@carebridge.demo', firstName: 'Suresh', lastName: 'Iyer', phone: '+91 98451 10011', title: 'Owner & Pharmacist' },
    staff: [{ email: 'staff.citycare@carebridge.demo', firstName: 'Naveen', lastName: 'Kumar', phone: '+91 98451 10012', title: 'Pharmacist' }],
  },
  {
    key: 'medpoint',
    type: 'PHARMACY',
    name: 'MedPoint Pharmacy',
    category: '24x7 Pharmacy',
    locality: 'City Centre',
    addressLine1: '2, Residency Road, City Centre',
    description: 'Round-the-clock pharmacy for urgent medicines, with express delivery across the city centre.',
    phone: '+91 80 4330 2002',
    email: 'help@medpoint-pharmacy.demo',
    opensAt: null,
    closesAt: null,
    is24Hours: true,
    openDays: ALL_DAYS,
    distanceKm: 0.8,
    approvalStatus: 'APPROVED',
    createdDaysAgo: 168,
    pharmacy: { deliveryAvailable: true, pickupAvailable: true, etaMin: 20, etaMax: 35, deliveryFee: 40, freeDeliveryAbove: 699, serviceRadiusKm: 8, catalogueCoverage: 0.85 },
    admin: { email: 'admin.medpoint@carebridge.demo', firstName: 'Faisal', lastName: 'Ahmed', phone: '+91 98451 20011', title: 'Store Manager' },
  },
  {
    key: 'healthfirst',
    type: 'PHARMACY',
    name: 'HealthFirst Pharmacy',
    category: 'Retail Pharmacy',
    locality: 'Lake View',
    addressLine1: '56, Lakeshore Drive, Lake View',
    description: 'Family pharmacy with wellness products, health devices and scheduled deliveries.',
    phone: '+91 80 4330 3003',
    email: 'care@healthfirst-pharmacy.demo',
    opensAt: '08:30',
    closesAt: '22:00',
    openDays: ALL_DAYS,
    distanceKm: 2.4,
    approvalStatus: 'APPROVED',
    createdDaysAgo: 155,
    pharmacy: { deliveryAvailable: true, pickupAvailable: true, etaMin: 45, etaMax: 60, deliveryFee: 35, freeDeliveryAbove: 599, serviceRadiusKm: 7, catalogueCoverage: 0.78 },
    admin: { email: 'admin.healthfirst@carebridge.demo', firstName: 'Geeta', lastName: 'Pillai', phone: '+91 98451 30011', title: 'Owner' },
  },
  {
    key: 'greencross',
    type: 'PHARMACY',
    name: 'GreenCross Pharmacy',
    category: 'Retail Pharmacy',
    locality: 'Green Hills',
    addressLine1: '12, Green Hills Market',
    description: 'Community pharmacy serving Green Hills with baby care, elder care and daily essentials.',
    phone: '+91 80 4330 4004',
    email: 'hello@greencross-pharmacy.demo',
    opensAt: '09:00',
    closesAt: '21:30',
    openDays: MON_SAT,
    distanceKm: 3.7,
    approvalStatus: 'APPROVED',
    createdDaysAgo: 120,
    pharmacy: { deliveryAvailable: true, pickupAvailable: true, etaMin: 40, etaMax: 55, deliveryFee: 30, freeDeliveryAbove: 499, serviceRadiusKm: 5, catalogueCoverage: 0.7 },
    admin: { email: 'admin.greencross@carebridge.demo', firstName: 'Joseph', lastName: 'DSouza', phone: '+91 98451 40011', title: 'Pharmacist-in-charge' },
  },
  {
    key: 'communitymeds',
    type: 'PHARMACY',
    name: 'Community Meds',
    category: 'Discount Pharmacy',
    locality: 'Riverside',
    addressLine1: '30, Riverside Main Road',
    description: 'Value pharmacy with everyday low prices. Store pickup and evening deliveries.',
    phone: '+91 80 4330 5005',
    email: 'orders@communitymeds.demo',
    opensAt: '09:00',
    closesAt: '21:00',
    openDays: ALL_DAYS,
    distanceKm: 1.9,
    approvalStatus: 'APPROVED',
    createdDaysAgo: 95,
    pharmacy: { deliveryAvailable: true, pickupAvailable: true, etaMin: 60, etaMax: 90, deliveryFee: 25, freeDeliveryAbove: 399, serviceRadiusKm: 4, catalogueCoverage: 0.6 },
    admin: { email: 'admin.communitymeds@carebridge.demo', firstName: 'Harpreet', lastName: 'Kaur', phone: '+91 98451 50011', title: 'Owner' },
  },
  {
    key: 'northstar',
    type: 'PHARMACY',
    name: 'NorthStar Pharmacy',
    category: 'Retail Pharmacy',
    locality: 'North Avenue',
    addressLine1: '64, North Avenue',
    description: 'New pharmacy on North Avenue (awaiting platform approval).',
    phone: '+91 80 4330 6006',
    email: 'hello@northstar-pharmacy.demo',
    opensAt: '08:00',
    closesAt: '22:00',
    openDays: ALL_DAYS,
    distanceKm: 3.4,
    approvalStatus: 'PENDING_APPROVAL',
    createdDaysAgo: 1,
    pharmacy: { deliveryAvailable: true, pickupAvailable: true, etaMin: 35, etaMax: 50, deliveryFee: 30, freeDeliveryAbove: 499, serviceRadiusKm: 5, catalogueCoverage: 0 },
    admin: { email: 'admin.northstar@carebridge.demo', firstName: 'Mohan', lastName: 'Das', phone: '+91 98451 60011', title: 'Owner' },
  },
  {
    key: 'quickmeds',
    type: 'PHARMACY',
    name: 'QuickMeds Express',
    category: 'Online Pharmacy',
    locality: 'Tech Park',
    addressLine1: '11, Tech Park Service Road',
    description: 'Application rejected — licence documents could not be verified.',
    phone: '+91 80 4330 7007',
    email: 'hello@quickmeds.demo',
    opensAt: '09:00',
    closesAt: '21:00',
    openDays: MON_SAT,
    distanceKm: 4.8,
    approvalStatus: 'REJECTED',
    rejectionReason: 'Drug licence document was unreadable. Please re-apply with a clear copy.',
    createdDaysAgo: 20,
    pharmacy: { deliveryAvailable: true, pickupAvailable: false, etaMin: 30, etaMax: 60, deliveryFee: 40, freeDeliveryAbove: 999, serviceRadiusKm: 10, catalogueCoverage: 0 },
    admin: { email: 'admin.quickmeds@carebridge.demo', firstName: 'Rohit', lastName: 'Jain', phone: '+91 98451 70011', title: 'Founder' },
  },
];

export interface DoctorSeed {
  key: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  specialties: string[]; // first = primary
  qualifications: string;
  experienceYears: number;
  fee: number;
  languages: string[];
  consultationTypes: ConsultationType[];
  slotDurationMinutes: number;
  bio: string;
  organizations: Array<{ key: string; primary?: boolean; fee?: number; title?: string }>;
  approvalStatus: ApprovalStatus;
  createdDaysAgo: number;
  sundayHours?: boolean;
}

const ALL_TYPES: ConsultationType[] = ['IN_PERSON', 'VIDEO', 'PHONE'];

export const DOCTORS: DoctorSeed[] = [
  {
    key: 'maya-rao', email: 'doctor@carebridge.demo', firstName: 'Maya', lastName: 'Rao', gender: 'FEMALE',
    specialties: ['dermatologist'], qualifications: 'MBBS, MD (Dermatology)', experienceYears: 12, fee: 600,
    languages: ['English', 'Hindi', 'Kannada'], consultationTypes: ALL_TYPES, slotDurationMinutes: 30,
    bio: 'Dr. Maya Rao is a consultant dermatologist with 12 years of experience in clinical and cosmetic dermatology. She has a special interest in acne, eczema, pigmentation and hair-fall management, and believes in explaining every treatment plan clearly to her patients.',
    organizations: [{ key: 'sunrise', primary: true, title: 'Consultant Dermatologist' }, { key: 'wellness', fee: 650, title: 'Visiting Dermatologist' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 170, sundayHours: true,
  },
  {
    key: 'arjun-mehta', email: 'arjun.mehta@carebridge.demo', firstName: 'Arjun', lastName: 'Mehta', gender: 'MALE',
    specialties: ['general-physician'], qualifications: 'MBBS, MD (Internal Medicine)', experienceYears: 10, fee: 500,
    languages: ['English', 'Hindi', 'Gujarati'], consultationTypes: ALL_TYPES, slotDurationMinutes: 20,
    bio: 'Dr. Arjun Mehta is an internal medicine specialist focused on preventive care, diabetes, hypertension and seasonal infections. He is known for thorough yet practical consultations.',
    organizations: [{ key: 'sunrise', primary: true, title: 'Consultant Physician' }, { key: 'cityhealth', fee: 450, title: 'Visiting Physician' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 168, sundayHours: true,
  },
  {
    key: 'neha-sharma', email: 'neha.sharma@carebridge.demo', firstName: 'Neha', lastName: 'Sharma', gender: 'FEMALE',
    specialties: ['pediatrician'], qualifications: 'MBBS, MD (Pediatrics)', experienceYears: 9, fee: 550,
    languages: ['English', 'Hindi'], consultationTypes: ALL_TYPES, slotDurationMinutes: 20,
    bio: 'Dr. Neha Sharma is a paediatrician who cares for newborns through teenagers, with a focus on growth, nutrition, vaccinations and common childhood illnesses.',
    organizations: [{ key: 'greencare', primary: true, title: 'Senior Pediatrician' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 158,
  },
  {
    key: 'karan-patel', email: 'karan.patel@carebridge.demo', firstName: 'Karan', lastName: 'Patel', gender: 'MALE',
    specialties: ['cardiologist'], qualifications: 'MBBS, MD, DM (Cardiology)', experienceYears: 15, fee: 1000,
    languages: ['English', 'Hindi', 'Gujarati'], consultationTypes: ['IN_PERSON', 'VIDEO'], slotDurationMinutes: 20,
    bio: 'Dr. Karan Patel is an interventional cardiologist with 15 years of experience managing coronary artery disease, heart failure and hypertension.',
    organizations: [{ key: 'metro-hospital', primary: true, title: 'Senior Consultant, Cardiology' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 162,
  },
  {
    key: 'priya-nair', email: 'priya.nair@carebridge.demo', firstName: 'Priya', lastName: 'Nair', gender: 'FEMALE',
    specialties: ['gynecologist'], qualifications: 'MBBS, MS (Obstetrics & Gynaecology)', experienceYears: 11, fee: 800,
    languages: ['English', 'Malayalam', 'Hindi'], consultationTypes: ALL_TYPES, slotDurationMinutes: 30,
    bio: 'Dr. Priya Nair is an obstetrician and gynaecologist who supports women through adolescence, pregnancy and menopause with compassionate, evidence-based care.',
    organizations: [{ key: 'community-hospital', primary: true, title: 'Consultant, Obstetrics & Gynaecology' }, { key: 'sunrise', title: 'Visiting Gynaecologist' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 160,
  },
  {
    key: 'rohan-kapoor', email: 'rohan.kapoor@carebridge.demo', firstName: 'Rohan', lastName: 'Kapoor', gender: 'MALE',
    specialties: ['orthopedic'], qualifications: 'MBBS, MS (Orthopaedics)', experienceYears: 14, fee: 900,
    languages: ['English', 'Hindi', 'Punjabi'], consultationTypes: ['IN_PERSON', 'VIDEO'], slotDurationMinutes: 20,
    bio: 'Dr. Rohan Kapoor is an orthopaedic surgeon specialising in sports injuries, knee and shoulder problems, and chronic back pain.',
    organizations: [{ key: 'metro-hospital', primary: true, title: 'Consultant Orthopaedic Surgeon' }, { key: 'wellness', title: 'Visiting Orthopaedician' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 155,
  },
  {
    key: 'sneha-kulkarni', email: 'sneha.kulkarni@carebridge.demo', firstName: 'Sneha', lastName: 'Kulkarni', gender: 'FEMALE',
    specialties: ['dentist'], qualifications: 'BDS, MDS (Conservative Dentistry)', experienceYears: 8, fee: 400,
    languages: ['English', 'Marathi', 'Kannada'], consultationTypes: ['IN_PERSON'], slotDurationMinutes: 30,
    bio: 'Dr. Sneha Kulkarni offers painless dental treatments, root canal therapy and preventive dental care for all ages.',
    organizations: [{ key: 'cityhealth', primary: true, title: 'Dental Surgeon' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 148, sundayHours: true,
  },
  {
    key: 'vivek-menon', email: 'vivek.menon@carebridge.demo', firstName: 'Vivek', lastName: 'Menon', gender: 'MALE',
    specialties: ['ent-specialist'], qualifications: 'MBBS, MS (ENT)', experienceYears: 13, fee: 700,
    languages: ['English', 'Malayalam', 'Tamil'], consultationTypes: ['IN_PERSON', 'VIDEO'], slotDurationMinutes: 20,
    bio: 'Dr. Vivek Menon treats sinus problems, hearing concerns, tonsillitis and voice disorders, with experience in endoscopic ENT procedures.',
    organizations: [{ key: 'community-hospital', primary: true, title: 'Consultant, ENT' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 150,
  },
  {
    key: 'ananya-iyer', email: 'ananya.iyer@carebridge.demo', firstName: 'Ananya', lastName: 'Iyer', gender: 'FEMALE',
    specialties: ['ophthalmologist'], qualifications: 'MBBS, MS (Ophthalmology)', experienceYears: 7, fee: 650,
    languages: ['English', 'Tamil', 'Kannada'], consultationTypes: ['IN_PERSON', 'VIDEO'], slotDurationMinutes: 20,
    bio: 'Dr. Ananya Iyer provides comprehensive eye examinations, dry-eye management and paediatric eye care.',
    organizations: [{ key: 'wellness', primary: true, title: 'Consultant Ophthalmologist' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 138,
  },
  {
    key: 'siddharth-joshi', email: 'siddharth.joshi@carebridge.demo', firstName: 'Siddharth', lastName: 'Joshi', gender: 'MALE',
    specialties: ['physiotherapist'], qualifications: 'BPT, MPT (Musculoskeletal)', experienceYears: 6, fee: 450,
    languages: ['English', 'Hindi', 'Marathi'], consultationTypes: ['VIDEO', 'PHONE'], slotDurationMinutes: 30,
    bio: 'Siddharth Joshi is an independent physiotherapist offering guided online rehabilitation for back pain, posture and post-injury recovery.',
    organizations: [],
    approvalStatus: 'APPROVED', createdDaysAgo: 130,
  },
  {
    key: 'farah-khan', email: 'farah.khan@carebridge.demo', firstName: 'Farah', lastName: 'Khan', gender: 'FEMALE',
    specialties: ['dermatologist'], qualifications: 'MBBS, DDVL', experienceYears: 6, fee: 500,
    languages: ['English', 'Hindi', 'Urdu'], consultationTypes: ALL_TYPES, slotDurationMinutes: 20,
    bio: 'Dr. Farah Khan is a dermatologist with an interest in paediatric dermatology, fungal infections and skin allergies.',
    organizations: [{ key: 'greencare', primary: true, title: 'Dermatologist' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 125,
  },
  {
    key: 'nikhil-bhat', email: 'nikhil.bhat@carebridge.demo', firstName: 'Nikhil', lastName: 'Bhat', gender: 'MALE',
    specialties: ['general-physician'], qualifications: 'MBBS', experienceYears: 5, fee: 350,
    languages: ['English', 'Kannada', 'Konkani'], consultationTypes: ['VIDEO', 'PHONE'], slotDurationMinutes: 15,
    bio: 'Dr. Nikhil Bhat is a freelance general physician offering quick online consultations for common illnesses and follow-ups.',
    organizations: [],
    approvalStatus: 'APPROVED', createdDaysAgo: 110, sundayHours: true,
  },
  {
    key: 'kavya-reddy', email: 'kavya.reddy@carebridge.demo', firstName: 'Kavya', lastName: 'Reddy', gender: 'FEMALE',
    specialties: ['pediatrician'], qualifications: 'MBBS, DCH', experienceYears: 12, fee: 600,
    languages: ['English', 'Telugu', 'Kannada'], consultationTypes: ALL_TYPES, slotDurationMinutes: 20,
    bio: 'Dr. Kavya Reddy is a paediatrician with extensive experience in newborn care, childhood asthma and developmental assessments.',
    organizations: [{ key: 'metro-hospital', primary: true, title: 'Consultant Pediatrician' }, { key: 'sunrise', title: 'Visiting Pediatrician' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 145,
  },
  {
    key: 'imran-siddiqui', email: 'imran.siddiqui@carebridge.demo', firstName: 'Imran', lastName: 'Siddiqui', gender: 'MALE',
    specialties: ['cardiologist'], qualifications: 'MBBS, MD, DM (Cardiology)', experienceYears: 18, fee: 1200,
    languages: ['English', 'Hindi', 'Urdu'], consultationTypes: ['IN_PERSON', 'VIDEO'], slotDurationMinutes: 20,
    bio: 'Dr. Imran Siddiqui is a senior cardiologist focused on preventive cardiology, heart rhythm disorders and cardiac rehabilitation.',
    organizations: [{ key: 'community-hospital', primary: true, title: 'Head of Cardiology' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 165,
  },
  {
    key: 'meera-pillai', email: 'meera.pillai@carebridge.demo', firstName: 'Meera', lastName: 'Pillai', gender: 'FEMALE',
    specialties: ['gynecologist'], qualifications: 'MBBS, DGO', experienceYears: 16, fee: 750,
    languages: ['English', 'Malayalam', 'Tamil'], consultationTypes: ALL_TYPES, slotDurationMinutes: 30,
    bio: 'Dr. Meera Pillai has 16 years of experience in gynaecology, fertility counselling and menopause care.',
    organizations: [{ key: 'wellness', primary: true, title: 'Consultant Gynaecologist' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 135,
  },
  {
    key: 'harish-gowda', email: 'harish.gowda@carebridge.demo', firstName: 'Harish', lastName: 'Gowda', gender: 'MALE',
    specialties: ['orthopedic', 'physiotherapist'], qualifications: 'MBBS, D.Ortho', experienceYears: 9, fee: 700,
    languages: ['English', 'Kannada'], consultationTypes: ['IN_PERSON', 'PHONE'], slotDurationMinutes: 20,
    bio: 'Dr. Harish Gowda treats fractures, arthritis and work-related musculoskeletal pain, with a strong focus on rehabilitation.',
    organizations: [{ key: 'cityhealth', primary: true, title: 'Orthopaedician' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 120,
  },
  {
    key: 'lakshmi-narayan', email: 'lakshmi.narayan@carebridge.demo', firstName: 'Lakshmi', lastName: 'Narayan', gender: 'FEMALE',
    specialties: ['neurologist'], qualifications: 'MBBS, MD, DM (Neurology)', experienceYears: 20, fee: 1100,
    languages: ['English', 'Tamil', 'Kannada'], consultationTypes: ['IN_PERSON', 'VIDEO'], slotDurationMinutes: 30,
    bio: 'Dr. Lakshmi Narayan is a senior neurologist with two decades of experience in migraine, epilepsy and stroke care.',
    organizations: [{ key: 'metro-hospital', primary: true, title: 'Head of Neurology' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 160,
  },
  {
    key: 'tanvi-shah', email: 'tanvi.shah@carebridge.demo', firstName: 'Tanvi', lastName: 'Shah', gender: 'FEMALE',
    specialties: ['psychiatrist'], qualifications: 'MBBS, MD (Psychiatry)', experienceYears: 8, fee: 900,
    languages: ['English', 'Hindi', 'Gujarati'], consultationTypes: ALL_TYPES, slotDurationMinutes: 45,
    bio: 'Dr. Tanvi Shah is a psychiatrist supporting patients with stress, anxiety, sleep difficulties and mood concerns, in person and online.',
    organizations: [{ key: 'wellness', primary: true, title: 'Consultant Psychiatrist' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 100,
  },
  {
    key: 'deepak-chauhan', email: 'deepak.chauhan@carebridge.demo', firstName: 'Deepak', lastName: 'Chauhan', gender: 'MALE',
    specialties: ['general-physician'], qualifications: 'MBBS, PGDFM', experienceYears: 22, fee: 400,
    languages: ['English', 'Hindi'], consultationTypes: ALL_TYPES, slotDurationMinutes: 15,
    bio: 'Dr. Deepak Chauhan is a family physician with over two decades of experience caring for patients of all ages.',
    organizations: [{ key: 'community-hospital', primary: true, title: 'Consultant, General Medicine' }, { key: 'greencare', fee: 400, title: 'Family Physician' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 166, sundayHours: true,
  },
  {
    key: 'pooja-bansal', email: 'pooja.bansal@carebridge.demo', firstName: 'Pooja', lastName: 'Bansal', gender: 'FEMALE',
    specialties: ['dentist'], qualifications: 'BDS', experienceYears: 5, fee: 350,
    languages: ['English', 'Hindi', 'Punjabi'], consultationTypes: ['IN_PERSON'], slotDurationMinutes: 30,
    bio: 'Dr. Pooja Bansal provides routine dental check-ups, cleaning, whitening and fillings in a relaxed setting.',
    organizations: [{ key: 'sunrise', primary: true, title: 'Dental Surgeon' }],
    approvalStatus: 'APPROVED', createdDaysAgo: 90,
  },
  // Pending approval — appear in the admin approvals queue
  {
    key: 'aman-gupta', email: 'aman.gupta@carebridge.demo', firstName: 'Aman', lastName: 'Gupta', gender: 'MALE',
    specialties: ['ent-specialist'], qualifications: 'MBBS, DLO', experienceYears: 7, fee: 600,
    languages: ['English', 'Hindi'], consultationTypes: ['VIDEO', 'PHONE'], slotDurationMinutes: 20,
    bio: 'Independent ENT specialist applying to offer online consultations.',
    organizations: [],
    approvalStatus: 'PENDING_APPROVAL', createdDaysAgo: 1,
  },
  {
    key: 'ritu-malhotra', email: 'ritu.malhotra@carebridge.demo', firstName: 'Ritu', lastName: 'Malhotra', gender: 'FEMALE',
    specialties: ['physiotherapist'], qualifications: 'BPT', experienceYears: 4, fee: 400,
    languages: ['English', 'Hindi'], consultationTypes: ['VIDEO'], slotDurationMinutes: 30,
    bio: 'Freelance physiotherapist applying to offer online rehabilitation sessions.',
    organizations: [],
    approvalStatus: 'PENDING_APPROVAL', createdDaysAgo: 3,
  },
];

export interface PatientSeed {
  email: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dob: string;
  bloodGroup: string;
  locality: string;
  createdDaysAgo: number;
}

export const GOLDEN_PATIENT: PatientSeed = {
  email: 'patient@carebridge.demo',
  firstName: 'Rahul',
  lastName: 'Verma',
  gender: 'MALE',
  dob: '1991-06-14',
  bloodGroup: 'B+',
  locality: 'Central District',
  createdDaysAgo: 150,
};

const OTHER_PATIENTS: Array<[string, string, Gender, string, string]> = [
  ['Aisha', 'Khan', 'FEMALE', '1994-02-11', 'O+'],
  ['Vikas', 'Nair', 'MALE', '1987-09-23', 'A+'],
  ['Sneha', 'Patil', 'FEMALE', '1998-12-05', 'B+'],
  ['Rajesh', 'Kumar', 'MALE', '1972-04-17', 'O-'],
  ['Divya', 'Srinivasan', 'FEMALE', '1990-07-29', 'AB+'],
  ['Arnav', 'Gupta', 'MALE', '2016-03-08', 'A+'],
  ['Meenakshi', 'Iyer', 'FEMALE', '1956-11-02', 'B-'],
  ['Kunal', 'Shah', 'MALE', '1993-01-19', 'O+'],
  ['Fatima', 'Sheikh', 'FEMALE', '1989-05-24', 'A-'],
  ['Suresh', 'Reddy', 'MALE', '1968-08-30', 'B+'],
  ['Ishita', 'Banerjee', 'FEMALE', '1996-10-14', 'O+'],
  ['Mohit', 'Agarwal', 'MALE', '1985-06-06', 'AB-'],
  ['Lakshmi', 'Menon', 'FEMALE', '1979-03-27', 'A+'],
  ['Arjun', 'Rao', 'MALE', '2012-09-15', 'O+'],
  ['Neelam', 'Joshi', 'FEMALE', '1962-12-21', 'B+'],
  ['Sameer', 'Qureshi', 'MALE', '1991-04-03', 'A+'],
  ['Priyanka', 'Das', 'FEMALE', '1997-08-09', 'O-'],
  ['Gaurav', 'Malhotra', 'MALE', '1983-02-28', 'B+'],
  ['Anjali', 'Pandey', 'FEMALE', '1992-11-11', 'AB+'],
  ['Harsh', 'Vardhan', 'MALE', '2001-07-01', 'O+'],
  ['Kavitha', 'Ramesh', 'FEMALE', '1975-05-16', 'A+'],
  ['Tarun', 'Bose', 'MALE', '1988-10-25', 'B-'],
  ['Nandini', 'Hegde', 'FEMALE', '2010-01-30', 'O+'],
  ['Imtiaz', 'Ali', 'MALE', '1966-06-12', 'A-'],
  ['Pallavi', 'Kulkarni', 'FEMALE', '1995-09-07', 'B+'],
  ['Rohit', 'Saxena', 'MALE', '1990-12-18', 'O+'],
  ['Shreya', 'Chatterjee', 'FEMALE', '1999-04-22', 'A+'],
  ['Manoj', 'Tiwari', 'MALE', '1970-02-14', 'AB+'],
  ['Deepa', 'Krishnan', 'FEMALE', '1986-08-19', 'O+'],
  ['Aditya', 'Sinha', 'MALE', '1994-03-05', 'B+'],
  ['Zoya', 'Mirza', 'FEMALE', '2003-06-27', 'A+'],
];

const PATIENT_LOCALITIES = ['Central District', 'Lake View', 'Green Hills', 'City Centre', 'North Avenue', 'Tech Park', 'Riverside'];

export const OTHER_PATIENT_SEEDS: PatientSeed[] = OTHER_PATIENTS.map(([firstName, lastName, gender, dob, bloodGroup], index) => ({
  email: `${firstName}.${lastName}`.toLowerCase() + '@patients.carebridge.demo',
  firstName,
  lastName,
  gender,
  dob,
  bloodGroup,
  locality: PATIENT_LOCALITIES[index % PATIENT_LOCALITIES.length],
  // Spread registrations over ~6 months for the registrations chart.
  createdDaysAgo: Math.max(1, 178 - index * 5 - (index % 3)),
}));

export const PLATFORM_STAFF: Array<PersonSeed & { role: 'PLATFORM_EMPLOYEE' | 'PLATFORM_ADMIN' | 'SUPER_ADMIN'; department: string; code: string }> = [
  { email: 'superadmin@carebridge.demo', firstName: 'Neeraj', lastName: 'Kohli', phone: '+91 98800 00001', title: 'Chief Technology Officer', role: 'SUPER_ADMIN', department: 'Technology', code: 'CB-0001' },
  { email: 'admin@carebridge.demo', firstName: 'Arvind', lastName: 'Rao', phone: '+91 98800 00002', title: 'Head of Marketplace Operations', role: 'PLATFORM_ADMIN', department: 'Operations', code: 'CB-0002' },
  { email: 'employee@carebridge.demo', firstName: 'Divya', lastName: 'Menon', phone: '+91 98800 00003', title: 'Provider Onboarding Specialist', role: 'PLATFORM_EMPLOYEE', department: 'Operations', code: 'CB-0014' },
  { email: 'support.kiran@carebridge.demo', firstName: 'Kiran', lastName: 'Shetty', phone: '+91 98800 00004', title: 'Customer Support Lead', role: 'PLATFORM_EMPLOYEE', department: 'Support', code: 'CB-0021' },
  { email: 'quality.farhan@carebridge.demo', firstName: 'Farhan', lastName: 'Ali', phone: '+91 98800 00005', title: 'Quality & Compliance Analyst', role: 'PLATFORM_EMPLOYEE', department: 'Compliance', code: 'CB-0027' },
];
