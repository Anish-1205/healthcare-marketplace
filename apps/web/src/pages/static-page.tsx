import { PageHeader } from '@/components/page-header';

export type StaticPageKey = 'about' | 'contact' | 'privacy' | 'terms';

// Demo copy only — CareBridge is a prototype, so these pages say so rather than imitate real legal text.
const PAGES: Record<StaticPageKey, { title: string; paragraphs: string[] }> = {
  about: {
    title: 'About CareBridge',
    paragraphs: [
      'CareBridge brings doctors, clinics, hospitals, labs and pharmacies together in one place, so patients can book consultations, order medicines and keep their health records organised.',
      'This site is a product demonstration. Every doctor, organisation, medicine and review you see is fictional demo content.',
    ],
  },
  contact: {
    title: 'Contact',
    paragraphs: [
      'CareBridge is a demo application and does not operate a real support desk.',
      'For questions about this prototype, please reach out to the team that shared the demo with you.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    paragraphs: [
      'This demo stores only the information you enter while trying it out, such as your account, appointments and orders, in a demo database that may be reset at any time.',
      'Do not enter real medical, payment or personal information. No data is shared with third parties.',
    ],
  },
  terms: {
    title: 'Terms of Service',
    paragraphs: [
      'CareBridge is provided for demonstration purposes only and is not a medical service. Nothing on this site is medical advice.',
      'Appointments, prescriptions, payments and deliveries shown here are simulated and have no real-world effect.',
    ],
  },
};

export function StaticPage({ page }: { page: StaticPageKey }) {
  const content = PAGES[page];
  return (
    <div className="container max-w-3xl py-8">
      <PageHeader title={content.title} />
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground shadow-sm">
        {content.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
