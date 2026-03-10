import type { LocationAggregates } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import KpiCards from "./charts/KpiCards";
import SaldoPorLocalEstoque from "./charts/SaldoPorLocalEstoque";
import TopLocalizacoes from "./charts/TopLocalizacoes";

type ChartsPanelProps = {
  aggregates: LocationAggregates | null;
  loading: boolean;
  onFilterLocalEstoque?: (value: string) => void;
  onFilterLocalizacao?: (value: string) => void;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);

export default function ChartsPanel({
  aggregates,
  loading,
  onFilterLocalEstoque,
  onFilterLocalizacao
}: ChartsPanelProps) {
  if (!loading && (!aggregates || aggregates.totalItens === 0)) {
    return (
      <Card className="border border-white/5 bg-[var(--premium-surface-1)]">
        <CardHeader>
          <CardTitle className="text-sm text-[var(--premium-text)]">Resumo rapido</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[var(--premium-text-muted)]">
          Nenhum dado disponivel para os filtros atuais.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <KpiCards
        loading={loading}
        totalItens={aggregates?.totalItens ?? 0}
        saldoTotal={aggregates?.saldoTotal ?? 0}
        localizacoesUnicas={aggregates?.localizacoesUnicas ?? 0}
        locaisEstoqueUnicos={aggregates?.locaisEstoqueUnicos ?? 0}
        formatNumber={formatNumber}
      />
      {loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`chart-skel-${index}`} className="h-64 w-full" />
          ))}
        </div>
      )}
      {!loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SaldoPorLocalEstoque
            data={aggregates?.saldoPorLocalEstoque ?? []}
            total={aggregates?.saldoTotal ?? 0}
            onSelect={onFilterLocalEstoque}
            formatNumber={formatNumber}
          />
          <TopLocalizacoes
            data={aggregates?.saldoPorLocalizacao ?? []}
            total={aggregates?.saldoTotal ?? 0}
            onSelect={onFilterLocalizacao}
            formatNumber={formatNumber}
          />
        </div>
      )}
    </div>
  );
}
