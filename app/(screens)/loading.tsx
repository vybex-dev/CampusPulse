import { Skeleton } from "@/components/ui/Skeleton";

export default function ScreensLoading() {
  return (
    <div className="flex flex-col gap-12" aria-busy="true" aria-label="Loading page content">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-36 w-full rounded-card" />
        <Skeleton className="h-36 w-full rounded-card" />
        <Skeleton className="h-36 w-full rounded-card" />
        <Skeleton className="h-36 w-full rounded-card" />
      </div>

      {/* Main Section Skeleton */}
      <Skeleton className="h-80 w-full rounded-card" />
    </div>
  );
}
