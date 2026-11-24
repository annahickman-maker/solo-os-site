/**
 * Site copy and links: the one file to edit.
 *
 * Every word on the sales page, the header and the footer comes from here. Rewrite the strings; keep the shape. TypeScript will flag a
 * missing field. Styling lives in src/app/theme.css, not here.
 *
 * Links: use "#section-id" for a section on the home page ("/#offer" from
 * other pages), or a full https:// URL.
 *
 * Buttons that sell (the hero's main button and each plan's button) take an
 * `action` instead of a link. See CtaAction below and SITE.md.
 */

export type SiteLink = {
  label: string;
  href: string;
};

export type TitledText = {
  title: string;
  body: string;
};

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
};

/**
 * What a selling button does:
 * - lead: scrolls to the email form at the bottom of the page and focuses it.
 * - checkout: opens Stripe checkout for the dashboard product with this slug
 *   (Sales page in your dashboard). The price charged is the dashboard's, not
 *   the `price` text on the card, so keep the two the same.
 * - booking: opens your Cal.com booking link in a new tab. Bookings reach
 *   the dashboard through Cal.com's webhook (dashboard BOOKINGS.md).
 * - link: any other link: "#section", "/#section", or a full https:// URL
 *   (a community, another store), which opens in a new tab.
 */
export type CtaAction =
  | { type: "lead" }
  | { type: "checkout"; productSlug: string }
  | { type: "booking"; url: string }
  | { type: "link"; href: string };

export type CtaButton = {
  label: string;
  action: CtaAction;
};

