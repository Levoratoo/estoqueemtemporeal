import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonBlocks() {
  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="glass-card rounded-2xl p-4">
            <Skeleton className="mb-3 h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="glass-card rounded-2xl p-6">
            <Skeleton className="mb-4 h-5 w-40" />
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>
      <div className="glass-card rounded-2xl p-6">
        <Skeleton className="mb-4 h-5 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
