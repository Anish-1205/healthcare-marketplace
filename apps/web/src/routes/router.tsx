import { createBrowserRouter, Navigate } from 'react-router-dom';
import { CheckoutPage } from '@/pages/orders/checkout-page';
import { OrdersPage } from '@/pages/orders/orders-page';
import { OrderDetailPage } from '@/pages/orders/order-detail-page';
import { PharmacyLayout } from '@/layouts/pharmacy-layout';
import { OrganizationLayout } from '@/layouts/organization-layout';
import { AdminLayout } from '@/layouts/admin-layout';
import { PublicLayout } from '@/layouts/public-layout';
import { DoctorLayout } from '@/layouts/doctor-layout';
import { RequireAuth } from '@/components/require-auth';
import { RequireRole } from '@/components/require-role';
import { RequirePermission } from '@/components/require-permission';
import { ComingSoonPage } from '@/pages/coming-soon-page';
import { AppointmentDetailPage } from '@/pages/appointments/appointment-detail-page';
import { AppointmentsPage } from '@/pages/appointments/appointments-page';
import { BookAppointmentPage } from '@/pages/appointments/book-appointment-page';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password-page';
import { LoginPage } from '@/pages/auth/login-page';
import { RegisterPage } from '@/pages/auth/register-page';
import { ProviderRegistrationPage } from '@/pages/auth/provider-registration-page';
import { ResetPasswordPage } from '@/pages/auth/reset-password-page';
import { DoctorDetailPage } from '@/pages/doctors/doctor-detail-page';
import { DoctorsPage } from '@/pages/doctors/doctors-page';
import { DoctorAppointmentDetailPage } from '@/pages/doctor/doctor-appointment-detail-page';
import { DoctorAppointmentsPage } from '@/pages/doctor/doctor-appointments-page';
import { DoctorAvailabilityPage } from '@/pages/doctor/doctor-availability-page';
import { DoctorDashboardPage } from '@/pages/doctor/doctor-dashboard-page';
import { DoctorNotificationsPage } from '@/pages/doctor/doctor-notifications-page';
import { DoctorPatientDetailPage } from '@/pages/doctor/doctor-patient-detail-page';
import { DoctorPatientsPage } from '@/pages/doctor/doctor-patients-page';
import { DoctorPrescriptionDetailPage } from '@/pages/doctor/doctor-prescription-detail-page';
import { DoctorPrescriptionsPage } from '@/pages/doctor/doctor-prescriptions-page';
import { DoctorProfilePage } from '@/pages/doctor/doctor-profile-page';
import { ConsultationWorkspacePage } from '@/pages/doctor/consultation-workspace-page';
import { DoctorConsultationsPage } from '@/pages/doctor/doctor-consultations-page';
import { ChoosePharmacyPage } from '@/pages/prescriptions/choose-pharmacy-page';
import { PrescriptionDetailPage } from '@/pages/prescriptions/prescription-detail-page';
import { PrescriptionsPage } from '@/pages/prescriptions/prescriptions-page';
import { CartPage } from '@/pages/cart/cart-page';
import { HomePage } from '@/pages/home/home-page';
import { MedicineDetailPage } from '@/pages/medicines/medicine-detail-page';
import { MedicinesPage } from '@/pages/medicines/medicines-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { OrganizationDetailPage } from '@/pages/organizations/organization-detail-page';
import { OrganizationsPage } from '@/pages/organizations/organizations-page';
import { PharmacyDetailPage } from '@/pages/pharmacies/pharmacy-detail-page';
import { PharmaciesPage } from '@/pages/pharmacies/pharmacies-page';
import { OrganizationDashboardPage } from '@/pages/organization/organization-dashboard-page';
import { OrganizationDoctorsPage } from '@/pages/organization/organization-doctors-page';
import { OrganizationAppointmentsPage } from '@/pages/organization/organization-appointments-page';
import { OrganizationPatientsPage } from '@/pages/organization/organization-patients-page';
import { OrganizationServicesPage } from '@/pages/organization/organization-services-page';
import { OrganizationStaffPage } from '@/pages/organization/organization-staff-page';
import { OrganizationSchedulesPage } from '@/pages/organization/organization-schedules-page';
import { OrganizationReportsPage } from '@/pages/organization/organization-reports-page';
import { OrganizationProfilePage } from '@/pages/organization/organization-profile-page';
import { AdminDashboardPage } from '@/pages/admin/admin-dashboard-page';
import { AdminOrganizationsPage, AdminDoctorsPage, AdminPatientsPage } from '@/pages/admin/admin-entities-page';
import { AdminOrganizationDetailPage, AdminDoctorDetailPage, AdminPatientDetailPage } from '@/pages/admin/admin-entity-detail-page';
import { AdminAppointmentsPage, AdminOrdersPage } from '@/pages/admin/admin-transactions-page';
import { AdminApprovalsPage } from '@/pages/admin/admin-approvals-page';
import { AdminEmployeesPage } from '@/pages/admin/admin-employees-page';
import { AdminReportsPage } from '@/pages/admin/admin-reports-page';
import { AdminActivityPage } from '@/pages/admin/admin-activity-page';
import { AdminSettingsPage } from '@/pages/admin/admin-settings-page';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/doctors', element: <DoctorsPage /> },
      { path: '/doctors/:id', element: <DoctorDetailPage /> },
      { path: '/clinics', element: <OrganizationsPage /> },
      { path: '/organizations/:id', element: <OrganizationDetailPage /> },
      { path: '/pharmacies', element: <PharmaciesPage /> },
      { path: '/pharmacies/:id', element: <PharmacyDetailPage /> },
      { path: '/medicines', element: <MedicinesPage /> },
      { path: '/medicines/:id', element: <MedicineDetailPage /> },
      { path: '/medicine-categories/:slug', element: <MedicinesPage /> },

      {
        element: <RequireAuth />,
        children: [
          { path: '/doctors/:id/book', element: <BookAppointmentPage /> },
          { path: '/appointments', element: <AppointmentsPage /> },
          { path: '/appointments/:id', element: <AppointmentDetailPage /> },
          { path: '/prescriptions', element: <PrescriptionsPage /> },
          { path: '/prescriptions/:id', element: <PrescriptionDetailPage /> },
          { path: '/prescriptions/:id/pharmacies', element: <ChoosePharmacyPage /> },
          { path: '/cart', element: <CartPage /> },
          { path: '/checkout', element: <CheckoutPage /> },
          { path: '/orders', element: <OrdersPage /> },
          { path: '/orders/:id', element: <OrderDetailPage /> },
        ],
      },
      { path: '/health-records', element: <ComingSoonPage title="Health Records" description="View prescriptions, lab reports and uploaded documents here." /> },
      { path: '/lab-tests', element: <ComingSoonPage title="Lab Tests" description="Book home-collection lab tests here." /> },
      { path: '/lab-tests/:id', element: <ComingSoonPage title="Lab Test" /> },
      { path: '/lab-bookings', element: <ComingSoonPage title="Lab Bookings" /> },
      { path: '/favorites', element: <ComingSoonPage title="Favorites" description="Doctors, clinics and pharmacies you've saved will show up here." /> },
      { path: '/notifications', element: <ComingSoonPage title="Notifications" /> },
      { path: '/profile', element: <ComingSoonPage title="My Profile" description="Manage your personal details and saved addresses here." /> },
      { path: '/profile/addresses', element: <ComingSoonPage title="Saved Addresses" /> },
      { path: '/register/provider', element: <ProviderRegistrationPage /> },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <RequireRole roles={['DOCTOR']} />,
    children: [
      {
        element: <DoctorLayout />,
        children: [
          { path: '/doctor', element: <DoctorDashboardPage /> },
          { path: '/doctor/appointments', element: <DoctorAppointmentsPage /> },
          { path: '/doctor/appointments/:id', element: <DoctorAppointmentDetailPage /> },
          { path: '/doctor/patients', element: <DoctorPatientsPage /> },
          { path: '/doctor/patients/:id', element: <DoctorPatientDetailPage /> },
          { path: '/doctor/consultations', element: <DoctorConsultationsPage /> },
          { path: '/doctor/consultations/:id', element: <ConsultationWorkspacePage /> },
          { path: '/doctor/prescriptions', element: <DoctorPrescriptionsPage /> },
          { path: '/doctor/prescriptions/:id', element: <DoctorPrescriptionDetailPage /> },
          { path: '/doctor/availability', element: <DoctorAvailabilityPage /> },
          { path: '/doctor/profile', element: <DoctorProfilePage /> },
          { path: '/doctor/notifications', element: <DoctorNotificationsPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole roles={['CLINIC_ADMIN', 'CLINIC_STAFF', 'HOSPITAL_ADMIN', 'HOSPITAL_STAFF']} />,
    children: [{
      element: <OrganizationLayout />,
      children: [
        { path: '/organization', element: <OrganizationDashboardPage /> },
        { path: '/organization/doctors', element: <OrganizationDoctorsPage /> },
        { path: '/organization/appointments', element: <OrganizationAppointmentsPage /> },
        { path: '/organization/appointments/:id', element: <DoctorAppointmentDetailPage portal="organization" /> },
        { path: '/organization/patients', element: <OrganizationPatientsPage /> },
        { path: '/organization/services', element: <OrganizationServicesPage /> },
        { path: '/organization/staff', element: <OrganizationStaffPage /> },
        { path: '/organization/schedules', element: <OrganizationSchedulesPage /> },
        { path: '/organization/reports', element: <OrganizationReportsPage /> },
        { path: '/organization/profile', element: <OrganizationProfilePage /> },
      ],
    }],
  },
  {
    element: <RequireRole roles={['PLATFORM_EMPLOYEE', 'PLATFORM_ADMIN', 'SUPER_ADMIN']} />,
    children: [{
      element: <AdminLayout />,
      children: [
        { path: '/admin', element: <AdminDashboardPage /> },
        { path: '/admin/organizations', element: <AdminOrganizationsPage /> },
        { path: '/admin/organizations/:id', element: <AdminOrganizationDetailPage /> },
        { path: '/admin/doctors', element: <AdminDoctorsPage /> },
        { path: '/admin/doctors/:id', element: <AdminDoctorDetailPage /> },
        { path: '/admin/patients', element: <AdminPatientsPage /> },
        { path: '/admin/patients/:id', element: <AdminPatientDetailPage /> },
        { path: '/admin/pharmacies', element: <AdminOrganizationsPage pharmacies /> },
        { path: '/admin/appointments', element: <AdminAppointmentsPage /> },
        { path: '/admin/orders', element: <AdminOrdersPage /> },
        { path: '/admin/approvals', element: <AdminApprovalsPage /> },
        { path: '/admin/reports', element: <AdminReportsPage /> },
        { path: '/admin/activity', element: <AdminActivityPage /> },
        { element: <RequirePermission permission="employee.manage" />, children: [{ path: '/admin/employees', element: <AdminEmployeesPage /> }] },
        { element: <RequirePermission permission="settings.manage" />, children: [{ path: '/admin/settings', element: <AdminSettingsPage /> }] },
      ],
    }],
  },
  { element: <RequireRole roles={['PHARMACY_ADMIN', 'PHARMACY_STAFF']} />, children: [
    { element: <PharmacyLayout />, children: [
      { path: '/pharmacy', element: <Navigate to="/pharmacy/orders" replace /> },
      { path: '/pharmacy/orders', element: <OrdersPage pharmacy /> },
      { path: '/pharmacy/orders/:id', element: <OrderDetailPage pharmacy /> },
    ] },
  ] },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
]);