export type Plan = {
  name: string;
  price: string;
  /** Shown after the price, e.g. "/ month" or "one-time". Leave "" to hide. */
  period: string;
  description: string;
  features: string[];
  cta: CtaButton;
  /** Gives this plan the emphasised card style. */
  highlighted?: boolean;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type LeadFormCopy = {
  /** Saved with the lead as its form name, so the dashboard can tell forms apart. */
  formId: string;
  /** Saved with the lead as its source. */
  source: string;
  emailPlaceholder: string;
  namePlaceholder: string;
  /** Show the optional first-name field. */
  askForName: boolean;
  buttonLabel: string;
  sendingLabel: string;
  successMessage: string;
  errorMessage: string;
  /** Small print under the form. Leave "" to hide. */
  privacyNote: string;
};

export type SiteConfig = {
  /** Brand name: header, footer, page titles, structured data. */
  name: string;
  /** Default meta description for search and link previews. */
  description: string;
  /** Browser tab title for the home page. */
  homeTitle: string;

  header: {
    nav: SiteLink[];
    cta: SiteLink;
  };

  /** 1. Specific result + timeframe. */
  hero: {
    eyebrow: string;
    /** The specific result your customer gets. */
    headline: string;
    /** How long it takes, shown as a badge, e.g. "in 90 days". Leave "" to hide. */
    timeframe: string;
    subhead: string;
    primaryCta: CtaButton;
    /** Optional quieter link next to the main button. */
    secondaryCta?: SiteLink;
    /** Small line under the buttons. Leave "" to hide. */
    note: string;
  };

  /** 2. Proof: hard numbers and results, straight after the promise. */
  proof: {
    eyebrow: string;
    heading: string;
    stats: { value: string; label: string }[];
  };

  /** 3. Avatar: who this is for, and who it is not for. */
  avatar: {
    eyebrow: string;
    heading: string;
    intro: string;
    forYou: string[];
    notForYou: string[];
  };

  /** 4. How we get results: your methodology. */
  method: {
    eyebrow: string;
    /** The name of your method, if it has one. */
    heading: string;
    intro: string;
    steps: TitledText[];
  };

  /** 5. Why should you trust me: about you. */
  about: {
    eyebrow: string;
    heading: string;
    /** One paragraph per string. */
    paragraphs: string[];
    /** Path or URL of a photo of you. Leave "" to hide. */
    photo: string;
    photoAlt: string;
    credentials: string[];
  };

  /** 6. What's included + purchase: how it is delivered and how to buy. */
  offer: {
    eyebrow: string;
    heading: string;
    intro: string;
    items: TitledText[];
    /** How the customer receives it, e.g. "Instant access inside our community". */
    delivery: string;
    plans: Plan[];
  };

  faq: {
    eyebrow: string;
    heading: string;
    items: FaqItem[];
  };

  /** 8. Testimonials. */
  testimonials: {
    eyebrow: string;
    heading: string;
    items: Testimonial[];
  };

  /** 9. Final call to action + additional urgency. */
  finalCta: {
    heading: string;
    subhead: string;
    /** Why act now: a deadline, limited places, a price rise. Leave "" to hide. */
    urgency: string;
    form: LeadFormCopy;
  };

  /** Messages a checkout button shows while it opens Stripe, or when it cannot. */
  checkout: {
    openingLabel: string;
    /** Stripe or the site's checkout key is not set up in the dashboard yet. */
    notReady: string;
    /** The product is inactive, missing, or cannot be sold at checkout. */
    unavailable: string;
    tooManyTries: string;
    error: string;
  };

  /** The page Stripe sends a buyer to after paying (/thank-you). */
  thankYou: {
    /** Browser tab title. */
    title: string;
    heading: string;
    body: string;
    /** The "check your email" line. */
    emailNote: string;
    backLink: SiteLink;
  };

  footer: {
    blurb: string;
    links: SiteLink[];
    /** Shown after the year and name, e.g. "All rights reserved." */
    legal: string;
  };
};

export const siteConfig: SiteConfig = {
  name: "Your Brand",
  description:
    "A one-line description of what you offer and who it is for. Shown in search results and link previews.",
  homeTitle: "Your Brand - the outcome you help people reach",

  header: {
    nav: [
      { label: "How it works", href: "/#method" },
      { label: "What's included", href: "/#offer" },
      { label: "FAQ", href: "/#faq" },
    ],
    cta: { label: "Get started", href: "/#offer" },
  },

  hero: {
    eyebrow: "For the people you serve",
    headline: "The specific result your customer gets.",
    timeframe: "in 90 days",
    subhead:
      "One or two sentences on what you offer, who it is for and why it works. Plain and specific beats clever.",
    primaryCta: { label: "Get started", action: { type: "link", href: "#offer" } },
    secondaryCta: { label: "See how it works", href: "#method" },
    note: "A short reassurance, e.g. cancel any time.",
  },

  proof: {
    eyebrow: "Results",
    heading: "Real numbers from real customers.",
    stats: [
      { value: "000+", label: "people helped" },
      { value: "00%", label: "reach the result" },
      { value: "00 days", label: "average time to first win" },
    ],
  },

  avatar: {
    eyebrow: "Who it's for",
    heading: "Built for one kind of person.",
    intro: "Describe your ideal customer in their own words: where they are now and what they want.",
    forYou: [
      "You are in this specific situation.",
      "You want this specific result.",
      "You are ready to put in this much time.",
    ],
    notForYou: [
      "You want a shortcut with no effort.",
      "You are at a stage this does not suit.",
    ],
  },

  method: {
    eyebrow: "How we get results",
    heading: "The name of your method.",
    intro: "Why your approach works when other things have not.",
    steps: [
      { title: "Step one", body: "What happens first and why it matters." },
      { title: "Step two", body: "What happens next and what it unlocks." },
      { title: "Step three", body: "How the result is locked in." },
    ],
  },

  about: {
    eyebrow: "Why trust me",
    heading: "Hi, I'm Your Name.",
    paragraphs: [
      "Where you started, and the moment you found what works.",
      "The results you have had since, for yourself and for others.",
    ],
    photo: "",
    photoAlt: "Your Name",
    credentials: ["A credential or result", "A credential or result", "A credential or result"],
  },

  offer: {
    eyebrow: "What's included",
    heading: "Everything you need to get the result.",
    intro: "Lead with the outcome each part creates, then what delivers it.",
    items: [
      { title: "Included item one", body: "The result it gives and how." },
      { title: "Included item two", body: "The result it gives and how." },
      { title: "Included item three", body: "The result it gives and how." },
      { title: "Included item four", body: "The result it gives and how." },
    ],
    delivery: "How it is delivered, e.g. instant access inside our online community.",
    plans: [
      {
        name: "Starter",
        price: "$00",
        period: "/ month",
        description: "Who this package is for.",
        features: ["What is included", "What is included", "What is included"],
        // Collects an email first: scrolls to the form at the bottom of the page.
        cta: { label: "Choose Starter", action: { type: "lead" } },
      },
      {
        name: "Most popular",
        price: "$000",
        period: "/ month",
        description: "Who this package is for.",
        features: [
          "Everything in Starter",
          "What is included",
          "What is included",
          "What is included",
        ],
        // Stripe checkout for the dashboard product with slug "main-offer".
        cta: { label: "Choose this", action: { type: "checkout", productSlug: "main-offer" } },
        highlighted: true,
      },
      {
        name: "Premium",
        price: "$0,000",
        period: "one-time",
        description: "Who this package is for.",
        features: ["Everything in Most popular", "What is included", "What is included"],
        // A call first: your Cal.com event link.
        cta: { label: "Book a call", action: { type: "booking", url: "https://cal.com/your-username/discovery-call" } },
      },
    ],
  },

  faq: {
    eyebrow: "FAQ",
    heading: "Questions people ask before buying.",
    items: [
      {
        question: "Who is this for?",
        answer: "Describe the ideal customer, and who it is not for.",
      },
      {
        question: "How long does it take?",
        answer: "Set an honest expectation for time and effort.",
      },
      {
        question: "What if it is not right for me?",
        answer: "Explain your refund or guarantee policy.",
      },
      {
        question: "How do I get started?",
        answer: "Point to the form below or the main button.",
      },
    ],
  },

  testimonials: {
    eyebrow: "Testimonials",
    heading: "What people say after working with you.",
    items: [
      {
        quote: "A real quote from a real customer about a specific result.",
        name: "Customer name",
        role: "Role or short description",
      },
      {
        quote: "A second quote, ideally about a different benefit or doubt.",
        name: "Customer name",
        role: "Role or short description",
      },
      {
        quote: "A third quote. Specific beats glowing.",
        name: "Customer name",
        role: "Role or short description",
      },
    ],
  },

  finalCta: {
    heading: "Ready when you are.",
    subhead: "Leave your email and you will hear from us with the next step.",
    urgency: "A reason to act now, e.g. the price goes up on a set date.",
    form: {
      formId: "sales-page",
      source: "sales-page",
      emailPlaceholder: "you@example.com",
      namePlaceholder: "First name",
      askForName: true,
      buttonLabel: "Get started",
      sendingLabel: "Sending...",
      successMessage: "Thanks. Check your inbox for the next step.",
      errorMessage: "Something went wrong. Please try again in a moment.",
      privacyNote: "No spam. Unsubscribe any time.",
    },
  },

  checkout: {
    openingLabel: "Opening checkout...",
    notReady: "Checkout isn't switched on yet. Leave your email below and we will be in touch.",
    unavailable: "This option isn't available right now. Leave your email below and we will be in touch.",
    tooManyTries: "Too many tries. Please wait a minute and try again.",
    error: "Checkout could not open. Please try again in a moment.",
  },

  thankYou: {
    title: "Thank you",
    heading: "Thank you. You're in.",
    body: "Your payment went through and your order is confirmed.",
    emailNote:
      "Check your email: your receipt and everything you need to get started are on their way. If nothing arrives within a few minutes, look in your spam folder.",
    backLink: { label: "Back to the home page", href: "/" },
  },

  footer: {
    blurb: "One line about what you do.",
    links: [
      { label: "What's included", href: "/#offer" },
      { label: "FAQ", href: "/#faq" },
    ],
    legal: "All rights reserved.",
  },
};
