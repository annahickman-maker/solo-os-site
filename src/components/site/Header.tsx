import Link from "next/link";
import { siteConfig } from "@/site.config";
import ButtonLink from "./ButtonLink";
import Container from "./Container";
import SmartLink from "./SmartLink";

export default function Header() {
  const { name, header } = siteConfig;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-heading text-[1.05rem] font-semibold text-ink">
          {name}
        </Link>
        <nav aria-label="Main" className="flex items-center gap-6">
          <ul className="hidden items-center gap-6 md:flex">
            {header.nav.map((link) => (
              <li key={link.href}>
                <SmartLink
                  href={link.href}
                  className="text-[0.9rem] text-muted transition-colors hover:text-ink"
                >
                  {link.label}
                </SmartLink>
              </li>
            ))}
          </ul>
          <ButtonLink link={header.cta} className="px-4 py-2 text-[0.875rem]" />
        </nav>
      </Container>
    </header>
  );
}
