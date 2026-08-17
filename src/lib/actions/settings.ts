"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth/dal";
import { Weekday, ThemePreference } from "@/generated/prisma/enums";

export async function updateSettings(fields: Partial<{
  name: string;
  weekStartsOn: Weekday;
  currency: string;
  theme: ThemePreference;
  timezone: string;
  defaultWorkStartHour: number;
  defaultWorkEndHour: number;
  notificationsEnabled: boolean;
}>) {
  const { userId } = await verifySession();
  await db.user.update({ where: { id: userId }, data: fields });
  revalidatePath("/", "layout");
}
