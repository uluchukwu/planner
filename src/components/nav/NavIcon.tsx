import { NavItem } from "@/components/nav/navItems";

const PATHS: Record<NavItem["icon"], string> = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5",
  today: "M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm3 8h3v3H8v-3Z",
  week: "M4 6h16M4 6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1M4 6V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v1M4 11h16",
  goals: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-2.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  habits: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3.5-8.5 2.25 2.25L15.5 10",
  expenses: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v2m0 8v2m2.3-8.5a2.1 2.1 0 0 0-2-1.3h-.6a1.9 1.9 0 1 0 0 3.8h.6a1.9 1.9 0 1 1 0 3.8h-.6a2.1 2.1 0 0 1-2-1.3",
  settings:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 13.5c.04-.33.06-.66.06-1s-.02-.67-.06-1l2.05-1.6a.5.5 0 0 0 .12-.63l-1.94-3.36a.5.5 0 0 0-.6-.22l-2.42.97a7.4 7.4 0 0 0-1.73-1l-.37-2.58a.5.5 0 0 0-.5-.43h-3.88a.5.5 0 0 0-.5.43l-.37 2.58c-.63.24-1.2.58-1.73 1l-2.42-.97a.5.5 0 0 0-.6.22L2.55 9.27a.5.5 0 0 0 .12.63L4.72 11.5c-.04.33-.06.66-.06 1s.02.67.06 1l-2.05 1.6a.5.5 0 0 0-.12.63l1.94 3.36c.12.22.38.3.6.22l2.42-.97c.53.42 1.1.76 1.73 1l.37 2.58c.05.25.26.43.5.43h3.88c.24 0 .45-.18.5-.43l.37-2.58c.63-.24 1.2-.58 1.73-1l2.42.97c.22.08.48 0 .6-.22l1.94-3.36a.5.5 0 0 0-.12-.63L19.4 13.5Z",
};

export function NavIcon({ icon, className }: { icon: NavItem["icon"]; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d={PATHS[icon]} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
