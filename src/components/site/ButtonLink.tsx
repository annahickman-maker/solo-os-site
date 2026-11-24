import type { SiteLink } from "@/site.config";
import SmartLink from "./SmartLink";

const base =
  "inline-flex items-center justify-center rounded-pill px-6 py-3 text-[0.95rem] font-medium transition-[opacity,background-color,border-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const variants = {
  primary: "bg-primary text-primary-ink hover:opacity-90",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink",
} as const;

export type ButtonVariant = keyof typeof variants;

/** The pill button look, shared with CtaButton. */
export function buttonClass(variant: ButtonVariant = "primary", className = ""): string {
  return `${base} ${variants[variant]} ${className}`;
}

export default function ButtonLink({
  link,
  variant = "primary",
  className = "",
}: {
  link: SiteLink;
  variant?: ButtonVariant;
  className?: string;
}) {
  return (
    <SmartLink href={link.href} className={buttonClass(variant, className)}>
      {link.label}
    </SmartLink>
  );
}
