import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusConfig, type GridStatus } from "./StatusBadge";

export type AnaliseEntry = { statusGrid: GridStatus; contagem: number };
export type ComparativoEntry = {
  statusGrid: GridStatus;
  ultRelatorio: number;
  atual: number;
  dif: number;
};

const formatNumber = (value: number) => value.toLocaleString("pt-BR");
const formatTooltipValue = (value: ValueType | undefined) => {
  const normalized = Array.isArray(value) ? value[0] : value;
  return formatNumber(typeof normalized === "number" ? normalized : Number(normalized ?? 0));
};

const chartStatuses: GridStatus[] = ["Parcial", "Sem Saldo", "Com saldo", "TOTAL"];

export function GridCharts({
  analise,
  comparativo
}: {
  analise: AnaliseEntry[];
  comparativo: ComparativoEntry[];
}) {
  const pieData = chartStatuses
    .filter((status) => status !== "TOTAL")
    .map((status) => ({
      name: status,
      value: analise.find((row) => row.statusGrid === status)?.contagem ?? 0,
      fill: statusConfig[status].chart
    }));

  const barData = chartStatuses.map((status) => {
    const row = comparativo.find((item) => item.statusGrid === status);
    return {
      status,
      Ultimo: row?.ultRelatorio ?? 0,
      Atual: row?.atual ?? 0
    };
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base text-white">Distribuicao do GRID</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <RechartsTooltip
                contentStyle={{
                  background: "rgba(15,15,25,0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  color: "#fff"
                }}
                formatter={(value) => formatTooltipValue(value)}
              />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.fill }} />
                <span>{entry.name}</span>
                <span className="text-foreground">{formatNumber(entry.value)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base text-white">Comparativo</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barSize={18} margin={{ top: 12, right: 8, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="status"
                stroke="rgba(255,255,255,0.5)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip
                contentStyle={{
                  background: "rgba(15,15,25,0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  color: "#fff"
                }}
                formatter={(value) => formatTooltipValue(value)}
              />
              <Bar dataKey="Ultimo" fill="rgba(139,92,246,0.4)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Atual" fill="rgba(139,92,246,0.85)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

