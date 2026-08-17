import { z } from "zod";

// Shared between the web login/signup Server Actions and the mobile JSON login
// endpoint — a "use server" file can only export async functions, so this schema
// can't live in lib/actions/auth.ts even though that's its main consumer.
export const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
