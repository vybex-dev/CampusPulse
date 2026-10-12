import { Skeleton } from "@/components/ui/Skeleton";

export default function ReportLoading() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12 pb-16" aria-busy="true" aria-label="Generating impact report">
      <Skeleton className="h-24 w-full rounded-card" />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-card" />
        <Skeleton className="h-48 w-full rounded-card" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-36 w-full rounded-card" />
        <Skeleton className="h-36 w-full rounded-card" />
        <Skeleton className="h-36 w-full rounded-card" />
      </div>

      <Skeleton className="h-64 w-full rounded-card" />
      <Skeleton className="h-64 w-full rounded-card" />
    </div>
  );
}
