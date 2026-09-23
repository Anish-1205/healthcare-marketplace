import { useState } from 'react';
import type { AdminEmployee, CreateAdminEmployeePayload } from '@carebridge/shared';
import { Pencil, Plus, Search, Users } from 'lucide-react';
import { ApiError } from '@/api/client';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminEmployees, useCreateAdminEmployee, useUpdateAdminEmployee } from '@/hooks/use-admin';

const empty: CreateAdminEmployeePayload = {
  email: '', firstName: '', lastName: '', phone: '', employeeCode: '',
  department: 'Operations', jobTitle: '', role: 'PLATFORM_EMPLOYEE',
};

type EmployeeDetails = Pick<AdminEmployee, 'department' | 'jobTitle'>;

export function AdminEmployeesPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateAdminEmployeePayload>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [details, setDetails] = useState<EmployeeDetails>({ department: '', jobTitle: '' });
  const [error, setError] = useState<string | null>(null);
  const query = useAdminEmployees({ page, pageSize: 20, q: q || undefined });
  const create = useCreateAdminEmployee();
  const update = useUpdateAdminEmployee();

  async function submit() {
    setError(null);
    try {
      await create.mutateAsync(form);
      setForm(empty);
      setOpen(false);
    } catch (value) {
      setError(value instanceof ApiError ? value.message : 'Could not create the employee.');
    }
  }

  function startEditing(employee: AdminEmployee) {
    setEditingId(employee.id);
    setDetails({ department: employee.department, jobTitle: employee.jobTitle });
    setError(null);
  }

  async function saveDetails() {
    if (!editingId) return;
    setError(null);
    try {
      await update.mutateAsync({ id: editingId, payload: details });
      setEditingId(null);
    } catch (value) {
      setError(value instanceof ApiError ? value.message : 'Could not update the employee.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Manage the internal team and platform access roles."
        resultCount={query.data?.meta.total}
        action={<Button onClick={() => setOpen(!open)}><Plus className="h-4 w-4" />Create employee</Button>}
      />

      {open && (
        <div className="mb-6 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div><Label>First name</Label><Input className="mt-1" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></div>
            <div><Label>Last name</Label><Input className="mt-1" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></div>
            <div><Label>Email</Label><Input className="mt-1" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
            <div><Label>Employee code</Label><Input className="mt-1" value={form.employeeCode} onChange={(event) => setForm({ ...form, employeeCode: event.target.value })} /></div>
            <div><Label>Department</Label><Input className="mt-1" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></div>
            <div><Label>Job title</Label><Input className="mt-1" value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <Select className="mt-1" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as CreateAdminEmployeePayload['role'] })}>
                <option value="PLATFORM_EMPLOYEE">Platform Employee</option>
                <option value="PLATFORM_ADMIN">Platform Admin</option>
              </Select>
            </div>
            <div><Label>Phone</Label><Input className="mt-1" value={form.phone ?? ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">The default demo password is used when no password is provided through the API.</p>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-4 flex gap-2">
            <Button disabled={!form.email || !form.firstName || !form.lastName || !form.employeeCode || !form.jobTitle || create.isPending} onClick={submit}>Create employee</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Search employee, code, department…" />
      </div>

      {query.isLoading ? <Skeleton className="h-80" /> : query.isError ? (
        <ErrorState message="We couldn't load employees." onRetry={() => query.refetch()} />
      ) : !query.data?.data.length ? (
        <EmptyState icon={Users} title="No employees found" />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="divide-y">
              {query.data.data.map((employee) => (
                <div key={employee.id}>
                  <div className="flex flex-wrap items-center gap-4 p-4">
                    <Avatar firstName={employee.name.split(' ')[0]} lastName={employee.name.split(' ').slice(1).join(' ')} />
                    <div className="min-w-[14rem] flex-1">
                      <p className="font-semibold">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">{employee.employeeCode} · {employee.email}</p>
                    </div>
                    <div className="min-w-[12rem]">
                      <p className="text-sm font-medium">{employee.jobTitle}</p>
                      <p className="text-xs text-muted-foreground">{employee.department}</p>
                    </div>
                    <Badge variant={employee.role === 'SUPER_ADMIN' ? 'default' : employee.role === 'PLATFORM_ADMIN' ? 'accent' : 'muted'}>{employee.role.replaceAll('_', ' ')}</Badge>
                    <Badge variant={employee.isActive ? 'success' : 'muted'}>{employee.isActive ? 'Active' : 'Inactive'}</Badge>
                    {employee.role !== 'SUPER_ADMIN' && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => startEditing(employee)}><Pencil className="h-4 w-4" />Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: employee.id, payload: { role: employee.role === 'PLATFORM_ADMIN' ? 'PLATFORM_EMPLOYEE' : 'PLATFORM_ADMIN' } })}>{employee.role === 'PLATFORM_ADMIN' ? 'Make employee' : 'Make admin'}</Button>
                        <Button size="sm" variant="outline" onClick={() => update.mutate({ id: employee.id, payload: { isActive: !employee.isActive } })}>{employee.isActive ? 'Deactivate' : 'Activate'}</Button>
                      </>
                    )}
                  </div>
                  {editingId === employee.id && (
                    <div className="grid gap-3 border-t bg-muted/30 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <div><Label>Department</Label><Input className="mt-1" value={details.department} onChange={(event) => setDetails({ ...details, department: event.target.value })} /></div>
                      <div><Label>Job title</Label><Input className="mt-1" value={details.jobTitle} onChange={(event) => setDetails({ ...details, jobTitle: event.target.value })} /></div>
                      <div className="flex gap-2">
                        <Button disabled={!details.department || !details.jobTitle || update.isPending} onClick={saveDetails}>Save</Button>
                        <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                      {error && <p className="text-sm text-destructive sm:col-span-3">{error}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <Pagination page={query.data.meta.page} totalPages={query.data.meta.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
