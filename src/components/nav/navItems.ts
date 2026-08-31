export type NavItem = { href: string; label: string; icon: "home" | "today" | "week" | "goals" | "habits" | "expenses" | "import" | "settings" };

// Desktop sidebar shows everything. Mobile bottom nav deliberately stays to 5 items
// (§21 of the brief: "Do not expose every feature in the bottom navigation") — Habits,
// Expenses, and AI import are reachable via the "More" hub links on the Settings page
// (see settings/page.tsx's MORE_LINKS) instead of taking a bottom-nav slot. (An earlier
// version of this comment claimed those links already existed; they didn't — fixed.)
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/today", label: "Today", icon: "today" },
  { href: "/week", label: "Week", icon: "week" },
  { href: "/goals", label: "Goals", icon: "goals" },
  { href: "/habits", label: "Habits", icon: "habits" },
  { href: "/expenses", label: "Expenses", icon: "expenses" },
  { href: "/import", label: "AI import", icon: "import" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/today", label: "Today", icon: "today" },
  { href: "/week", label: "Week", icon: "week" },
  { href: "/goals", label: "Goals", icon: "goals" },
  { href: "/settings", label: "More", icon: "settings" },
];
