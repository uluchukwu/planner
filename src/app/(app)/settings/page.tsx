import { getCurrentUser } from "@/lib/auth/dal";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <h1 className="text-xl font-semibold text-ink tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-ink-soft mb-6">{user.email}</p>
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
