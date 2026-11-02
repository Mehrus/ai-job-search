/** Polish names for the /outcome stage labels; anything else is shown as written. */
const STAGE_LABELS: Record<string, string> = {
  "phone screen": "Rozmowa wstępna",
  "technical interview": "Rozmowa techniczna",
  "case interview": "Zadanie / case",
  "final round": "Rozmowa finalna",
  "offer received": "Oferta",
};

export function stageLabel(label: string): string {
  return STAGE_LABELS[label.trim().toLowerCase()] ?? label;
}

/** "2026-11-10 14:00" -> "10.11.2026, 14:00" */
export function formatWhen(when: string): string {
  const [date, time] = when.split(" ");
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}${time ? `, ${time}` : ""}`;
}
