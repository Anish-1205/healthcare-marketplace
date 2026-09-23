import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, Building2, CalendarDays, CheckCircle2, ClipboardList, LayoutDashboard, LogOut, Menu, Package, Settings, ShieldCheck, Stethoscope, UserRound, Users, X } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const links = [
  ['/admin', 'Overview', LayoutDashboard, null], ['/admin/organizations', 'Organizations', Building2, null], ['/admin/doctors', 'Doctors', Stethoscope, null],
  ['/admin/patients', 'Patients', UserRound, null], ['/admin/pharmacies', 'Pharmacies', ShieldCheck, null], ['/admin/appointments', 'Appointments', CalendarDays, null],
  ['/admin/orders', 'Orders', Package, null], ['/admin/approvals', 'Approvals', CheckCircle2, null], ['/admin/employees', 'Employees', Users, 'employee.manage'],
  ['/admin/reports', 'Reports', BarChart3, null], ['/admin/activity', 'Activity Logs', Activity, null], ['/admin/settings', 'Settings', Settings, 'settings.manage'],
] as const;
function Navigation({ close }: { close?: () => void }) { const user = useCurrentUser(); return <nav className="space-y-1">{links.filter(([, , , permission]) => !permission || user?.permissions.includes(permission)).map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/admin'} onClick={close} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')}><Icon className="h-4.5 w-4.5" />{label}</NavLink>)}</nav>; }
export function AdminLayout() {
  const user = useCurrentUser(); const logout = useLogout(); const navigate = useNavigate(); const [open, setOpen] = useState(false);
  const role = user?.roles.includes('SUPER_ADMIN') ? 'Super Admin' : user?.roles.includes('PLATFORM_ADMIN') ? 'Platform Admin' : 'Platform Employee';
  return <div className="flex min-h-screen bg-muted/30"><aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex"><div className="flex h-16 items-center border-b px-5"><Logo /></div><div className="border-b px-4 py-4"><p className="text-sm font-semibold">CareBridge Operations</p><Badge className="mt-2" variant="accent">{role}</Badge></div><div className="flex-1 overflow-y-auto p-3"><Navigation /></div><button onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })} className="m-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"><LogOut className="h-4 w-4" />Sign out</button></aside>
    {open && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-label="Close menu" /><aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-card shadow-xl"><div className="flex h-16 items-center justify-between border-b px-5"><Logo /><button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></div><div className="flex-1 overflow-auto p-3"><Navigation close={() => setOpen(false)} /></div></aside></div>}
    <div className="flex min-w-0 flex-1 flex-col"><header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6"><button className="rounded-lg p-2 hover:bg-accent lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button><ClipboardList className="hidden h-5 w-5 text-primary sm:block" /><div className="flex-1"><p className="text-sm font-semibold">Platform Administration</p><p className="hidden text-xs text-muted-foreground sm:block">Marketplace operations and oversight</p></div>{user && <div className="flex items-center gap-2"><Avatar firstName={user.firstName} lastName={user.lastName} imageUrl={user.avatarUrl} size="sm" /><span className="hidden text-sm font-medium sm:block">{user.firstName} {user.lastName}</span></div>}</header><main className="flex-1 p-4 sm:p-6"><Outlet /></main></div>
  </div>;
}
