import type { LucideIcon } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CountUp, StaggerItem } from '@/components/motion';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const CHART_COLORS = {
  primary: 'hsl(189 75% 30%)',
  secondary: 'hsl(152 55% 40%)',
  violet: 'hsl(258 60% 62%)',
  sky: 'hsl(205 80% 55%)',
  amber: 'hsl(38 90% 55%)',
};

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

const axis = { tickLine: false, axisLine: false, tick: { fontSize: 11, fill: 'hsl(200 12% 42%)' } } as const;

function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; format?: (n: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/70 bg-card/95 px-3 py-2 text-xs shadow-lift backdrop-blur">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          {item.name}: <span className="font-semibold text-foreground">{format ? format(item.value) : item.value}</span>
        </p>
      ))}
    </div>
  );
}

function Legend({ series }: { series: ChartSeries[] }) {
  if (series.length < 2) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.label}
        </span>
      ))}
    </div>
  );
}

/** Smooth gradient area chart for time series. */
export function TrendAreaChart<T extends object>({ data, xKey, series, height = 240, format }: { data: T[]; xKey: keyof T & string; series: ChartSeries[]; height?: number; format?: (n: number) => string }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(40 12% 89%)" strokeDasharray="4 4" />
          <XAxis dataKey={xKey} {...axis} minTickGap={16} />
          <YAxis {...axis} allowDecimals={false} tickFormatter={format} width={format ? 64 : 40} />
          <Tooltip content={<ChartTooltip format={format} />} cursor={{ stroke: 'hsl(189 75% 30% / 0.25)', strokeWidth: 1 }} />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.25} fill={`url(#fill-${s.key})`} animationDuration={900} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <Legend series={series} />
    </>
  );
}

/** Rounded bar chart; several series stack. */
export function TrendBarChart<T extends object>({ data, xKey, series, height = 240, format }: { data: T[]; xKey: keyof T & string; series: ChartSeries[]; height?: number; format?: (n: number) => string }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="hsl(40 12% 89%)" strokeDasharray="4 4" />
          <XAxis dataKey={xKey} {...axis} minTickGap={8} />
          <YAxis {...axis} allowDecimals={false} tickFormatter={format} width={format ? 64 : 40} />
          <Tooltip content={<ChartTooltip format={format} />} cursor={{ fill: 'hsl(189 60% 94% / 0.6)' }} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId={series.length > 1 ? 'stack' : undefined}
              fill={s.color}
              radius={i === series.length - 1 ? [8, 8, 0, 0] : 0}
              maxBarSize={44}
              animationDuration={900}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <Legend series={series} />
    </>
  );
}

/** KPI tile: numbers count up; preformatted strings (currency) count up via `format`. */
export function StatCard({ label, value, icon: Icon, tone = 'bg-accent text-primary', format, className }: { label: string; value: number; icon?: LucideIcon; tone?: string; format?: (n: number) => string; className?: string }) {
  return (
    <StaggerItem className={className}>
      <Card className="group h-full shadow-soft interactive-card">
        <CardContent className="flex items-center gap-3 p-4">
          {Icon && (
            <span className={cn('rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110', tone)}>
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold tabular-nums">
              <CountUp value={value} format={format} />
            </p>
          </div>
        </CardContent>
      </Card>
    </StaggerItem>
  );
}
