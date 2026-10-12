import { Skeleton } from "@/components/ui/Skeleton";

export default function SimulatorLoading() {
  return (
    <div className="flex flex-col gap-12 pb-12" aria-busy="true" aria-label="Loading what-if simulator">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      <Skeleton className="h-16 w-full rounded-card" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-44 w-full rounded-card" />
        <Skeleton className="h-44 w-full rounded-card" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Skeleton className="h-96 w-full rounded-card" />
        </div>
        <div className="lg:col-span-5">
          <Skeleton className="h-96 w-full rounded-card" />
        </div>
      </div>
    </div>
  );
}
