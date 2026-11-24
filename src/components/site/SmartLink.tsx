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
  onClick,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  if (/^https?:\/\//.test(href) || href.startsWith("mailto:")) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer" onClick={onClick}>
        {children}
      </a>
    );
  }
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
