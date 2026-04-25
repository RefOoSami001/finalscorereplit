/**
 * Tiny cookie jar for forwarding session cookies between requests
 * to the Minia University portal. Handles only what we need:
 * collecting Set-Cookie headers and emitting a Cookie header.
 */
export class CookieJar {
  private cookies: Map<string, string> = new Map();

  ingest(headers: Headers): void {
    const setCookieHeaders = headers.getSetCookie?.() ?? [];
    for (const raw of setCookieHeaders) {
      const firstPair = raw.split(";", 1)[0];
      if (!firstPair) continue;
      const eq = firstPair.indexOf("=");
      if (eq <= 0) continue;
      const name = firstPair.slice(0, eq).trim();
      const value = firstPair.slice(eq + 1).trim();
      if (name) this.cookies.set(name, value);
    }
  }

  header(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}
