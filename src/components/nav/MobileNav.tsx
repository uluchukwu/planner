"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { MOBILE_NAV_ITEMS } from "@/components/nav/navItems";
import { NavIcon } from "@/components/nav/NavIcon";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex border-t border-hairline bg-surface/95 backdrop-blur px-1 pb-[env(safe-area-inset-bottom)]">
      {MOBILE_NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
              active ? "text-accent-strong" : "text-ink-soft"
            )}
          >
            <NavIcon icon={item.icon} className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
