import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateLabBookingPayload, UploadHealthDocumentPayload } from '@carebridge/shared';
import { labsApi, type LabBookingParams, type LabTestParams } from '@/api/labs';

export const useLabTests = (params: LabTestParams = {}) => useQuery({ queryKey: ['lab-tests', params], queryFn: () => labsApi.tests(params), placeholderData: (old) => old });
export const useLabCategories = () => useQuery({ queryKey: ['lab-test-categories'], queryFn: labsApi.categories });
export const useLabTest = (id?: string) => useQuery({ queryKey: ['lab-test', id], queryFn: () => labsApi.test(id!), enabled: Boolean(id) });
export const useLabBookingContext = (enabled = true) => useQuery({ queryKey: ['lab-booking-context'], queryFn: labsApi.context, enabled });
export const useLabBookings = (params: LabBookingParams = {}) => useQuery({ queryKey: ['lab-bookings', params], queryFn: () => labsApi.bookings(params), placeholderData: (old) => old });
export const useLabBooking = (id?: string) => useQuery({ queryKey: ['lab-booking', id], queryFn: () => labsApi.booking(id!), enabled: Boolean(id), refetchInterval: 20_000 });
export const useHealthRecords = () => useQuery({ queryKey: ['health-records'], queryFn: labsApi.healthRecords });

function useLabInvalidation() { const client = useQueryClient(); return () => Promise.all([client.invalidateQueries({ queryKey: ['lab-bookings'] }), client.invalidateQueries({ queryKey: ['health-records'] })]); }
export function useBookLabTest() { const done = useLabInvalidation(); return useMutation({ mutationFn: (payload: CreateLabBookingPayload) => labsApi.book(payload), onSuccess: done }); }
export function useCancelLabBooking() { const done = useLabInvalidation(); return useMutation({ mutationFn: labsApi.cancel, onSuccess: done }); }
export function useUploadHealthDocument() { const done = useLabInvalidation(); return useMutation({ mutationFn: (payload: UploadHealthDocumentPayload) => labsApi.uploadDocument(payload), onSuccess: done }); }
export function useDeleteHealthDocument() { const done = useLabInvalidation(); return useMutation({ mutationFn: labsApi.deleteDocument, onSuccess: done }); }
