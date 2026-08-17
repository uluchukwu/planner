"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { NAV_ITEMS } from "@/components/nav/navItems";
import { NavIcon } from "@/components/nav/NavIcon";
import { logout } from "@/lib/actions/auth";

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:justify-between md:border-r md:border-hairline md:bg-surface md:py-6 md:px-4">
      <div>
        <div className="px-2 pb-8">
          <p className="text-sm font-semibold tracking-tight text-ink">Planner</p>
          <p className="text-xs text-ink-soft mt-0.5 truncate">{userName}</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-accent-soft text-accent-strong" : "text-ink-soft hover:bg-surface-sunken hover:text-ink"
                )}
              >
                <NavIcon icon={item.icon} className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <form action={logout}>
        <button type="submit" className="w-full text-left rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-surface-sunken hover:text-ink transition-colors">
          Log out
        </button>
      </form>
    </aside>
  );
}
