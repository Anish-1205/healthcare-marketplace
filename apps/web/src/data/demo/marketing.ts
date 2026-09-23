import { Award, Clock, ShieldCheck, Users } from 'lucide-react';

export const PRIMARY_SERVICES = [
  {
    id: 'medicines',
    title: 'Buy Medicines',
    subtitle: 'FROM YOUR PREFERRED PHARMACY',
    icon: 'pill' as const,
    surface: 'mint' as const,
    href: '/medicines',
  },
  {
    id: 'doctors',
    title: 'Doctor Appointment',
    subtitle: 'BOOK ONLINE OR IN-PERSON',
    icon: 'stethoscope' as const,
    surface: 'cream' as const,
    href: '/doctors',
  },
  {
    id: 'clinics',
    title: 'Clinics & Hospitals',
    subtitle: 'FIND CARE NEAR YOU',
    icon: 'hospital' as const,
    surface: 'lavender' as const,
    href: '/clinics',
  },
  {
    id: 'labs',
    title: 'Lab Tests',
    subtitle: 'BOOK TESTS AT HOME',
    icon: 'microscope' as const,
    surface: 'blush' as const,
    href: '/lab-tests',
  },
];

export const WHY_CAREBRIDGE = [
  { icon: Users, title: 'Verified Providers', description: 'Every doctor, clinic and pharmacy is reviewed before joining CareBridge.' },
  { icon: Clock, title: 'Fast & Convenient', description: 'Book a consultation or order medicines in minutes, from anywhere.' },
  { icon: ShieldCheck, title: 'Your Data, Protected', description: 'Health records and prescriptions stay private and secure.' },
  { icon: Award, title: 'Quality You Can Trust', description: 'Real patient reviews help you choose the right care every time.' },
];

export const FOOTER_LINKS = {
  'For Patients': [
    { label: 'Find Doctors', href: '/doctors' },
    { label: 'Buy Medicines', href: '/medicines' },
    { label: 'Lab Tests', href: '/lab-tests' },
    { label: 'Health Records', href: '/health-records' },
  ],
  'For Doctors': [
    { label: 'Join as a Doctor', href: '/register/provider?type=doctor' },
    { label: 'Doctor Login', href: '/login' },
  ],
  'For Pharmacies': [
    { label: 'Partner with Us', href: '/register/provider?type=pharmacy' },
    { label: 'Pharmacy Login', href: '/login' },
  ],
  'For Healthcare Providers': [
    { label: 'Register Your Clinic', href: '/register/provider?type=clinic' },
    { label: 'Register Your Hospital', href: '/register/provider?type=hospital' },
  ],
  Company: [
    { label: 'About CareBridge', href: '/' },
    { label: 'Contact', href: '/' },
  ],
  Help: [
    { label: 'Privacy Policy', href: '/' },
    { label: 'Terms of Service', href: '/' },
  ],
};
