import * as z from "zod";

export const createTicketSchema = z.object({
  patient_name: z.string().min(1, "Nom et prénom requis.").max(200).trim(),
  service_id: z.string().uuid().optional().or(z.literal("")),
  other_label: z.string().max(200).trim().optional().or(z.literal("")),
  other_price: z.coerce.number().int().min(0).optional(),
  advance: z.coerce.number().int().min(0),
  total_override: z.coerce.number().int().min(0).optional(),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
});

export type CreateTicketState =
  | { errors?: Record<string, string[]>; message?: string; ticketId?: string }
  | undefined;