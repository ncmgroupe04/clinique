import * as z from "zod";
import { DEPENSE_CATEGORIES } from "@/lib/depenses";

export const createDepenseSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.")
    .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00`).getTime()), "Date invalide."),
  libelle: z.string().trim().min(1, "Libellé requis.").max(200),
  categorie: z.enum(DEPENSE_CATEGORIES),
  montant: z.coerce.number().int().min(0, "Montant invalide."),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const cancelDepenseSchema = z.object({
  id: z.string().uuid("Dépense introuvable."),
  reason: z
    .string()
    .trim()
    .min(3, "Motif requis (au moins 3 caractères).")
    .max(200),
});
