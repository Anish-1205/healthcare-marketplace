import type { CreateLabBookingPayload, HealthDocument, HealthRecordsOverview, LabBookingContext, LabBookingStatus, LabBookingSummary, LabTestDetail, LabTestSummary, UploadHealthDocumentPayload } from '@carebridge/shared';
import { api, type Paginated } from './client';

export interface LabTestParams { page?: number; pageSize?: number; q?: string; category?: string; package?: boolean; popular?: boolean; }
export interface LabBookingParams { page?: number; pageSize?: number; status?: LabBookingStatus; }

export const labsApi = {
  tests: (params: LabTestParams = {}): Promise<Paginated<LabTestSummary>> => api.getPaginated('/lab-tests', { params }),
  categories: (): Promise<string[]> => api.get('/lab-tests/categories'),
  test: (id: string): Promise<LabTestDetail> => api.get(`/lab-tests/${id}`),
  context: (): Promise<LabBookingContext> => api.get('/lab-bookings/context'),
  bookings: (params: LabBookingParams = {}): Promise<Paginated<LabBookingSummary>> => api.getPaginated('/lab-bookings', { params }),
  booking: (id: string): Promise<LabBookingSummary> => api.get(`/lab-bookings/${id}`),
  book: (payload: CreateLabBookingPayload): Promise<LabBookingSummary> => api.post('/lab-bookings', payload),
  cancel: (id: string): Promise<LabBookingSummary> => api.post(`/lab-bookings/${id}/cancel`),
  healthRecords: (): Promise<HealthRecordsOverview> => api.get('/health-records'),
  documents: (page = 1, type?: string): Promise<Paginated<HealthDocument>> => api.getPaginated('/health-records/documents', { params: { page, pageSize: 20, type } }),
  uploadDocument: (payload: UploadHealthDocumentPayload): Promise<HealthDocument> => api.post('/health-records/documents', payload),
  deleteDocument: (id: string): Promise<{ deleted: true }> => api.del(`/health-records/documents/${id}`),
};
