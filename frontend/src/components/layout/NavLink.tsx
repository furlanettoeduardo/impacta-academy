'use client';

import Link, { LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type NavLinkProps = LinkProps & {
  className?: string;
  activeClassName?: string;
  end?: boolean;
  children: React.ReactNode;
};

export function NavLink({
  href,
  className,
  activeClassName,
  end = false,
  children,
  ...props
}: NavLinkProps) {
  const pathname = usePathname();
  const hrefString = typeof href === 'string' ? href : href.pathname ?? '';
  const isActive = end
    ? pathname === hrefString
    : pathname?.startsWith(hrefString);

  return (
    <Link
      href={href}
      className={cn(className, isActive && activeClassName)}
      {...props}
    >
      {children}
    </Link>
  );
}
