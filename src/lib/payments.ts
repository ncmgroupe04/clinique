export const PAYMENT_METHOD_VALUES = [
  "especes",
  "wave",
  "orange_money",
  "banque",
  "autre",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "especes", label: "Espèces" },
  { value: "wave", label: "Wave" },
  { value: "orange_money", label: "Orange Money" },
  { value: "banque", label: "Banque" },
  { value: "autre", label: "Autre" },
];

export function paymentMethodLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}

export type OutstandingDocument = {
  type: "ticket" | "facture";
  id: string;
  reference: string;
  patient_name: string;
  total: number;
  advance: number;
  remaining: number;
  created_at: string;
};
