import { ArrowRight, BadgeCheck, CalendarCheck2, FileText, Pill, ShieldCheck, Star, Truck } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import type { DoctorSummary } from '@carebridge/shared';
import { fadeUp } from '@/components/motion';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } };

function FloatingCard({ className, delay, children }: { className?: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', duration: 0.9, bounce: 0.15, delay }}
      className={cn('absolute', className)}
    >
      <div className="glass animate-float rounded-2xl p-4 shadow-lift" style={{ animationDelay: `${delay * 2}s` }}>
        {children}
      </div>
    </motion.div>
  );
}

/** The patient journey — appointment, prescription, delivery — told with live catalogue data. */
export function HomeHero({ doctor }: { doctor?: DoctorSummary }) {
  return (
    <section className="relative overflow-hidden bg-aurora">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_40%,#000,transparent)]" />
      <div className="container relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <motion.div variants={container} initial="hidden" animate="visible">
          <motion.p variants={fadeUp} className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary shadow-soft">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-secondary" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
            </span>
            Doctors, pharmacies and labs on one platform
          </motion.p>
          <motion.h1 variants={fadeUp} className="mt-6 max-w-xl font-display text-[clamp(2.9rem,6vw,5.2rem)] font-normal leading-[0.95] tracking-[-0.03em] text-foreground">
            Healthcare that <em className="text-gradient pr-1">comes to you.</em>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Book a trusted doctor, receive your prescription digitally and have medicines delivered from a nearby pharmacy, all in one place.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
            <Link to="/doctors" className={buttonVariants({ size: 'lg' })}>
              Book a doctor <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/medicines" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'glass border-white')}>
              Order medicines
            </Link>
          </motion.div>
          <motion.ul variants={fadeUp} className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {[
              [BadgeCheck, 'Verified providers'],
              [ShieldCheck, 'Private health records'],
              [Truck, 'Doorstep delivery'],
            ].map(([Icon, label]) => {
              const I = Icon as typeof BadgeCheck;
              return (
                <li key={label as string} className="flex items-center gap-1.5">
                  <I className="h-4 w-4 text-secondary" /> {label as string}
                </li>
              );
            })}
          </motion.ul>
        </motion.div>

        <div className="relative mx-auto h-[420px] w-full max-w-[520px] sm:h-[480px]" aria-hidden>
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 1.2, bounce: 0 }}
            className="absolute inset-6 rounded-[2.5rem] bg-gradient-to-br from-primary via-[hsl(189_70%_32%)] to-secondary shadow-glow"
          >
            <div className="absolute inset-0 rounded-[2.5rem] [background:radial-gradient(circle_at_75%_20%,hsl(0_0%_100%/0.35),transparent_45%)]" />
            <div className="absolute bottom-8 right-8 max-w-[13rem] text-right text-white">
              <p className="font-display text-3xl leading-[1.05]">Book, consult, deliver.</p>
              <p className="mt-2 text-xs text-white/75">Every step tracked in one timeline.</p>
            </div>
          </motion.div>

          <FloatingCard delay={0.35} className="-left-2 top-4 w-[250px] sm:-left-6">
            <div className="flex items-center gap-3">
              {doctor ? (
                <Avatar firstName={doctor.name.replace(/^Dr\.?\s*/, '')} lastName="" imageUrl={doctor.avatarUrl} size="sm" />
              ) : (
                <span className="h-9 w-9 rounded-full bg-accent" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{doctor?.name ?? 'Your doctor'}</p>
                <p className="truncate text-xs text-muted-foreground">{doctor?.primarySpecialty ?? 'General Physician'}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground">
              <span className="flex items-center gap-1.5"><CalendarCheck2 className="h-3.5 w-3.5" /> Appointment confirmed</span>
              {doctor && doctor.avgRating > 0 && (
                <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{doctor.avgRating.toFixed(1)}</span>
              )}
            </div>
          </FloatingCard>

          <FloatingCard delay={0.55} className="-right-2 top-[38%] w-[220px] sm:-right-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-secondary"><FileText className="h-4 w-4" /> Prescription issued</div>
            <div className="mt-3 space-y-1.5">
              {['Twice daily · 5 days', 'After meals · 7 days'].map((line) => (
                <div key={line} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Pill className="h-3.5 w-3.5 text-primary" /> {line}
                </div>
              ))}
            </div>
          </FloatingCard>

          <FloatingCard delay={0.75} className="bottom-24 left-4 w-[240px] sm:left-0">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-primary"><Truck className="h-4 w-4" /> Out for delivery</span>
              <span className="text-muted-foreground">Arriving soon</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                initial={{ width: '10%' }}
                animate={{ width: '78%' }}
                transition={{ duration: 2.4, delay: 1, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </FloatingCard>
        </div>
      </div>
    </section>
  );
}
