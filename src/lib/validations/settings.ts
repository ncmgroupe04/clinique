import * as z from "zod";

export const settingsSchema = z.object({
  name: z.string().min(1, "Nom requis.").max(200).trim(),
  address: z.string().max(300).trim().optional().or(z.literal("")),
  phone: z.string().max(40).trim().optional().or(z.literal("")),
  header_text: z.string().max(500).trim().optional().or(z.literal("")),
  paper_width_mm: z.coerce.number().refine((v) => v === 58 || v === 80, {
    message: "Largeur invalide.",
  }),
  print_format: z.enum(["80", "58", "a6"]).optional(),
});

export type SettingsState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;