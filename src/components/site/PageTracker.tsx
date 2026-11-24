"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { events } from "@/lib/analytics/tracker";

/**
 * Records a page view for every page the visitor opens, including client-side
 * navigations. Mounted once in the root layout, so every page is tracked with
 * no per-page setup. See src/lib/analytics/tracker.ts.
 */
export default function PageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) events.pageView(pathname);
  }, [pathname]);
  return null;
}
