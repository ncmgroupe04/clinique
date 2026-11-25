import * as z from "zod";
import { PAYMENT_METHOD_VALUES } from "@/lib/payments";

export const addPaymentSchema = z
  .object({
    ticket_id: z.string().uuid().optional(),
    invoice_id: z.string().uuid().optional(),
    amount: z.coerce.number().int().positive("Montant invalide."),
    method: z.enum(PAYMENT_METHOD_VALUES),
    note: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((d) => (d.ticket_id ? 1 : 0) + (d.invoice_id ? 1 : 0) === 1, {
    message: "Un seul document doit être renseigné.",
    path: ["ticket_id"],
  });
