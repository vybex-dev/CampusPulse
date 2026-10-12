import { Skeleton } from "@/components/ui/Skeleton";

export default function TicketsLoading() {
  return (
    <div className="flex flex-col gap-12" aria-busy="true" aria-label="Loading action queue">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-48 rounded-control" />
      </div>

      <Skeleton className="h-16 w-full rounded-card" />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 items-start">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-card bg-canvas/60 p-3 border border-hairline">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-32 w-full rounded-card" />
            <Skeleton className="h-32 w-full rounded-card" />
          </div>
        ))}
      </div>
    </div>
  );
}
