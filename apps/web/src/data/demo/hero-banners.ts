/**
 * Frontend-only marketing content (Category B demo data per the demo data strategy).
 * Never used for real business records — those come from the API.
 */
export interface HeroBanner {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  gradient: string;
}

export const HERO_BANNERS: HeroBanner[] = [
  {
    id: 'services',
    eyebrow: 'CareBridge',
    title: 'Healthcare, Delivered Around You',
    subtitle: 'Doctors, medicines and trusted healthcare providers in one place.',
    ctaLabel: 'Explore Services',
    ctaHref: '/doctors',
    gradient: 'from-teal-700 via-teal-600 to-emerald-600',
  },
  {
    id: 'medicines',
    eyebrow: 'Pharmacy',
    title: 'Medicines Delivered to Your Door',
    subtitle: 'Upload your prescription or order medicines from your preferred pharmacy.',
    ctaLabel: 'Buy Medicines',
    ctaHref: '/medicines',
    gradient: 'from-emerald-700 via-emerald-600 to-teal-500',
  },
  {
    id: 'appointments',
    eyebrow: 'Appointments',
    title: 'Book a Doctor in Minutes',
    subtitle: 'Choose your doctor, consultation type and available appointment.',
    ctaLabel: 'Find Doctors',
    ctaHref: '/doctors',
    gradient: 'from-sky-700 via-teal-700 to-teal-600',
  },
  {
    id: 'choice',
    eyebrow: 'Your Care, Your Way',
    title: 'Your Healthcare. Your Choice.',
    subtitle: 'Choose the doctor, clinic and pharmacy that works best for you.',
    ctaLabel: 'Get Started',
    ctaHref: '/register',
    gradient: 'from-teal-800 via-cyan-700 to-emerald-600',
  },
];
