import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div role="status" aria-label="Cargando el informe">
      <Skeleton className="h-8 w-72 mb-6" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
