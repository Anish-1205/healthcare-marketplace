import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AssociateDoctorPayload, CreateOrganizationStaffPayload, OrganizationScheduleWindowInput,
  SaveOrganizationServicePayload, UpdateOrganizationDoctorPayload, UpdateOrganizationProfilePayload,
  UpdateOrganizationStaffPayload,
} from '@carebridge/shared';
import { organizationPortalApi } from '@/api/organization-portal';
import { useCurrentUser } from './use-auth';

function useEnabled() {
  const user = useCurrentUser();
  return Boolean(user?.memberships.some((item) => item.organizationType === 'CLINIC' || item.organizationType === 'HOSPITAL'));
}
const key = ['organization-portal'] as const;
function useInvalidate() { const client = useQueryClient(); return () => client.invalidateQueries({ queryKey: key }); }

export const useOrganizationProfile = () => useQuery({ queryKey: [...key, 'profile'], queryFn: organizationPortalApi.profile, enabled: useEnabled() });
export const useOrganizationDashboard = () => useQuery({ queryKey: [...key, 'dashboard'], queryFn: organizationPortalApi.dashboard, enabled: useEnabled() });
export const useOrganizationDoctors = () => useQuery({ queryKey: [...key, 'doctors'], queryFn: organizationPortalApi.doctors, enabled: useEnabled() });
export const useOrganizationStaff = () => useQuery({ queryKey: [...key, 'staff'], queryFn: organizationPortalApi.staff, enabled: useEnabled() });
export const useOrganizationServices = () => useQuery({ queryKey: [...key, 'services'], queryFn: organizationPortalApi.services, enabled: useEnabled() });
export const useOrganizationPatients = () => useQuery({ queryKey: [...key, 'patients'], queryFn: organizationPortalApi.patients, enabled: useEnabled() });
export const useOrganizationSchedules = () => useQuery({ queryKey: [...key, 'schedules'], queryFn: organizationPortalApi.schedules, enabled: useEnabled() });
export const useOrganizationReport = (from?: string, to?: string) => useQuery({ queryKey: [...key, 'report', from, to], queryFn: () => organizationPortalApi.report(from, to), enabled: useEnabled() });

export function useUpdateOrganizationProfile() { const done = useInvalidate(); return useMutation({ mutationFn: (payload: UpdateOrganizationProfilePayload) => organizationPortalApi.updateProfile(payload), onSuccess: done }); }
export function useAssociateOrganizationDoctor() { const done = useInvalidate(); return useMutation({ mutationFn: (payload: AssociateDoctorPayload) => organizationPortalApi.associateDoctor(payload), onSuccess: done }); }
export function useUpdateOrganizationDoctor() { const done = useInvalidate(); return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: UpdateOrganizationDoctorPayload }) => organizationPortalApi.updateDoctor(id, payload), onSuccess: done }); }
export function useCreateOrganizationStaff() { const done = useInvalidate(); return useMutation({ mutationFn: (payload: CreateOrganizationStaffPayload) => organizationPortalApi.createStaff(payload), onSuccess: done }); }
export function useUpdateOrganizationStaff() { const done = useInvalidate(); return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: UpdateOrganizationStaffPayload }) => organizationPortalApi.updateStaff(id, payload), onSuccess: done }); }
export function useCreateOrganizationService() { const done = useInvalidate(); return useMutation({ mutationFn: (payload: SaveOrganizationServicePayload) => organizationPortalApi.createService(payload), onSuccess: done }); }
export function useUpdateOrganizationService() { const done = useInvalidate(); return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: SaveOrganizationServicePayload }) => organizationPortalApi.updateService(id, payload), onSuccess: done }); }
export function useReplaceOrganizationSchedule() { const done = useInvalidate(); return useMutation({ mutationFn: ({ doctorId, windows }: { doctorId: string; windows: OrganizationScheduleWindowInput[] }) => organizationPortalApi.replaceSchedule(doctorId, windows), onSuccess: done }); }
