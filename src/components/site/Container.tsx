import type { ReactNode } from "react";

/** Page-width wrapper. Page width comes from --site-max-width in theme.css. */
export default function Container({
  children,
  className = "",
  narrow = false,
}: {
  children: ReactNode;
  className?: string;
  /** Reading width, for articles. */
  narrow?: boolean;
}) {
  const width = narrow ? "max-w-3xl" : "max-w-(--site-max-width)";
  return <div className={`mx-auto w-full ${width} px-5 sm:px-8 ${className}`}>{children}</div>;
}
