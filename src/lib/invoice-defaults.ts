/**
 * Tableau de facturation standard imposé aux NOUVELLES structures.
 * Les structures déjà inscrites conservent leur modèle existant : ce modèle
 * n'est écrit qu'au moment de la création d'une structure.
 */
export const STANDARD_INVOICE_SETTINGS = {
  title: "Facture",
  number_prefix: "",
  show_date: true,
  show_indice: true,
  show_quantity: true,
  show_unit_price: true,
  show_discount: true,
  show_advance: true,
  show_stamp: true,
  show_logo: true,
  doctor_name: "",
  practice_line: "",
  intro_text: "",
  legal_footer: "",
  merge_rows: true,
  columns: [
    { key: "quantite", label: "QTE", source: "quantite", visible: true, span: 1 },
    { key: "designations", label: "DESIGNATIONS", source: "texte", visible: true, span: 1 },
    { key: "prix_unitaire", label: "P. UNITAIRE", source: "prix_unitaire", visible: true, span: 1 },
    { key: "total", label: "P. TOTAL", source: "total", visible: true, span: 1 },
  ],
  extra_rows: [],
} as const;
