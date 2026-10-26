import { useState } from 'react';
import { Bell, ClipboardList, FlaskConical, Menu, Pill, ShoppingCart, Stethoscope, User, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from '@/components/global-search';
import { Logo } from '@/components/logo';
import { useCurrentUser } from '@/hooks/use-auth';
import { UserMenu } from './user-menu';
import { useCartCount } from '@/hooks/use-cart';
import { useUnreadNotificationCount } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Buy Medicines', href: '/medicines', icon: Pill },
  { label: 'Find Doctors', href: '/doctors', icon: Stethoscope },
  { label: 'Clinics & Hospitals', href: '/clinics', icon: ClipboardList },
  { label: 'Lab Tests', href: '/lab-tests', icon: FlaskConical },
];

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <NavLink
      to={href}
      className={({ isActive }) =>
        cn('nav-underline rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-primary', isActive && 'is-active text-primary')
      }
    >
      {label}
    </NavLink>
  );
}

export function Header() {
  const user = useCurrentUser();
  const cartCount = useCartCount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="container flex h-16 items-center gap-1 sm:gap-4">
        <button className="rounded-lg p-2 interactive-pill lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <Logo className="shrink-0" />

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <NavItem key={link.href} {...link} />
          ))}
        </nav>

        <div className="hidden flex-1 max-w-xs xl:block" />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button className="rounded-full p-2 text-muted-foreground interactive-pill md:hidden" aria-label="Search" onClick={() => setMobileSearchOpen(true)}>
            <SearchIcon />
          </button>

          {user && <NotificationBell />}

          <HeaderIconLink href="/cart" icon={ShoppingCart} badge={cartCount} label="Cart" />

          <ProfileMenu />
        </div>
      </div>

      <div className="hidden border-t border-border/60 bg-muted/30 px-4 py-3 md:block">
        <div className="container">
          <GlobalSearch />
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t border-border bg-white p-3 md:hidden">
          <div className="flex items-center gap-2">
            <GlobalSearch className="flex-1" autoFocus onNavigate={() => setMobileSearchOpen(false)} />
            <button onClick={() => setMobileSearchOpen(false)} className="rounded-full p-2 interactive-pill" aria-label="Close search">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {mobileOpen && <MobileNav onClose={() => setMobileOpen(false)} />}
    </header>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HeaderIconLink({ href, icon: Icon, badge, label }: { href: string; icon: typeof ShoppingCart; badge?: number; label: string }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(href)} className="relative rounded-full p-2.5 text-foreground/80 interactive-pill" aria-label={label}>
      <Icon className="h-5 w-5" />
      {!!badge && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

function NotificationBell() {
  const { data } = useUnreadNotificationCount();
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate('/notifications')} className="relative rounded-full p-2.5 text-foreground/80 interactive-pill" aria-label="Notifications">
      <Bell className="h-5 w-5" />
      {!!data?.count && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {data.count > 9 ? '9+' : data.count}
        </span>
      )}
    </button>
  );
}

const PATIENT_LINKS = [
  { label: 'My Profile', href: '/profile', icon: User },
  { label: 'My Appointments', href: '/appointments', icon: Stethoscope },
  { label: 'My Orders', href: '/orders', icon: ClipboardList },
];

function ProfileMenu() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  if (!user) {
    return (
      <Button size="sm" onClick={() => navigate('/login')} className="ml-1">
        Login
      </Button>
    );
  }
  return <UserMenu links={PATIENT_LINKS} />;
}

function MobileNav({ onClose }: { onClose: () => void }) {
  const user = useCurrentUser();
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-72 bg-white p-5 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <button onClick={onClose} className="rounded-full p-2 interactive-pill" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        {user && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-accent p-3">
            <Avatar firstName={user.firstName} lastName={user.lastName} imageUrl={user.avatarUrl} />
            <div>
              <p className="text-sm font-semibold">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
        <nav className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              onClick={onClose}
              className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', isActive ? 'bg-accent text-accent-foreground' : 'text-foreground interactive-row')}
            >
              <link.icon className="h-4.5 w-4.5" /> {link.label}
            </NavLink>
          ))}
          <NavLink to="/health-records" onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground interactive-row">
            <ClipboardList className="h-4.5 w-4.5" /> Health Records
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
