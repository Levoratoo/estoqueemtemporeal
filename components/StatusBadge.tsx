import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type GridStatus = "Parcial" | "Sem Saldo" | "Com saldo" | "TOTAL";

export const statusConfig: Record<
  GridStatus,
  { label: string; className: string; dot: string; chart: string }
> = {
  Parcial: {
    label: "Parcial",
    className: "border-amber-400/40 bg-amber-500/15 text-amber-200",
    dot: "bg-amber-400",
    chart: "hsl(var(--chart-3))"
  },
  "Sem Saldo": {
    label: "Sem Saldo",
    className: "border-rose-400/40 bg-rose-500/15 text-rose-200",
    dot: "bg-rose-400",
    chart: "hsl(var(--chart-4))"
  },
  "Com saldo": {
    label: "Com saldo",
    className: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
    dot: "bg-emerald-400",
    chart: "hsl(var(--chart-2))"
  },
  TOTAL: {
    label: "TOTAL",
    className: "border-violet-400/40 bg-violet-500/15 text-violet-200",
    dot: "bg-violet-400",
    chart: "hsl(var(--chart-1))"
  }
};

export function StatusBadge({
  status,
  className
}: {
  status: GridStatus | null | undefined;
  className?: string;
}) {
  const config = status ? statusConfig[status] : undefined;
  if (!config) return null;
  return (
    <Badge className={cn("gap-1.5 rounded-full px-2 py-0.5 text-xs", config.className, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </Badge>
  );
}

