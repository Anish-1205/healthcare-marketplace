import type { DemoAccount } from '@carebridge/shared';
import { Info } from 'lucide-react';
import { useDemoAccounts } from '@/hooks/use-reference';
import { Skeleton } from '@/components/ui/skeleton';

export function DemoAccountsPanel({ onSelect }: { onSelect: (account: DemoAccount) => void }) {
  const { data: accounts, isLoading } = useDemoAccounts();

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/40 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Info className="h-4 w-4 text-primary" /> Demo Accounts
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {accounts?.map((account) => (
            <button
              key={account.key}
              type="button"
              onClick={() => onSelect(account)}
              title={account.description}
              className="truncate rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:border-primary hover:text-primary"
            >
              {account.label}
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">For demonstration use only. Password: Demo@123</p>
    </div>
  );
}
