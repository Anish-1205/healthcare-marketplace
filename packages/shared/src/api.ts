import type { Portal, Role } from './roles';

/** Standard API response envelope. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  organizationType: 'CLINIC' | 'HOSPITAL' | 'PHARMACY';
  staffRole: 'ADMIN' | 'STAFF';
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
}

/** Shape returned by /auth/login and /auth/me. */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  roles: Role[];
  permissions: string[];
  portal: Portal;
  patientId: string | null;
  doctorId: string | null;
  /** Set for doctors; portals show an "awaiting approval" state until APPROVED. */
  doctorApprovalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | null;
  memberships: OrganizationMembership[];
}

export interface LoginResponse {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

export interface DemoAccount {
  key: string;
  label: string;
  email: string;
  password: string;
  role: Role;
  description: string;
}

/** Mock document uploads (health records, provider registration). Only metadata is stored. */
export const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export type DocumentMimeType = (typeof DOCUMENT_MIME_TYPES)[number];
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export type SearchResultType = 'doctor' | 'specialty' | 'medicine' | 'clinic' | 'hospital' | 'pharmacy';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  /** Frontend route the result should open. */
  href: string;
  imageUrl: string | null;
  badge?: string;
}

export interface SearchResponse {
  query: string;
  total: number;
  groups: Record<'doctors' | 'specialties' | 'medicines' | 'clinics' | 'hospitals' | 'pharmacies', SearchResult[]>;
}

export interface PublicConfig {
  marketplaceName: string;
  currency: 'INR';
  timezone: string;
  platformFee: number;
  defaultDeliveryFee: number;
  supportEmail: string;
  disclaimer: string;
  demoMode: boolean;
}

export const DEMO_DISCLAIMER =
  'This is a demonstration application. Healthcare information shown here is sample data and must not be used for medical decisions.';
