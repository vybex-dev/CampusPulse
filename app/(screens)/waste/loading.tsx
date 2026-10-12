import { Skeleton } from "@/components/ui/Skeleton";

export default function WasteLoading() {
  return (
    <div className="flex flex-col gap-12" aria-busy="true" aria-label="Loading waste lab">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-64 rounded-control" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 flex flex-col gap-4">
          <Skeleton className="h-96 w-full rounded-card" />
        </div>
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Skeleton className="h-48 w-full rounded-card" />
          <Skeleton className="h-48 w-full rounded-card" />
          <Skeleton className="h-48 w-full rounded-card" />
        </div>
      </div>
    </div>
  );
}
