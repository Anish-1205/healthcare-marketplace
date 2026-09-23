import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HERO_BANNERS } from '@/data/demo/hero-banners';
import { cn } from '@/lib/utils';

export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % HERO_BANNERS.length), 6000);
    return () => clearInterval(timer);
  }, []);

  const banner = HERO_BANNERS[index];

  return (
    <div className="relative mx-auto w-full max-w-[1400px] overflow-hidden rounded-3xl">
      <div className={cn('relative flex min-h-[280px] flex-col justify-center gap-4 bg-gradient-to-br px-8 py-12 sm:min-h-[340px] sm:px-14', banner.gradient)}>
        <div className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(circle_at_80%_20%,white,transparent_45%)]" />
        <p className="relative text-sm font-semibold uppercase tracking-wide text-white/80">{banner.eyebrow}</p>
        <h1 className="relative max-w-lg text-balance text-3xl font-extrabold text-white sm:text-4xl">{banner.title}</h1>
        <p className="relative max-w-md text-balance text-white/85">{banner.subtitle}</p>
        <Link
          to={banner.ctaHref}
          className="relative mt-2 w-fit rounded-full bg-white px-6 py-3 text-sm font-semibold text-foreground shadow-lg transition-transform hover:scale-105"
        >
          {banner.ctaLabel}
        </Link>
      </div>

      <button
        onClick={() => setIndex((i) => (i - 1 + HERO_BANNERS.length) % HERO_BANNERS.length)}
        className="absolute left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md hover:bg-white sm:flex"
        aria-label="Previous banner"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => setIndex((i) => (i + 1) % HERO_BANNERS.length)}
        className="absolute right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md hover:bg-white sm:flex"
        aria-label="Next banner"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
        {HERO_BANNERS.map((b, i) => (
          <button
            key={b.id}
            onClick={() => setIndex(i)}
            aria-label={`Go to banner ${i + 1}`}
            className={cn('h-1.5 rounded-full bg-white/60 transition-all', i === index ? 'w-6 bg-white' : 'w-1.5')}
          />
        ))}
      </div>
    </div>
  );
}
