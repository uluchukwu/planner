export type NavItem = { href: string; label: string; icon: "home" | "today" | "week" | "goals" | "habits" | "expenses" | "import" | "settings" };

// Desktop sidebar shows everything. Mobile bottom nav deliberately stays to 5 items
// (§21 of the brief: "Do not expose every feature in the bottom navigation") — Habits
// and Expenses are reachable from the Week page and Settings-adjacent links on mobile
// instead of taking a bottom-nav slot.
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
