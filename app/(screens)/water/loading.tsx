import { Skeleton } from "@/components/ui/Skeleton";

export default function WaterLoading() {
  return (
    <div className="flex flex-col gap-12" aria-busy="true" aria-label="Loading water management">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-80 rounded-control" />
      </div>

      <Skeleton className="h-52 w-full rounded-card" />
      <Skeleton className="h-80 w-full rounded-card" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-card" />
        <Skeleton className="h-72 w-full rounded-card" />
      </div>
    </div>
  );
}
