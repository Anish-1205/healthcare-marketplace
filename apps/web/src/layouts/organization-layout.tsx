import { UserMenu } from '@/components/layout/user-menu';
import { useState } from 'react';
import { PageTransition } from '@/components/motion';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3, Building2, CalendarDays, LayoutDashboard, LogOut, Menu, Stethoscope,
  Users, UserRound, X, Clock3, BriefcaseMedical,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const items = [
  ['/organization', 'Dashboard', LayoutDashboard], ['/organization/doctors', 'Doctors', Stethoscope],
  ['/organization/appointments', 'Appointments', CalendarDays], ['/organization/patients', 'Patients', UserRound],
  ['/organization/services', 'Services', BriefcaseMedical], ['/organization/staff', 'Staff', Users],
  ['/organization/schedules', 'Schedules', Clock3], ['/organization/reports', 'Reports', BarChart3],
  ['/organization/profile', 'Organization Profile', Building2],
] as const;

function Navigation({ close, isAdmin }: { close?: () => void; isAdmin: boolean }) {
  const visibleItems = isAdmin ? items : items.filter(([to]) => ['/organization', '/organization/appointments', '/organization/patients'].includes(to));
  return <nav className="space-y-1">{visibleItems.map(([to, label, Icon]) => (
    <NavLink key={to} to={to} end={to === '/organization'} onClick={close} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground interactive-row')}>
      <Icon className="h-4.5 w-4.5" /> {label}
    </NavLink>
  ))}</nav>;
}

export function OrganizationLayout() {
  const user = useCurrentUser(); const logout = useLogout(); const [open, setOpen] = useState(false);
  const org = user?.memberships.find((item) => item.organizationType === 'CLINIC' || item.organizationType === 'HOSPITAL');
  return <div className="flex min-h-screen bg-muted/30">
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center border-b px-5"><Logo /></div>
      <div className="border-b px-4 py-4"><p className="truncate text-sm font-semibold">{org?.organizationName}</p><div className="mt-1 flex items-center gap-2"><Badge variant="accent">{org?.organizationType === 'HOSPITAL' ? 'Hospital' : 'Clinic'}</Badge>{org?.approvalStatus !== 'APPROVED' && <Badge variant="warning">Pending approval</Badge>}</div></div>
      <div className="flex-1 overflow-y-auto p-3"><Navigation isAdmin={org?.staffRole === 'ADMIN'} /></div>
      <button onClick={() => logout.mutate()} className="m-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"><LogOut className="h-4 w-4" /> Sign out</button>
    </aside>
    {open && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-label="Close menu" /><aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-card shadow-xl"><div className="flex h-16 items-center justify-between border-b px-5"><Logo /><button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></div><div className="border-b p-4"><p className="text-sm font-semibold">{org?.organizationName}</p></div><div className="flex-1 overflow-auto p-3"><Navigation isAdmin={org?.staffRole === 'ADMIN'} close={() => setOpen(false)} /></div></aside></div>}
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6"><button className="rounded-lg p-2 interactive-pill lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button><div className="flex-1"><p className="text-sm font-semibold">{org?.organizationType === 'HOSPITAL' ? 'Hospital' : 'Clinic'} Portal</p><p className="hidden text-xs text-muted-foreground sm:block">Manage your care team and patient operations</p></div><UserMenu displayName={user ? `${user.firstName} ${user.lastName}` : undefined} links={org?.staffRole === 'ADMIN' ? [{ label: 'Organization Profile', href: '/organization/profile', icon: Building2 }] : []} /></header>
      {org?.approvalStatus !== 'APPROVED' && <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:px-6">Your organization is awaiting marketplace approval. You can finish setting up the portal meanwhile.</div>}
      <main className="flex-1 p-4 sm:p-6"><PageTransition><Outlet /></PageTransition></main>
    </div>
  </div>;
}
