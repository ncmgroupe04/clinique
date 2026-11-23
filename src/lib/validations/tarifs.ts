import * as z from "zod";

export const createServiceSchema = z.object({
  name: z.string().min(1, "Nom requis.").max(200).trim(),
  price: z.coerce.number().int().min(0, "Prix invalide."),
});

export const updateServiceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Nom requis.").max(200).trim(),
  price: z.coerce.number().int().min(0, "Prix invalide."),
});

export const toggleServiceSchema = z.object({
  id: z.string().uuid(),
  active: z.coerce.boolean(),
});

export type TarifState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;