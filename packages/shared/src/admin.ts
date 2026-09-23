import type { ApprovalStatus, AppointmentStatus, ConsultationType, OrderStatus, OrganizationType, PaymentStatus } from './statuses';
import type { Role } from './roles';

export interface AdminOverview {
  metrics: {
    patients: number; doctors: number; clinics: number; hospitals: number; pharmacies: number;
    appointments: number; orders: number; demoGmv: number; pendingApprovals: number;
  };
  registrationTrend: Array<{ label: string; patients: number; doctors: number; organizations: number }>;
  orderTrend: Array<{ label: string; orders: number; gmv: number }>;
  recentRegistrations: Array<{ id: string; kind: 'PATIENT' | 'DOCTOR' | 'ORGANIZATION'; name: string; subtitle: string; status: string; createdAt: string }>;
  recentOrders: AdminOrder[];
  recentAppointments: AdminAppointment[];
  recentActivity: AdminActivity[];
  pending: AdminApproval[];
}

export interface AdminOrganization {
  id: string; name: string; slug: string; type: OrganizationType; category: string | null;
  contactPerson: string | null; phone: string | null; email: string | null; locality: string | null; city: string | null;
  registrationNumber: string | null; licenseNumber: string | null; approvalStatus: ApprovalStatus;
  rejectionReason: string | null; isActive: boolean; doctorCount: number; staffCount: number; orderCount: number;
  appointmentCount: number; createdAt: string;
}

export interface AdminDoctor {
  id: string; userId: string; name: string; email: string; phone: string | null; avatarUrl: string | null;
  registrationNumber: string; qualifications: string; experienceYears: number; specialties: string[];
  consultationFee: number; approvalStatus: ApprovalStatus; rejectionReason: string | null;
  isActive: boolean; userStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL'; organizations: string[]; appointmentCount: number; createdAt: string;
}

export interface AdminPatient {
  id: string; userId: string; patientCode: string; name: string; email: string; phone: string | null;
  dateOfBirth: string | null; gender: string | null; bloodGroup: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL'; appointmentCount: number; orderCount: number; createdAt: string;
}

export interface AdminAppointment {
  id: string; appointmentNumber: string; patientName: string; doctorName: string; organizationName: string | null;
  consultationType: ConsultationType; status: AppointmentStatus; fee: number; scheduledStart: string; createdAt: string;
}

export interface AdminOrder {
  id: string; orderNumber: string; patientName: string; pharmacyName: string; status: OrderStatus;
  itemCount: number; totalAmount: number; paymentStatus: PaymentStatus | null; fulfillmentType: 'DELIVERY' | 'PICKUP'; placedAt: string;
}

export interface AdminApproval {
  id: string; entityType: 'DOCTOR' | 'ORGANIZATION'; name: string; subtitle: string;
  organizationType: OrganizationType | null; submittedBy: string; submittedAt: string;
  documents: Array<{ id: string; type: string; fileName: string; mimeType: string; sizeBytes: number }>;
}

export interface AdminEmployee {
  id: string; userId: string; employeeCode: string; name: string; email: string; phone: string | null;
  department: string; jobTitle: string; role: Extract<Role, 'PLATFORM_EMPLOYEE' | 'PLATFORM_ADMIN' | 'SUPER_ADMIN'>;
  isActive: boolean; userStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL'; createdAt: string;
}

export interface AdminActivity {
  id: string; action: string; entityType: string; entityId: string | null; description: string;
  actorName: string | null; organizationName: string | null; ipAddress: string | null; createdAt: string;
}

export interface AdminSetting { key: string; value: string; description: string | null; updatedAt: string; }

export interface AdminReport {
  period: { from: string; to: string };
  totals: { registrations: number; appointments: number; completedAppointments: number; orders: number; deliveredOrders: number; gmv: number; platformFees: number };
  daily: Array<{ label: string; registrations: number; appointments: number; orders: number; gmv: number }>;
  organizations: Array<{ organizationId: string; organizationName: string; type: OrganizationType; appointments: number; orders: number; gmv: number }>;
}

export interface CreateAdminOrganizationPayload {
  name: string; type: OrganizationType; category?: string | null; description?: string | null; contactPerson?: string | null;
  phone?: string | null; email?: string | null; registrationNumber?: string | null; licenseNumber?: string | null;
  addressLine1?: string | null; addressLine2?: string | null; locality?: string | null; city?: string | null; state?: string | null; postalCode?: string | null;
}

export interface CreateAdminEmployeePayload {
  email: string; password?: string; firstName: string; lastName: string; phone?: string | null;
  employeeCode: string; department: string; jobTitle: string; role: 'PLATFORM_EMPLOYEE' | 'PLATFORM_ADMIN';
}
export interface UpdateAdminEmployeePayload { department?: string; jobTitle?: string; role?: 'PLATFORM_EMPLOYEE' | 'PLATFORM_ADMIN'; isActive?: boolean; }
