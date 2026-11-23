export function formatCfa(value: number): string {
  return `${value.toLocaleString("fr-FR")} F CFA`;
}

export function formatReceipt(year: number, number: number): string {
  return `Reçu ${year}-${String(number).padStart(3, "0")}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}