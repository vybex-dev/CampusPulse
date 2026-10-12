import { Skeleton } from "@/components/ui/Skeleton";

export default function ElectricityLoading() {
  return (
    <div className="flex flex-col gap-12" aria-busy="true" aria-label="Loading electricity management">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Skeleton className="h-96 w-full rounded-card" />
        </div>
        <div className="flex flex-col gap-8 lg:col-span-3">
          <Skeleton className="h-52 w-full rounded-card" />
          <Skeleton className="h-80 w-full rounded-card" />
        </div>
      </div>
    </div>
  );
}
