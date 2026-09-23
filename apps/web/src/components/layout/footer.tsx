import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/logo';
import { FOOTER_LINKS } from '@/data/demo/marketing';

const SOCIAL_LINKS = [
  { label: 'Facebook', icon: Facebook },
  { label: 'Instagram', icon: Instagram },
  { label: 'Twitter', icon: Twitter },
  { label: 'LinkedIn', icon: Linkedin },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/30 pb-20 lg:pb-0">
      <div className="container py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">Doctors, medicines and trusted healthcare providers — all in one place.</p>
            <div className="mt-4 flex gap-2">
              {SOCIAL_LINKS.map(({ label, icon: Icon }) => (
                // Demo placeholders: CareBridge has no real social accounts.
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  onClick={(e) => e.preventDefault()}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-sm font-semibold text-foreground">{heading}</h4>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-3 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} CareBridge. All rights reserved.</p>
          <p className="max-w-xl text-center sm:text-right">
            CareBridge Demo is a prototype application created for product demonstration purposes. Healthcare and medicine information shown is fictional/demo content.
          </p>
        </div>
      </div>
    </footer>
  );
}
