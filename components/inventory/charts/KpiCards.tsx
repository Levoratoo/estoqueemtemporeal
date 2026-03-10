import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type KpiCardsProps = {
  loading: boolean;
  totalItens: number;
  saldoTotal: number;
  localizacoesUnicas: number;
  locaisEstoqueUnicos: number;
  formatNumber: (value: number) => string;
};

export default function KpiCards({
  loading,
  totalItens,
  saldoTotal,
  localizacoesUnicas,
  locaisEstoqueUnicos,
  formatNumber
}: KpiCardsProps) {
  const cards = [
    { label: "Itens carregados", value: totalItens.toLocaleString("pt-BR") },
    { label: "Saldo total", value: formatNumber(saldoTotal) },
    { label: "Localizacoes unicas", value: localizacoesUnicas.toLocaleString("pt-BR") },
    { label: "Locais estoque", value: locaisEstoqueUnicos.toLocaleString("pt-BR") }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className="border border-white/5 bg-[var(--premium-surface-1)] shadow-[var(--premium-shadow)]"
        >
          <CardContent className="space-y-2 p-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--premium-text-soft)]">
              {card.label}
            </p>
            {loading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p className="text-lg font-semibold text-[var(--premium-text)]">
                {card.value}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
