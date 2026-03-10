import { AlertTriangle, BarChart3, CheckCircle2, Sigma } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { statusConfig, type GridStatus } from "./StatusBadge";

export type KpiEntry = {
  statusGrid: GridStatus;
  contagem: number;
  dif?: number;
};

const iconMap: Record<GridStatus, typeof BarChart3> = {
  Parcial: AlertTriangle,
  "Sem Saldo": BarChart3,
  "Com saldo": CheckCircle2,
  TOTAL: Sigma
};

export function KpiCards({
  entries,
  total,
  selected,
  onSelect
}: {
  entries: KpiEntry[];
  total: number;
  selected: GridStatus | "Todos";
  onSelect: (status: GridStatus | "Todos") => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {entries.map((entry) => {
        const config = statusConfig[entry.statusGrid];
        const Icon = iconMap[entry.statusGrid];
        const percent = total > 0 ? (entry.contagem / total) * 100 : 0;
        const isSelected = selected === entry.statusGrid;
        return (
          <Card
            key={entry.statusGrid}
            className={cn(
              "glass-card cursor-pointer border transition hover:border-violet-500/40",
              isSelected && "border-violet-500/60 shadow-[0_0_35px_rgba(124,58,237,0.25)]"
            )}
            onClick={() => onSelect(isSelected ? "Todos" : entry.statusGrid)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {config.label}
                  </p>
                  <p className="text-2xl font-semibold text-white">
                    {entry.contagem.toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className={cn("rounded-full border px-2 py-2", config.className)}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{percent.toFixed(1)}% do total</span>
                {entry.dif !== undefined && (
                  <span className={entry.dif >= 0 ? "text-emerald-300" : "text-rose-300"}>
                    {entry.dif >= 0 ? "+" : ""}
                    {entry.dif.toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
              <Progress value={percent} className="mt-2 h-2 bg-white/5" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

