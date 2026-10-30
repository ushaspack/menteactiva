import { logoutAction } from "@/app/actions";
import { listClassesFor } from "@/lib/data";
import type { User } from "@/lib/types";
import { buttonClass, Wordmark } from "./ui";
import { NavLink } from "./nav-link";
import { UpdateBanner, VersionLine } from "./update-banner";

export function Shell({ user, children }: { user: User; children: React.ReactNode }) {
  const classes = listClassesFor(user);
  const initials = user.name.split(" ").filter((p) => /^\p{Lu}/u.test(p) && !p.endsWith(".")).slice(0, 2).map((p) => p[0]).join("");

  return (
    <div className="min-h-screen grid grid-rows-[auto_var(--header-height)_1fr] lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] grid-cols-[minmax(0,1fr)]">
      <div className="lg:col-span-2"><UpdateBanner /></div>
      <header className="lg:col-span-2 flex items-center justify-between gap-3 px-4 lg:px-6 border-b border-border">
        <Wordmark />
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-text-muted">{user.name}</span>
          <span className="grid place-items-center size-8 rounded-full bg-surface-raised border border-border-input text-xs font-medium" aria-hidden="true">
            {initials}
          </span>
          <form action={logoutAction}>
            <button className={buttonClass("ghost", true)}>Salir</button>
          </form>
        </div>
      </header>

      <nav aria-label="Principal" className="hidden lg:block border-r border-border p-4">
        <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium mt-2 mb-2">Menú</h2>
        <NavLink href="/clases" exact>Mis clases</NavLink>
        {user.role === "docente" ? <NavLink href="/clases/nueva">Crear clase</NavLink> : null}
        {classes.length > 0 ? (
          <>
            <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium mt-6 mb-2">Clases</h2>
            {classes.map((c) => (
              <NavLink key={c.id} href={`/clases/${c.id}`}>
                <span className="truncate">{c.title}</span>
              </NavLink>
            ))}
          </>
        ) : null}
        <VersionLine />
      </nav>

      <div className="min-w-0">
        <nav aria-label="Principal (móvil)" className="lg:hidden flex gap-2 px-4 pt-3 overflow-x-auto">
          <NavLink href="/clases" exact>Mis clases</NavLink>
          {user.role === "docente" ? <NavLink href="/clases/nueva">Crear clase</NavLink> : null}
        </nav>
        <main className="p-4 sm:p-6 lg:p-8 pb-16 max-w-content">{children}</main>
      </div>
    </div>
  );
}
