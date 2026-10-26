import { PageTransition } from '@/components/motion';
import { Outlet } from 'react-router-dom';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

/** Wraps the public marketplace and the patient experience (they share one navigation). */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
