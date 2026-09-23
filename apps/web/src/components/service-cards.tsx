import { Hospital, Microscope, Pill, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PRIMARY_SERVICES } from '@/data/demo/marketing';
import { cn } from '@/lib/utils';

const ICONS = { pill: Pill, stethoscope: Stethoscope, hospital: Hospital, microscope: Microscope };
const SURFACE_CLASS: Record<string, string> = {
  mint: 'bg-mint text-mint-foreground',
  cream: 'bg-cream text-cream-foreground',
  lavender: 'bg-lavender text-lavender-foreground',
  blush: 'bg-blush text-blush-foreground',
};

export function ServiceCards() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {PRIMARY_SERVICES.map((service) => {
        const Icon = ICONS[service.icon];
        return (
          <Link
            key={service.id}
            to={service.href}
            className={cn('group flex flex-col gap-4 rounded-2xl p-6 shadow-sm transition-transform hover:-translate-y-1', SURFACE_CLASS[service.surface])}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/70 shadow-sm">
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-bold">{service.title}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-70">{service.subtitle}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
