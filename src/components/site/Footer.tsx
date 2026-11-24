import { siteConfig } from "@/site.config";
import Container from "./Container";
import SmartLink from "./SmartLink";

export default function Footer() {
  const { name, footer } = siteConfig;
  return (
    <footer className="border-t border-line">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <p className="font-heading font-semibold text-ink">{name}</p>
          {footer.blurb && <p className="mt-2 text-sm text-muted">{footer.blurb}</p>}
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {footer.links.map((link) => (
              <li key={link.href}>
                <SmartLink href={link.href} className="text-sm text-muted hover:text-ink">
                  {link.label}
                </SmartLink>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
      <Container className="pb-10">
        <p className="text-xs text-faint">
          &copy; {new Date().getFullYear()} {name}. {footer.legal}
        </p>
      </Container>
    </footer>
  );
}
