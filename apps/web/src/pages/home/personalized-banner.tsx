import { Bell, FileText, Pill, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AuthUser } from '@carebridge/shared';

const GREETINGS = ['Good morning', 'Good afternoon', 'Good evening'];
function greeting() {
  const hour = new Date().getHours();
  return GREETINGS[hour < 12 ? 0 : hour < 17 ? 1 : 2];
}

const QUICK_ACTIONS = [
  { label: 'My Appointments', href: '/appointments', icon: Stethoscope },
  { label: 'My Prescriptions', href: '/prescriptions', icon: FileText },
  { label: 'Medicine Orders', href: '/orders', icon: Pill },
  { label: 'Notifications', href: '/notifications', icon: Bell },
];

export function PersonalizedBanner({ user }: { user: AuthUser }) {
  return (
    <div className="container pt-8">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-teal-600 p-6 text-white shadow-md sm:p-7">
        <p className="text-xl font-bold sm:text-2xl">
          {greeting()}, {user.firstName}
        </p>
        <p className="mt-1 text-sm text-white/80">Here's a quick look at your healthcare, all in one place.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className="flex flex-col items-center gap-2 rounded-xl bg-white/10 px-3 py-4 text-center transition-colors hover:bg-white/20"
            >
              <action.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
