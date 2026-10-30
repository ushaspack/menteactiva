import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div role="status" aria-label="Cargando la tarea">
      <Skeleton className="h-8 w-64 mb-6" />
      <Skeleton className="h-12 w-full mb-2" />
      <Skeleton className="h-12 w-full mb-2" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
