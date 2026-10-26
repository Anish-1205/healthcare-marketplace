import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/avatar';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';

export interface UserMenuLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Avatar dropdown shared by every signed-in layout, so Sign out is one click away on every page. */
export function UserMenu({ links = [], displayName }: { links?: UserMenuLink[]; displayName?: string }) {
  const user = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (!user) return null;
  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="interactive-pill flex items-center gap-2 rounded-full py-1 pl-1 pr-2"
      >
        <Avatar firstName={user.firstName} lastName={user.lastName} imageUrl={user.avatarUrl} size="sm" />
        <span className="hidden text-sm font-medium sm:block">{displayName ?? user.firstName}</span>
        <ChevronDown className={`hidden h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 sm:block ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-60 origin-top-right rounded-2xl border border-border/70 bg-card p-1.5 shadow-lift"
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold">{user.firstName} {user.lastName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-border" />
            {links.map((link) => (
              <button key={link.href} role="menuitem" onClick={() => go(link.href)} className="interactive-row flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm">
                <link.icon className="h-4 w-4 text-muted-foreground" /> {link.label}
              </button>
            ))}
            {links.length > 0 && <div className="my-1 h-px bg-border" />}
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout.mutate();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
