import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { getOptionalUser } from "@/lib/auth/dal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Planner",
  description: "A calm, personal command centre for your year, week, and day.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getOptionalUser();
  const dataTheme = user && user.theme !== "SYSTEM" ? user.theme.toLowerCase() : undefined;

  return (
    <html lang="en" data-theme={dataTheme} className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
