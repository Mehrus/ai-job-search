// Synthetic rows modelled on the live API shape (verified 2026-11-02). The
// search API returns one row per location of an offer, sharing `reference`.
const base = {
  name: "Acme",
  posted: Date.parse("2026-10-20T10:00:00.000Z"),
  renewed: Date.parse("2026-11-02T10:00:00.000Z"),
  title: "Senior React Developer",
  category: "frontend",
  seniority: ["Senior"],
  reference: "ABCD1234",
  salary: { from: 20000, to: 28000, type: "b2b", currency: "PLN", period: "Month", containsSalary: "VISIBLE" },
  tiles: {
    values: [
      { value: "frontend", type: "category" },
      { value: "React", type: "requirement" },
      { value: "TypeScript", type: "requirement" },
    ],
  },
}

const places = [
  { city: "Warszawa", url: "senior-react-developer-acme-warszawa" },
  { city: "Kraków", url: "senior-react-developer-acme-krakow" },
  { province: "masovian", url: "senior-react-developer-acme-masovian", provinceOnly: true },
]

export const ROW_WARSZAWA = {
  ...base,
  id: "senior-react-developer-acme-Warszawa",
  url: "senior-react-developer-acme-warszawa",
  location: { places, fullyRemote: false, type: "hybrid" },
}

export const ROW_KRAKOW = {
  ...base,
  id: "senior-react-developer-acme-Kraków",
  url: "senior-react-developer-acme-krakow",
  location: { places: [places[1], places[0], places[2]], fullyRemote: false, type: "hybrid" },
}

export const DETAIL = {
  id: "senior-react-developer-acme-warszawa",
  postingUrl: "senior-react-developer-acme-warszawa",
  reference: "ABCD1234",
  title: "Senior React Developer",
  basics: { category: "frontend", seniority: ["Senior"], technology: "React" },
  company: { name: "Acme", size: "50 - 199", url: "" },
  details: { description: "<h3>About</h3><p>About &amp; us</p>" },
  location: { places, remote: 0 },
  essentials: {
    originalSalary: {
      currency: "PLN",
      types: {
        b2b: { period: "Hour", range: [120, 160] },
        permanent: { period: "Month", range: [16000, 22000] },
      },
      containsSalary: "VISIBLE",
    },
  },
  requirements: {
    musts: [{ value: "React", type: "main" }, { value: "TypeScript", type: "main" }],
    nices: [{ value: "Next.js", type: "main" }],
    description: "<ul><li>5+ years</li></ul>",
    languages: [{ type: "MUST", code: "en" }],
  },
  specs: { dailyTasks: ["Build UI", "Review code"] },
  benefits: { benefits: ["Sport subscription"] },
  apply: { option: "email", externalPortalLinks: [] },
  consents: { infoClause: "Administrator…", personalDataRequestLink: "hr@acme.example" },
  posted: Date.parse("2026-10-20T10:00:00.000Z"),
  expiresAt: "2026-11-20T23:59:59",
  status: "PUBLISHED",
}
