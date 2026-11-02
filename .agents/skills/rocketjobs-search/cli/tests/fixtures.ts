// Synthetic offer modelled on the live API shape (verified 2026-11-02).
export const OFFER = {
  guid: "00000000-0000-0000-0000-000000000001",
  slug: "acme-senior-react-developer-warszawa-javascript",
  title: "Senior React Developer",
  workplaceType: "hybrid",
  workingTime: "full_time",
  experienceLevel: "senior",
  city: "Warszawa",
  companyName: "Acme",
  publishedAt: "2026-11-02T10:00:00.000Z",
  expiredAt: "2026-12-02T22:59:59.999Z",
  locations: [
    { city: "Warszawa", slug: "acme-senior-react-developer-warszawa-javascript" },
    { city: "Kraków", slug: "acme-senior-react-developer-krakow-javascript" },
  ],
  employmentTypes: [
    { from: 20000, fromPerUnit: 20000, to: 28000, toPerUnit: 28000, currency: "PLN", currencySource: "original", type: "b2b", unit: "Month", gross: false },
    { from: 4600, fromPerUnit: 4600, to: 6400, toPerUnit: 6400, currency: "EUR", currencySource: "conversion", type: "b2b", unit: "Month", gross: false },
    { from: 16000, fromPerUnit: 16000, to: 22000, toPerUnit: 22000, currency: "PLN", currencySource: "original", type: "permanent", unit: "Month", gross: true },
  ],
  requiredSkills: [{ name: "React" }, { name: "TypeScript" }],
  niceToHaveSkills: [{ name: "Next.js" }],
}
