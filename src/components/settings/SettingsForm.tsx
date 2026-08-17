"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { updateSettings } from "@/lib/actions/settings";
import { Weekday, ThemePreference } from "@/generated/prisma/enums";

const WEEKDAYS: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export function SettingsForm({
  initial,
}: {
  initial: {
    name: string;
    weekStartsOn: Weekday;
    currency: string;
    theme: ThemePreference;
    defaultWorkStartHour: number;
    defaultWorkEndHour: number;
    notificationsEnabled: boolean;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await updateSettings({
        name: String(formData.get("name") ?? ""),
        weekStartsOn: formData.get("weekStartsOn") as Weekday,
        currency: String(formData.get("currency") ?? "USD").toUpperCase(),
        theme: formData.get("theme") as ThemePreference,
        defaultWorkStartHour: Number(formData.get("defaultWorkStartHour")),
        defaultWorkEndHour: Number(formData.get("defaultWorkEndHour")),
        notificationsEnabled: formData.get("notificationsEnabled") === "on",
      });
      setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5 max-w-md">
      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={initial.name} required />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="theme">Theme</Label>
        <Select id="theme" name="theme" defaultValue={initial.theme}>
          <option value="SYSTEM">System</option>
          <option value="LIGHT">Light</option>
          <option value="DARK">Dark</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="weekStartsOn">Week starts on</Label>
        <Select id="weekStartsOn" name="weekStartsOn" defaultValue={initial.weekStartsOn}>
          {WEEKDAYS.map((day) => (
            <option key={day} value={day}>{day.charAt(0) + day.slice(1).toLowerCase()}</option>
          ))}
        </Select>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <Label htmlFor="defaultWorkStartHour">Working hours start</Label>
          <Input id="defaultWorkStartHour" name="defaultWorkStartHour" type="number" min={0} max={23} defaultValue={initial.defaultWorkStartHour} />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <Label htmlFor="defaultWorkEndHour">Working hours end</Label>
          <Input id="defaultWorkEndHour" name="defaultWorkEndHour" type="number" min={1} max={24} defaultValue={initial.defaultWorkEndHour} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="currency">Currency (ISO code)</Label>
        <Input id="currency" name="currency" defaultValue={initial.currency} maxLength={3} className="uppercase" />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="notificationsEnabled" defaultChecked={initial.notificationsEnabled} className="h-4 w-4 rounded border-hairline" />
        Enable notifications
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        {saved && !pending && <span className="text-xs text-accent-strong">Saved</span>}
      </div>
    </form>
  );
}
