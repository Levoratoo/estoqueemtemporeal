import { RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type HeaderProps = {
  lastRefreshAt: string | null;
  updateIntervalMinutes: number;
  refreshMode: "token" | "disabled";
  loading: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  tokenValue: string;
  onTokenChange: (value: string) => void;
  onRefresh: () => void;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export function DashboardHeader({
  lastRefreshAt,
  updateIntervalMinutes,
  refreshMode,
  loading,
  searchValue,
  onSearchChange,
  tokenValue,
  onTokenChange,
  onRefresh
}: HeaderProps) {
  return (
    <div className="sticky top-0 z-20 border-b border-white/5 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">Pedidos Pendentes — GRID</h1>
            <Badge className="badge-soft text-xs text-violet-200">
              Atualiza a cada {updateIntervalMinutes} min
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Ultima atualizacao: <span className="text-foreground">{formatDateTime(lastRefreshAt)}</span>
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar pedido, SKU ou descricao"
              className="w-full bg-muted/40 pl-9"
            />
          </div>
          {refreshMode === "token" && (
            <Input
              type="password"
              value={tokenValue}
              onChange={(event) => onTokenChange(event.target.value)}
              placeholder="Token de refresh"
              className="max-w-[180px] bg-muted/40"
            />
          )}
          <Button onClick={onRefresh} disabled={loading} className="gap-2">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Atualizar agora
          </Button>
        </div>
      </div>
    </div>
  );
}
