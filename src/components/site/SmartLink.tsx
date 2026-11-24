import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Renders a config link: next/link for site paths, a plain anchor for
 * same-page "#section" links, and a new tab for external URLs.
 */
export default function SmartLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (/^https?:\/\//.test(href) || href.startsWith("mailto:")) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
