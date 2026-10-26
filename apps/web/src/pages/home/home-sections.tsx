import { ArrowRight, CalendarCheck2, FileText, Search, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SpecialtyRef } from '@/api/reference';
import { CountUp, Reveal, Stagger, StaggerItem } from '@/components/motion';
import { buttonVariants } from '@/components/ui/button';
import { WHY_CAREBRIDGE } from '@/data/demo/marketing';
import { iconFor } from '@/lib/icon-map';
import { cn } from '@/lib/utils';

/** Live marketplace totals; a stat is hidden until its count has loaded. */
export function StatsBand({ stats }: { stats: Array<{ label: string; value?: number }> }) {
  return (
    <div className="container -mt-8 relative z-10">
      <Stagger className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border/70 bg-border/70 shadow-lift lg:grid-cols-4">
        {stats.map((stat) => (
          <StaggerItem key={stat.label} className="bg-card px-6 py-7">
            <p className="font-display text-4xl leading-none text-foreground sm:text-5xl">
              {stat.value === undefined ? '—' : <CountUp value={stat.value} />}
              <span className="text-secondary">+</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

const STEPS = [
  { icon: Search, title: 'Find the right care', body: 'Search doctors by specialty, rating, fee and live availability.' },
  { icon: CalendarCheck2, title: 'Book in seconds', body: 'Pick a slot, pay securely and get instant confirmation.' },
  { icon: FileText, title: 'Get a digital prescription', body: 'Your doctor issues it straight to your CareBridge account.' },
  { icon: Truck, title: 'Medicines at your door', body: 'A nearby pharmacy fulfils it and you track every step.' },
];

export function JourneySteps() {
  return (
    <section className="container py-16 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">How it works</p>
        <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">From first symptom to doorstep, <em>in one flow.</em></h2>
      </Reveal>
      <Stagger className="relative mt-14 grid gap-6 md:grid-cols-4">
        <div className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
        {STEPS.map((step, i) => (
          <StaggerItem key={step.title} className="relative text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-primary shadow-lift ring-1 ring-border/70">
              <step.icon className="h-6 w-6" />
            </div>
            <p className="mt-2 text-[11px] font-semibold text-muted-foreground">STEP {i + 1}</p>
            <h3 className="mt-2 text-base font-semibold">{step.title}</h3>
            <p className="mx-auto mt-1.5 max-w-[15rem] text-sm text-muted-foreground">{step.body}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function SpecialtyMarquee({ specialties }: { specialties: SpecialtyRef[] }) {
  if (!specialties.length) return null;
  const loop = [...specialties, ...specialties];
  return (
    <div className="mask-fade-x overflow-hidden border-y border-border/70 bg-card/60 py-5">
      <div className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
        {loop.map((s, i) => {
          const Icon = iconFor(s.icon);
          return (
            <Link
              key={`${s.id}-${i}`}
              to={`/doctors?specialty=${s.slug}`}
              tabIndex={i >= specialties.length ? -1 : undefined}
              aria-hidden={i >= specialties.length || undefined}
              className="flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-soft transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Icon className="h-4 w-4 text-primary" /> {s.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function WhyBento() {
  const [first, ...rest] = WHY_CAREBRIDGE;
  return (
    <section className="container py-16 sm:py-20">
      <Reveal className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Why CareBridge</p>
        <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">Care you can trust, at every step.</h2>
      </Reveal>
      <Stagger className="mt-10 grid gap-4 md:grid-cols-3 md:grid-rows-2">
        <StaggerItem className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[hsl(189_70%_20%)] p-8 text-white shadow-lift md:row-span-2">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-secondary/30 blur-3xl" />
          <first.icon className="relative h-8 w-8 text-emerald-200" />
          <h3 className="relative mt-24 font-display text-3xl leading-tight md:mt-40">{first.title}</h3>
          <p className="relative mt-3 max-w-xs text-white/80">{first.description}</p>
        </StaggerItem>
        {rest.map((item, i) => (
          <StaggerItem key={item.title} className={cn(i === 2 && 'md:col-span-2')}>
            <div className="group h-full rounded-3xl border border-border/70 bg-card p-7 shadow-soft interactive-card">
              <span className="inline-flex rounded-xl bg-accent p-2.5 text-primary transition-transform duration-300 group-hover:-translate-y-0.5">
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="container pb-8 pt-4">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[hsl(200_35%_10%)] px-8 py-16 text-center text-white sm:px-16">
          <div className="pointer-events-none absolute inset-0 [background:radial-gradient(50%_80%_at_20%_0%,hsl(189_75%_30%/0.55),transparent_60%),radial-gradient(40%_70%_at_90%_100%,hsl(152_55%_38%/0.45),transparent_60%)]" />
          <h2 className="relative mx-auto max-w-2xl font-display text-4xl leading-tight sm:text-6xl">Better care starts with <em>one click.</em></h2>
          <p className="relative mx-auto mt-4 max-w-lg text-white/70">Join patients, doctors, clinics and pharmacies already connected on CareBridge.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/doctors" className={cn(buttonVariants({ size: 'lg' }), 'bg-none bg-white text-foreground hover:bg-white/90')}>
              Find a doctor <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/register/provider" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white')}>
              Partner with us
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
