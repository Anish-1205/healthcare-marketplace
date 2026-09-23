import { ClipboardList, Home, Pill, Stethoscope, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Doctors', href: '/doctors', icon: Stethoscope },
  { label: 'Medicines', href: '/medicines', icon: Pill },
  { label: 'Orders', href: '/orders', icon: ClipboardList },
  { label: 'Profile', href: '/profile', icon: User },
];

export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden">
      {ITEMS.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === '/'}
          className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
