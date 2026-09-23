import { createBrowserRouter, Navigate } from 'react-router-dom';
import { CheckoutPage } from '@/pages/orders/checkout-page';
import { OrdersPage } from '@/pages/orders/orders-page';
import { OrderDetailPage } from '@/pages/orders/order-detail-page';
import { PharmacyLayout } from '@/layouts/pharmacy-layout';
import { PublicLayout } from '@/layouts/public-layout';
import { DoctorLayout } from '@/layouts/doctor-layout';
import { RequireAuth } from '@/components/require-auth';
import { RequireRole } from '@/components/require-role';
import { ComingSoonPage } from '@/pages/coming-soon-page';
import { AppointmentDetailPage } from '@/pages/appointments/appointment-detail-page';
import { AppointmentsPage } from '@/pages/appointments/appointments-page';
import { BookAppointmentPage } from '@/pages/appointments/book-appointment-page';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password-page';
import { LoginPage } from '@/pages/auth/login-page';
import { RegisterPage } from '@/pages/auth/register-page';
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
      { path: '/register/provider', element: <ComingSoonPage title="Register as a Provider" description="Doctor, clinic, hospital and pharmacy registration is launching soon." /> },

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
