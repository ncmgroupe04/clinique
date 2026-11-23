import * as z from "zod";

export const signupSchema = z.object({
  email: z.string().email("Adresse e-mail invalide.").trim(),
  password: z
    .string()
    .min(8, "Au moins 8 caractères.")
    .regex(/[a-zA-Z]/, "Au moins une lettre.")
    .regex(/[0-9]/, "Au moins un chiffre.")
    .trim(),
  structureName: z.string().min(2, "Nom de la structure requis.").trim(),
  fullName: z.string().min(2, "Nom et prénom requis.").trim(),
});

export const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide.").trim(),
  password: z.string().min(1, "Mot de passe requis.").trim(),
});

export type SignupState =
  | { errors?: Record<string, string[]>; message?: string; success?: boolean }
  | undefined;
export type LoginState =
  | { errors?: Record<string, string[]>; message?: string }
  | undefined;