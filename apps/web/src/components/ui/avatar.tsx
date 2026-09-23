import { useState } from 'react';
import { avatarHue, cn, initials } from '@/lib/utils';

interface AvatarProps {
  firstName: string;
  lastName?: string;
  imageUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = { sm: 'h-8 w-8 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-16 w-16 text-lg' };

/** Gradient initials avatar — no external image dependency, per the demo-data strategy. */
export function Avatar({ firstName, lastName = '', imageUrl, className, size = 'md' }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (imageUrl && imageUrl !== failedUrl) {
    return <img src={imageUrl} alt={`${firstName} ${lastName}`} onError={() => setFailedUrl(imageUrl)} className={cn('rounded-full object-cover', SIZE_CLASSES[size], className)} />;
  }
  const hue = avatarHue(`${firstName}${lastName}`);
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-full font-semibold text-white', SIZE_CLASSES[size], className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 65% 48%), hsl(${(hue + 40) % 360} 65% 42%))` }}
    >
      {initials(firstName, lastName || '•')}
    </div>
  );
}
