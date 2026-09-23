import { useState } from 'react';
import { Bell, ClipboardList, FlaskConical, LogOut, Menu, Pill, ShoppingCart, Stethoscope, User, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from '@/components/global-search';
import { Logo } from '@/components/logo';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
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
        cn('rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground', isActive && 'bg-accent text-accent-foreground')
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
        <button className="rounded-lg p-2 hover:bg-accent lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
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
          <button className="rounded-full p-2 text-muted-foreground hover:bg-accent md:hidden" aria-label="Search" onClick={() => setMobileSearchOpen(true)}>
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
            <button onClick={() => setMobileSearchOpen(false)} className="rounded-full p-2 hover:bg-accent" aria-label="Close search">
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
    <button onClick={() => navigate(href)} className="relative rounded-full p-2.5 text-foreground/80 hover:bg-accent" aria-label={label}>
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
    <button onClick={() => navigate('/notifications')} className="relative rounded-full p-2.5 text-foreground/80 hover:bg-accent" aria-label="Notifications">
      <Bell className="h-5 w-5" />
      {!!data?.count && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {data.count > 9 ? '9+' : data.count}
        </span>
      )}
    </button>
  );
}

function ProfileMenu() {
  const user = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <Button size="sm" onClick={() => navigate('/login')} className="ml-1">
        Login
      </Button>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-accent" aria-label="Profile menu">
        <Avatar firstName={user.firstName} lastName={user.lastName} imageUrl={user.avatarUrl} size="sm" />
        <span className="hidden text-sm font-medium sm:block">{user.firstName}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 rounded-2xl border border-border bg-white p-1.5 shadow-xl">
            <button
              onClick={() => {
                setOpen(false);
                navigate('/profile');
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-accent"
            >
              <User className="h-4 w-4" /> My Profile
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate('/appointments');
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-accent"
            >
              <Stethoscope className="h-4 w-4" /> My Appointments
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate('/orders');
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-accent"
            >
              <ClipboardList className="h-4 w-4" /> My Orders
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={() => {
                setOpen(false);
                logout.mutate();
                navigate('/');
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MobileNav({ onClose }: { onClose: () => void }) {
  const user = useCurrentUser();
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-72 bg-white p-5 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <button onClick={onClose} className="rounded-full p-2 hover:bg-accent" aria-label="Close menu">
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
              className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', isActive ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent')}
            >
              <link.icon className="h-4.5 w-4.5" /> {link.label}
            </NavLink>
          ))}
          <NavLink to="/health-records" onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
            <ClipboardList className="h-4.5 w-4.5" /> Health Records
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
