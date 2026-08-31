"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createPasswordResetToken, consumePasswordResetToken } from "@/lib/auth/passwordReset";
import { sendPasswordResetEmail } from "@/lib/email/resend";

export type ResetFormState = { error?: string; success?: string } | undefined;

const emailSchema = z.string().trim().email("Enter a valid email address.");

export async function requestPasswordReset(_prevState: ResetFormState, formData: FormData): Promise<ResetFormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const user = await db.user.findUnique({ where: { email: parsed.data } });
  // Deliberately identical response whether or not the account exists -- confirming
  // or denying an email is registered is exactly what a password-reset form should
  // never leak.
  if (user) {
    const token = await createPasswordResetToken(user.id);
    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3100";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch {
      return { error: "Couldn't send the reset email. Try again shortly." };
    }
  }

  return { success: "If an account exists for that email, a password reset link is on its way." };
}

const newPasswordSchema = z.object({
  token: z.string().min(1, "Missing reset token."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function resetPassword(_prevState: ResetFormState, formData: FormData): Promise<ResetFormState> {
  const parsed = newPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const userId = await consumePasswordResetToken(parsed.data.token);
  if (!userId) return { error: "This reset link is invalid or has expired. Request a new one." };

  await db.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(parsed.data.password) } });
  redirect("/login");
}
