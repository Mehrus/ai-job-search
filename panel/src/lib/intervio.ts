/**
 * Links from an offer to matching practice in Intervio (Patryk's interview-prep
 * app). Intervio's catalog filters by `tags` (any-of), `difficulty` and a
 * subcategory path, e.g. /catalog/it/frontend/angular?tags=tag-rxjs&difficulty=mid,senior
 */

export interface IntervioTopic {
  /** Intervio seed tag id; null when Intervio has no tag for it. */
  tag: string | null;
  /** Free-text catalog search used instead of a tag (e.g. signals has no tag of its own). */
  search?: string;
  label: string;
}

const TOPICS: { pattern: RegExp; tag: string | null; search?: string; label: string }[] = [
  { pattern: /\brxjs\b|observable/i, tag: "tag-rxjs", label: "RxJS" },
  { pattern: /\bngrx\b|signal ?store|state management|\bstore\b|redux/i, tag: "tag-state-management", label: "State management" },
  { pattern: /\bsignals?\b/i, tag: null, search: "signal", label: "Signals" },
  { pattern: /forms?\b|formularz/i, tag: "tag-forms", label: "Forms" },
  { pattern: /routing|router/i, tag: "tag-routing", label: "Routing" },
  { pattern: /dependency injection|\bDI\b/, tag: "tag-dependency-injection", label: "DI" },
  { pattern: /\bssr\b|server-side rendering|hydration/i, tag: "tag-ssr", label: "SSR" },
  { pattern: /performance|wydajno/i, tag: "tag-performance", label: "Performance" },
  { pattern: /\btest|jest|vitest|karma|jasmine|cypress|playwright/i, tag: "tag-testing", label: "Testing" },
  { pattern: /typescript|\bts\b/i, tag: "tag-typescript", label: "TypeScript" },
  { pattern: /security|xss|owasp|\bauth/i, tag: "tag-security", label: "Security" },
  { pattern: /accessib|a11y|wcag/i, tag: "tag-accessibility", label: "Accessibility" },
  { pattern: /architect|system design|micro.?frontend/i, tag: "tag-system-design", label: "Architecture" },
  { pattern: /\bcss\b|scss|sass|tailwind/i, tag: "tag-css", label: "CSS" },
  { pattern: /\bc#|\.net\b|asp\.net|\bdotnet\b|entity framework|ef core/i, tag: "tag-dotnet", label: ".NET / C#" },
  { pattern: /\bjava\b|spring/i, tag: null, label: "Java / Spring" },
  { pattern: /\bsql\b|oracle|postgres|database/i, tag: null, label: "SQL" },
  { pattern: /kubernetes|\bk8s\b|docker|azure|aws|\bci\/cd\b|jenkins/i, tag: null, label: "DevOps / cloud" },
];

export function intervioTopics(texts: (string | null | undefined)[]): IntervioTopic[] {
  const text = texts.filter(Boolean).join("\n");
  const seen = new Set<string>();
  const out: IntervioTopic[] = [];
  for (const t of TOPICS) {
    if (!t.pattern.test(text) || seen.has(t.label)) continue;
    seen.add(t.label);
    out.push({ tag: t.tag, search: t.search, label: t.label });
  }
  return out;
}

export function intervioBase(): string {
  return (process.env.INTERVIO_URL ?? "http://localhost:3001").replace(/\/+$/, "");
}

export function intervioCatalogUrl(
  base: string,
  { title, tags, search }: { title: string; tags: string[]; search?: string },
): string {
  // A fullstack title spans subcategories (e.g. Angular + .NET), so search the whole IT catalog.
  const path = /\.net|c#|java|fullstack|full-stack/i.test(title)
    ? "/catalog/it"
    : /angular/i.test(title)
    ? "/catalog/it/frontend/angular"
    : /react|next\.?js/i.test(title)
      ? "/catalog/it/frontend/react"
      : "/catalog/it/frontend";
  const params = new URLSearchParams();
  const uniqueTags = [...new Set(tags)];
  if (uniqueTags.length) params.set("tags", uniqueTags.join(","));
  if (search) params.set("q", search);
  params.set("difficulty", /senior|lead|principal|staff/i.test(title) ? "mid,senior" : "junior,mid");
  // URLSearchParams encodes "," as %2C; Intervio splits on ",", which survives decoding either way.
  return `${base}${path}?${params.toString()}`;
}
