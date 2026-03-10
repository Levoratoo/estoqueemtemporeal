import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DataPoint = { name: string; value: number };

type ValidadeAgingProps = {
  data: DataPoint[];
  total: number;
};

const COLORS: Record<string, string> = {
  "Sem validade": "#6B6B6B",
  Vencido: "#E26D5A",
  "0-30": "#7C3AED",
  "31-90": "#A855F7",
  "90+": "#C084FC"
};

const TooltipContent = ({
  active,
  payload,
  total
}: {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
  total: number;
}) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const value = item?.value ?? 0;
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="rounded-lg border border-white/10 bg-[var(--premium-surface-2)] px-3 py-2 text-xs text-white/80 shadow-lg">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
        {item?.name}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
      <div className="text-[11px] text-white/60">{percent.toFixed(1)}% dos itens</div>
    </div>
  );
};

export default function ValidadeAging({ data, total }: ValidadeAgingProps) {
  return (
    <Card className="border border-white/5 bg-[var(--premium-surface-1)]">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm text-[var(--premium-text)]">
          Validade (aging)
        </CardTitle>
      </CardHeader>
      <CardContent className="h-64 pt-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-white/40">
            Sem dados para este recorte.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={({ active, payload }) => (
                <TooltipContent active={active} payload={payload as { name?: string; value?: number }[]} total={total} />
              )} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name] ?? "#7CFF7A"} />
                ))}
              </Pie>
              <Legend
                wrapperStyle={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
