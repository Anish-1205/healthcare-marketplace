import { Building2, FlaskConical, Heart, Home as HomeIcon, LayoutGrid, Pill, Stethoscope, Store, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CategoryCard } from '@/components/category-card';
import { DoctorCard } from '@/components/doctor-card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { GlobalSearch } from '@/components/global-search';
import { MedicineCard } from '@/components/medicine-card';
import { OrganizationCard } from '@/components/organization-card';
import { ScrollItem, ScrollRow } from '@/components/scroll-row';
import { Section } from '@/components/section';
import { ServiceCards } from '@/components/service-cards';
import { SpecialtyCard } from '@/components/specialty-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/use-auth';
import { useDoctors } from '@/hooks/use-doctors';
import { useMedicines } from '@/hooks/use-medicines';
import { useOrganizations } from '@/hooks/use-organizations';
import { usePharmacies } from '@/hooks/use-pharmacies';
import { useMedicineCategories, useSpecialties } from '@/hooks/use-reference';
import { HomeHero } from './home-hero';
import { FinalCta, JourneySteps, SpecialtyMarquee, StatsBand, WhyBento } from './home-sections';
import { PersonalizedBanner } from './personalized-banner';

function CardRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ScrollRow>
      {Array.from({ length: count }).map((_, i) => (
        <ScrollItem key={i}>
          <Skeleton className="h-64 w-full" />
        </ScrollItem>
      ))}
    </ScrollRow>
  );
}

export function HomePage() {
  const user = useCurrentUser();
  const specialties = useSpecialties();
  const categories = useMedicineCategories();
  const medicines = useMedicines({ pageSize: 10, requiresPrescription: false });
  const doctors = useDoctors({ pageSize: 8, sort: '-rating' });
  const organizations = useOrganizations({ type: ['CLINIC', 'HOSPITAL'], pageSize: 6 });
  const pharmacies = usePharmacies({ pageSize: 6 });

  return (
    <div className="pb-8">
      <div className="container pt-4 md:hidden">
        <GlobalSearch />
      </div>
      <HomeHero doctor={doctors.data?.data[0]} />
      <StatsBand
        stats={[
          { label: 'Verified doctors', value: doctors.data?.meta?.total },
          { label: 'Clinics & hospitals', value: organizations.data?.meta?.total },
          { label: 'Partner pharmacies', value: pharmacies.data?.meta?.total },
          { label: 'Medicines & products', value: medicines.data?.meta?.total },
        ]}
      />

      <div className="container py-12">
        <ServiceCards />
      </div>

      <SpecialtyMarquee specialties={specialties.data ?? []} />
      <JourneySteps />

      {user && <PersonalizedBanner user={user} />}

      <Section title="Shop by Category" subtitle="Everything you need, organised for you" viewAllHref="/medicines">
        {categories.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : categories.isError ? (
          <ErrorState onRetry={() => categories.refetch()} />
        ) : !categories.data?.length ? (
          <EmptyState icon={LayoutGrid} title="No categories to show yet" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {categories.data.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Popular Health Products" subtitle="Everyday essentials, delivered fast" viewAllHref="/medicines">
        {medicines.isLoading ? (
          <CardRowSkeleton />
        ) : medicines.isError ? (
          <ErrorState onRetry={() => medicines.refetch()} />
        ) : !medicines.data?.data.length ? (
          <EmptyState icon={Pill} title="No products to show yet" />
        ) : (
          <ScrollRow>
            {medicines.data.data.map((medicine) => (
              <ScrollItem key={medicine.id}>
                <MedicineCard medicine={medicine} className="h-full" />
              </ScrollItem>
            ))}
          </ScrollRow>
        )}
      </Section>

      <Section title="Find the Right Doctor" subtitle="Search by specialty to get started" viewAllHref="/doctors">
        {specialties.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : specialties.isError ? (
          <ErrorState onRetry={() => specialties.refetch()} />
        ) : !specialties.data?.length ? (
          <EmptyState icon={Stethoscope} title="No specialties to show yet" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {specialties.data.map((specialty) => (
              <SpecialtyCard key={specialty.id} specialty={specialty} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Doctors Available Today" subtitle="Highly rated doctors ready to see you" viewAllHref="/doctors">
        {doctors.isLoading ? (
          <CardRowSkeleton />
        ) : doctors.isError ? (
          <ErrorState onRetry={() => doctors.refetch()} />
        ) : !doctors.data?.data.length ? (
          <EmptyState icon={HomeIcon} title="No doctors to show yet" />
        ) : (
          <ScrollRow>
            {doctors.data.data.map((doctor) => (
              <ScrollItem key={doctor.id} className="w-[300px] sm:w-[320px]">
                <DoctorCard doctor={doctor} className="h-full" />
              </ScrollItem>
            ))}
          </ScrollRow>
        )}
      </Section>

      <Section title="Clinics & Hospitals Near You" subtitle="Trusted care in your neighbourhood" viewAllHref="/clinics">
        {organizations.isLoading ? (
          <CardRowSkeleton />
        ) : organizations.isError ? (
          <ErrorState onRetry={() => organizations.refetch()} />
        ) : !organizations.data?.data.length ? (
          <EmptyState icon={Building2} title="No clinics or hospitals to show yet" />
        ) : (
          <ScrollRow>
            {organizations.data.data.map((org) => (
              <ScrollItem key={org.id} className="w-[280px] sm:w-[300px]">
                <OrganizationCard organization={org} className="h-full" />
              </ScrollItem>
            ))}
          </ScrollRow>
        )}
      </Section>

      <Section title="Choose Your Pharmacy" subtitle="Pick a pharmacy that delivers to you" viewAllHref="/pharmacies">
        {pharmacies.isLoading ? (
          <CardRowSkeleton />
        ) : pharmacies.isError ? (
          <ErrorState onRetry={() => pharmacies.refetch()} />
        ) : !pharmacies.data?.data.length ? (
          <EmptyState icon={Store} title="No pharmacies to show yet" />
        ) : (
          <ScrollRow>
            {pharmacies.data.data.map((pharmacy) => (
              <ScrollItem key={pharmacy.id} className="w-[280px] sm:w-[300px]">
                <OrganizationCard organization={pharmacy} className="h-full" />
              </ScrollItem>
            ))}
          </ScrollRow>
        )}
      </Section>

      <Section title="Health Services" subtitle="More ways CareBridge takes care of you">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Lab Tests at Home', icon: FlaskConical, href: '/lab-tests' },
            { label: 'Video Consultation', icon: Video, href: '/doctors?type=VIDEO' },
            { label: 'Health Records', icon: Heart, href: '/health-records' },
            { label: 'Favorite Doctors', icon: Heart, href: '/favorites' },
          ].map((service) => (
            <Link key={service.label} to={service.href} className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card p-5 text-center shadow-soft interactive-card">
              <service.icon className="h-6 w-6 text-primary" />
              <span className="text-sm font-semibold text-foreground">{service.label}</span>
            </Link>
          ))}
        </div>
      </Section>

      <WhyBento />
      <FinalCta />
    </div>
  );
}
