import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DataPoint = { name: string; value: number };

type TopLocalizacoesProps = {
  data: DataPoint[];
  total: number;
  onSelect?: (value: string) => void;
  formatNumber: (value: number) => string;
};

const TooltipContent = ({
  active,
  payload,
  label,
  total,
  formatNumber
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
  total: number;
  formatNumber: (value: number) => string;
}) => {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="rounded-lg border border-white/10 bg-[var(--premium-surface-2)] px-3 py-2 text-xs text-white/80 shadow-lg">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">
        {formatNumber(value)}
      </div>
      <div className="text-[11px] text-white/60">{percent.toFixed(1)}% do total</div>
    </div>
  );
};

export default function TopLocalizacoes({
  data,
  total,
  onSelect,
  formatNumber
}: TopLocalizacoesProps) {
  return (
    <Card className="border border-white/5 bg-[var(--premium-surface-1)]">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm text-[var(--premium-text)]">
          Top localizacoes
        </CardTitle>
      </CardHeader>
      <CardContent className="h-64 pt-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-white/40">
            Sem dados para este recorte.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
              <XAxis
                type="number"
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={140}
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(124,58,237,0.1)" }}
                content={({ active, payload, label }) => (
                  <TooltipContent
                    active={active}
                    payload={payload as { value?: number }[]}
                    label={label as string}
                    total={total}
                    formatNumber={formatNumber}
                  />
                )}
              />
              <Bar
                dataKey="value"
                fill="#7C3AED"
                radius={[6, 6, 6, 6]}
                onClick={(entry) => {
                  const name = entry?.payload?.name;
                  if (!name || name === "Sem local") return;
                  onSelect?.(name);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
