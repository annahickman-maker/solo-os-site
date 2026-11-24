"use client";

import { useEffect } from "react";

/**
 * Drops the query string from the address bar (e.g. Stripe's ?session_id=),
 * so it is not kept in bookmarks, shared links or screenshots. The page never
 * reads it.
 */
export default function ScrubQuery() {
  useEffect(() => {
    if (window.location.search) history.replaceState(null, "", window.location.pathname + window.location.hash);
  }, []);
  return null;
}
