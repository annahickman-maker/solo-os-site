/**
 * llms.txt Generator
 * Generates the llms.txt file that tells LLMs how to understand this site.
 * See: https://llmstxt.org/
 *
 * Pulls from entities, content objects, and offers to build a complete picture.
 */

import type { Tables } from "@/types/database";
import { siteConfig } from "@/site.config";

type Entity = Tables<"entities">;
type ContentObject = Tables<"content_objects">;
type Offer = Tables<"offers">;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_NAME = siteConfig.name;

/**
 * Generate the full llms.txt content.
 */
export function generateLlmsTxt(
  entities: Entity[],
  content: ContentObject[],
  offers: Offer[]
): string {
  const lines: string[] = [];

  // Header: name and description come from src/site.config.ts
  lines.push(`# ${SITE_NAME}`);
  lines.push("");
  lines.push(`> ${siteConfig.description}`);
  lines.push("");

  lines.push("## About");
  lines.push("");
  lines.push(siteConfig.hero.subhead);
  lines.push("");

  // Key entities (dynamic from database)
  const people = entities.filter((e) => e.entity_type === "person");
  const orgs = entities.filter((e) => e.entity_type === "organization");

  if (orgs.length > 0 || people.length > 0) {
    lines.push("## Key People & Organizations");
    lines.push("");
    for (const entity of [...orgs, ...people]) {
      lines.push(`- **${entity.name}** (${entity.entity_type}): ${entity.description || ""}`);
      if (entity.url) lines.push(`  URL: ${entity.url}`);
    }
    lines.push("");
  }

  // Services (dynamic from database)
  if (offers.length > 0) {
    lines.push("## Services & Offers");
    lines.push("");
    for (const offer of offers) {
      lines.push(`- **${offer.name}**: ${offer.tagline || offer.description || ""}`);
      if (offer.price_display) lines.push(`  Price: ${offer.price_display}`);
      if (offer.who_its_for) lines.push(`  For: ${offer.who_its_for}`);
      if (offer.cta_url) lines.push(`  URL: ${offer.cta_url.startsWith("/") ? SITE_URL + offer.cta_url : offer.cta_url}`);
    }
    lines.push("");
  }

  // API info for agents
  lines.push("## API");
  lines.push("");
  lines.push("This site provides a REST API for programmatic access:");
  lines.push("");
  lines.push(`- Offers: GET ${SITE_URL}/api/offers`);
  lines.push(`- Analytics: POST ${SITE_URL}/api/analytics`);
  lines.push("");
  lines.push("Administrative and agent-only routes require session auth or x-api-key access.");
  lines.push("");

  // Contact
  lines.push("## Contact");
  lines.push("");
  lines.push(`- Website: ${SITE_URL}`);
  lines.push("");

  return lines.join("\n");
}
