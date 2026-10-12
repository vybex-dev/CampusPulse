import { Skeleton } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-10 pb-16" aria-busy="true" aria-label="Loading system settings">
      <div className="flex flex-col justify-between gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-40 rounded-control" />
          <Skeleton className="h-9 w-36 rounded-control" />
        </div>
      </div>

      <Skeleton className="h-44 w-full rounded-card" />
      <Skeleton className="h-44 w-full rounded-card" />
      <Skeleton className="h-64 w-full rounded-card" />
      <Skeleton className="h-72 w-full rounded-card" />
    </div>
  );
}
