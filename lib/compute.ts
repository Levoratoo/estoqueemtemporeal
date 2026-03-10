import type { GridAnalise, ItemRow, PedidoResumo } from "./types";

const toNumber = (value: unknown) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value).trim();
  if (!raw) return 0;

  let normalized = raw;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
  } else if (hasComma && !hasDot) {
    normalized = normalized.replace(/,/g, ".");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateString = (value: unknown) => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }
  return "";
};

const toDateMs = (value: string) => {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

export const computeDataset = (rows: Record<string, unknown>[]) => {
  if (rows.length === 0) {
    return {
      items: [] as ItemRow[],
      resumo: [] as PedidoResumo[],
      analise: [] as GridAnalise[]
    };
  }

  const items: ItemRow[] = [];
  const pedidoMap = new Map<
    string,
    {
      pedido: string;
      dtPedVenda: string;
      dtPedVendaMs: number | null;
      usr_Marca?: string;
      acabado?: string | null;
      tituloVenda?: string | null;
      totalSolicitado: number;
      totalAtendido: number;
    }
  >();

  for (const row of rows) {
    const pedido = String(row.pedido ?? "").trim();
    const dtPedVenda = toDateString(row.dtPedVenda);
    const codSku = String(row.codSku ?? "").trim();
    const usr_Marca = String(row.marca ?? row.usr_Marca ?? "").trim();
    const acabadoValue = String(row.acabado ?? "").trim();
    const tituloVendaValue = String(row.tituloVenda ?? "").trim();
    const acabado = acabadoValue ? acabadoValue : null;
    const tituloVenda = tituloVendaValue ? tituloVendaValue : null;
    const descricao = String(row.descricao ?? "").trim();
    const qtdSolicitadaRaw = row.qtdSolicitada;
    const saldoEstoqueRaw = row.saldoEstoque;
    const qtdSolicitada = toNumber(qtdSolicitadaRaw);
    const saldoEstoque = toNumber(saldoEstoqueRaw);
    if (process.env.NODE_ENV !== "production" && qtdSolicitada === 0 && qtdSolicitadaRaw) {
      const rawText = String(qtdSolicitadaRaw).trim();
      if (rawText && rawText !== "0") {
        console.info("[grid] qtdSolicitada raw", { qtdSolicitadaRaw: rawText });
      }
    }

    const qtdAtendida = Math.min(qtdSolicitada, saldoEstoque);
    const percAtendimentoItem = qtdSolicitada > 0 ? qtdAtendida / qtdSolicitada : 0;
    const saldoRestante = saldoEstoque - qtdAtendida;

    items.push({
      pedido,
      dtPedVenda,
      codSku,
      usr_Marca: usr_Marca || undefined,
      acabado,
      tituloVenda,
      descricao,
      qtdSolicitada,
      saldoEstoque,
      qtdAtendida,
      percAtendimentoItem,
      saldoRestante
    });

    const currentMs = toDateMs(dtPedVenda);
    const existing = pedidoMap.get(pedido) ?? {
      pedido,
      dtPedVenda,
      dtPedVendaMs: currentMs,
      usr_Marca: undefined,
      acabado: undefined,
      tituloVenda: undefined,
      totalSolicitado: 0,
      totalAtendido: 0
    };

    if (currentMs !== null) {
      if (existing.dtPedVendaMs === null || currentMs < existing.dtPedVendaMs) {
        existing.dtPedVendaMs = currentMs;
        existing.dtPedVenda = dtPedVenda;
      }
    }

    if (!existing.usr_Marca && usr_Marca) {
      existing.usr_Marca = usr_Marca;
    }
    if ((!existing.acabado || existing.acabado?.trim?.() === "") && acabado) {
      existing.acabado = acabado;
    }
    if ((!existing.tituloVenda || existing.tituloVenda?.trim?.() === "") && tituloVenda) {
      existing.tituloVenda = tituloVenda;
    }

    existing.totalSolicitado += qtdSolicitada;
    existing.totalAtendido += qtdAtendida;

    pedidoMap.set(pedido, existing);
  }

  const resumo: PedidoResumo[] = Array.from(pedidoMap.values()).map((pedido) => {
    let statusGrid: PedidoResumo["statusGrid"] = "Parcial";
    if (pedido.totalAtendido === 0) {
      statusGrid = "Sem Saldo";
    } else if (pedido.totalAtendido >= pedido.totalSolicitado) {
      statusGrid = "Total";
    }

    return {
      pedido: pedido.pedido,
      dtPedVenda: pedido.dtPedVenda,
      usr_Marca: pedido.usr_Marca,
      acabado: pedido.acabado ?? null,
      tituloVenda: pedido.tituloVenda ?? null,
      totalSolicitado: pedido.totalSolicitado,
      totalAtendido: pedido.totalAtendido,
      statusGrid,
      percAtendimentoPedido:
        pedido.totalSolicitado > 0 ? pedido.totalAtendido / pedido.totalSolicitado : 0
    };
  });

  resumo.sort((a, b) => {
    const da = new Date(a.dtPedVenda).getTime();
    const db = new Date(b.dtPedVenda).getTime();
    return da - db;
  });

  const counts = {
    Parcial: 0,
    "Sem Saldo": 0,
    Total: 0
  };

  for (const pedido of resumo) {
    counts[pedido.statusGrid] += 1;
  }

  const analise: GridAnalise[] = [
    { statusGrid: "Parcial", contagem: counts.Parcial },
    { statusGrid: "Sem Saldo", contagem: counts["Sem Saldo"] },
    { statusGrid: "Total", contagem: counts.Total },
    {
      statusGrid: "TOTAL",
      contagem: counts.Parcial + counts["Sem Saldo"] + counts.Total
    }
  ];

  return { items, resumo, analise };
};
