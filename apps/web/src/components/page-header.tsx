import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { fadeUp } from '@/components/motion';

export function PageHeader({ title, subtitle, resultCount, action }: { title: string; subtitle?: string; resultCount?: number; action?: ReactNode }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }} className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <motion.div variants={fadeUp}>
        <h1 className="font-display text-3xl font-normal leading-tight text-foreground sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
        {resultCount !== undefined && <p className="mt-1 text-xs font-medium text-muted-foreground">{resultCount} result{resultCount === 1 ? '' : 's'}</p>}
      </motion.div>
      {action && <motion.div variants={fadeUp} className="shrink-0">{action}</motion.div>}
    </motion.div>
  );
}
