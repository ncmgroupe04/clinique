import * as z from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Adresse e-mail invalide.").trim(),
  password: z
    .string()
    .min(8, "Au moins 8 caractères.")
    .regex(/[a-zA-Z]/, "Au moins une lettre.")
    .regex(/[0-9]/, "Au moins un chiffre.")
    .trim(),
  full_name: z.string().min(2, "Nom et prénom requis.").trim(),
  role: z.enum(["cashier", "structure_admin", "docteur"]),
});

export const updateUserSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().min(2, "Nom et prénom requis.").trim(),
  email: z.string().email("Adresse e-mail invalide.").trim(),
});

export const resetPasswordSchema = z.object({
  user_id: z.string().uuid(),
  password: z
    .string()
    .min(8, "Au moins 8 caractères.")
    .regex(/[a-zA-Z]/, "Au moins une lettre.")
    .regex(/[0-9]/, "Au moins un chiffre.")
    .trim(),
});

export type UserState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;