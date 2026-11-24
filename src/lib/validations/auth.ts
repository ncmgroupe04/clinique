import * as z from "zod";

export const signupSchema = z.object({
  email: z.string().email("Adresse e-mail invalide.").trim(),
  password: z
    .string()
    .min(8, "Au moins 8 caractères.")
    .regex(/[A-Z]/, "Au moins une majuscule.")
    .regex(/[a-z]/, "Au moins une minuscule.")
    .regex(/[0-9]/, "Au moins un chiffre.")
    .regex(/[^A-Za-z0-9]/, "Au moins un caractère spécial.")
    .trim(),
  structureName: z.string().min(2, "Nom de la structure trop court (2 caractères minimum).").trim(),
  fullName: z.string().min(3, "Nom et prénom trop courts (3 caractères minimum).").trim(),
  address: z.string().min(5, "Adresse trop courte (5 caractères minimum).").max(300).trim(),
  phone: z.string().regex(/^\d{9}$/, "Le téléphone doit contenir exactement 9 chiffres."),
  headerText: z.string().max(500).trim().optional().or(z.literal("")),
  confirmPassword: z.string().trim().optional().or(z.literal("")),
}).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmPassword"],
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