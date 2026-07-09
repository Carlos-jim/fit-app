import { useEffect, useRef } from "react";
import * as Linking from "expo-linking";

export interface DeepLinkPayload {
  /** Path of the incoming URL, lower-cased and trimmed. */
  path: string;
  /** All query params parsed from the URL. */
  params: Record<string, string>;
}

/**
 * Subscribe to `bioma://` deep links and call `onLink` whenever one
 * arrives. Handles both the cold-start case (URL on app launch) and
 * the warm case (URL while the app is already open).
 *
 * Supported routes:
 *   bioma://reset-password?token=...
 *   bioma://verify-email?token=...&email=...
 */
export function useDeepLinks(onLink: (payload: DeepLinkPayload) => void): void {
  const handlerRef = useRef(onLink);
  handlerRef.current = onLink;

  useEffect(() => {
    let cancelled = false;

    const dispatch = (url: string | null) => {
      if (!url || cancelled) return;
      const parsed = parseDeepLink(url);
      if (!parsed) return;
      handlerRef.current(parsed);
    };

    // Cold-start: the app was launched by a deep link.
    void Linking.getInitialURL().then(dispatch);

    // Warm: the OS hands us the URL while we're already running.
    const sub = Linking.addEventListener("url", ({ url }) => dispatch(url));

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);
}

export function parseDeepLink(url: string): DeepLinkPayload | null {
  try {
    // `Linking.parse` strips the scheme and returns `{ path, queryParams }`.
    const parsed = Linking.parse(url);
    if (!parsed.path) return null;
    return {
      path: parsed.path.toLowerCase(),
      params: (parsed.queryParams ?? {}) as Record<string, string>,
    };
  } catch {
    return null;
  }
}