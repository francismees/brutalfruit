import { z } from "zod";

/**
 * Light, client-safe phone shape check. The strict E.164 normalization runs
 * server-side in `lib/milan-brunch/phone.ts` (which pulls libphonenumber-js).
 * Keeping that out of the client bundle saves ~145KB.
 */
const PHONE_SHAPE = /^[+0-9][0-9\s\-()]{6,19}$/;

export const rsvpSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name is too short")
    .max(80, "Full name is too long"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
    .regex(PHONE_SHAPE, "Enter a valid phone number"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email"),
  hp_company: z
    .string()
    .max(0, "Bot detected")
    .optional()
    .transform((v) => v ?? ""),
});

export type RsvpInput = z.infer<typeof rsvpSchema>;
