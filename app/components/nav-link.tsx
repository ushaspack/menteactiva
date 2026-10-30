"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 h-10 px-3 rounded-md text-sm border-l-[3px] whitespace-nowrap ${
        active ? "bg-surface border-l-accent" : "border-l-transparent hover:bg-surface"
      }`}
    >
      {children}
    </Link>
  );
}
