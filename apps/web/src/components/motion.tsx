import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useInView, useReducedMotion, type Variants } from 'motion/react';
import { useLocation } from 'react-router-dom';

const spring = { type: 'spring', duration: 0.7, bounce: 0 } as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  // transitionEnd clears filter/transform so finished elements never trap position:fixed children.
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: spring, transitionEnd: { filter: 'none', transform: 'none' } },
};

/** Fades its children up the first time they scroll into view. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={fadeUp}
      transition={{ ...spring, delay }}
    >
      {children}
    </motion.div>
  );
}

const cardRise: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.97, filter: 'blur(6px)' },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', duration: 0.9, bounce: 0.12, delay },
    transitionEnd: { filter: 'none', transform: 'none' },
  }),
};

/** Card entrance that cascades by the card's position in its list (grid cell or scroll-row item). */
export function RevealCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [delay, setDelay] = useState(0);
  useLayoutEffect(() => {
    let node: HTMLElement | null = ref.current;
    // A card may sit directly in a grid or inside a ScrollItem wrapper; use whichever level has siblings.
    if (node?.parentElement && node.parentElement.children.length === 1) node = node.parentElement;
    const index = node?.parentElement ? Array.prototype.indexOf.call(node.parentElement.children, node) : 0;
    setDelay(Math.min(index % 12, 8) * 0.08);
  }, []);
  return (
    <motion.div ref={ref} className={className} custom={delay} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={cardRise}>
      {children}
    </motion.div>
  );
}

/** Staggers direct `StaggerItem` children as the group enters the viewport. */
export function Stagger({ children, className, gap = 0.08 }: { children: ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: gap, delayChildren: 0.05 } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}

/** Counts from 0 to `value` once visible. The final value is always rendered for reduced motion and assistive tech. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-IN'), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView || reduce) return setShown(value);
    const controls = animate(0, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return (
    <span ref={ref} className={className} aria-label={format(value)}>
      <span aria-hidden>{format(shown)}</span>
    </span>
  );
}

/** Soft fade between routes; no exit animation so navigation never waits. */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const { pathname } = useLocation();
  return (
    <motion.div key={pathname} className={className} initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none', transform: 'none' } }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
