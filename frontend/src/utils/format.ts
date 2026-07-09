/**
 * Display helpers shared across screens.
 */

/**
 * Get the first given name from a full name string. Falls back to a
 * placeholder when the input is empty / whitespace.
 *
 * Unlike `name.split(" ")[0]` this preserves compound first names like
 * "María José López" (returns "María José"). It also detects Dutch /
 * Spanish surname particles like "van", "de", "von" so that
 * "Wouter van der Berg" returns "Wouter" rather than "Wouter van".
 *
 * The heuristic is intentionally simple: no dictionary, no locale
 * detection. Edge cases (mononyms, single-name cultures) still get a
 * sensible default.
 */
export function getFirstName(fullName: string, fallback = "Bioma"): string {
  const trimmed = fullName.trim();
  if (!trimmed) return fallback;

  const parts = trimmed.split(/\s+/u);
  if (parts.length === 1) return parts[0]!;

  const first = parts[0]!;
  const second = parts[1]!;

  // Surname particle: "van", "de", "von", "del", "la", "le", "du"…
  // All-lowercase second token means it almost certainly is not a
  // second given name.
  if (/^[a-záéíóúñü]/u.test(second)) {
    return first;
  }

  // Two tokens: assume the second is the surname.
  if (parts.length === 2) return first;

  // Three or more: assume the third token is the start of the surname
  // and that the second token is a second given name. This matches
  // the most common Latin American convention where "María José López"
  // has given names "María José" and surname "López".
  return `${first} ${second}`;
}

/**
 * Strict numeric clamp. Avoids the repeated `Math.min(Math.max(x, 0), 1)`
 * pattern that was scattered across the app.
 */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}