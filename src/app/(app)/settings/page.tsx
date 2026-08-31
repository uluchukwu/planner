import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { NavIcon } from "@/components/nav/NavIcon";

// The mobile bottom nav deliberately caps at 5 items and calls this page "More" —
// but nothing ever linked Habits/Expenses/AI import from anywhere reachable on a
// narrow viewport, so they were completely unreachable there, not just "harder to
// find" as the old docs claimed. This section is what makes "More" actually true.
// md:hidden because desktop already has every item in the sidebar.
const MORE_LINKS = [
  { href: "/habits", label: "Habits", icon: "habits" as const },
  { href: "/expenses", label: "Expenses", icon: "expenses" as const },
  { href: "/import", label: "AI import", icon: "import" as const },
];

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <h1 className="text-xl font-semibold text-ink tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-ink-soft mb-6">{user.email}</p>

      <div className="md:hidden grid grid-cols-3 gap-2 mb-6">
        {MORE_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-hairline bg-surface py-3 text-xs font-medium text-ink-soft hover:bg-surface-sunken"
          >
            <NavIcon icon={item.icon} className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </div>

      <SettingsForm
        initial={{
          name: user.name ?? "",
          weekStartsOn: user.weekStartsOn,
          currency: user.currency,
          theme: user.theme,
          defaultWorkStartHour: user.defaultWorkStartHour,
          defaultWorkEndHour: user.defaultWorkEndHour,
          notificationsEnabled: user.notificationsEnabled,
        }}
      />
    </div>
  );
}
