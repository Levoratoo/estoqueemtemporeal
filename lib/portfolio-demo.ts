import { computeDataset } from "./compute";
import type {
  DataPayload,
  GridCompareRow,
  LocationAggregateEntry,
  LocationAggregates,
  LocationPayload,
  LocationRow,
  PedidoResumo
} from "./types";

type DemoStatus = "Parcial" | "Sem Saldo" | "Total";

type DemoLocationQuery = {
  prefix: string;
  descricao?: string;
  localEstoque?: string;
  localizacao?: string;
  onlyPositive?: boolean;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: "asc" | "desc";
};

const ORDER_STATUSES: DemoStatus[] = [
  "Parcial",
  "Parcial",
  "Parcial",
  "Total",
  "Sem Saldo",
  "Parcial",
  "Total",
  "Parcial",
  "Parcial",
  "Sem Saldo",
  "Parcial",
  "Total",
  "Parcial",
  "Parcial",
  "Sem Saldo",
  "Total",
  "Parcial",
  "Parcial",
  "Total",
  "Parcial",
  "Sem Saldo",
  "Parcial",
  "Total",
  "Parcial"
];

const BRANDS = ["Constance", "Printbag", "Nexa"];
const TITLES = [
  "CONSTANCE MARS 2026",
  "LINHA CLASSIC 2026",
  "COLECAO AUTUMN"
];

const LOCATION_STOCKS = ["01T", "02T", "03T", "EXP", "QA"];
const CLIENT_NAMES = [
  "Comercial Sul",
  "Atacado Prime",
  "Rede Norte",
  "Distribuidora Leste",
  "Cliente Premium"
];

const toIsoDate = (date: Date) => date.toISOString();

const normalizeText = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

const createDemoRows = () => {
  const baseDate = new Date("2026-02-27T00:00:00.000Z");

  return ORDER_STATUSES.flatMap((status, orderIndex) => {
    const pedido = String(560220 + orderIndex);
    const dtPedVenda = new Date(baseDate.getTime() + orderIndex * 24 * 60 * 60 * 1000);
    const marca = BRANDS[orderIndex % BRANDS.length];
    const acabado = orderIndex % 2 === 0 ? "KIT" : "UN";
    const tituloVenda = TITLES[orderIndex % TITLES.length];
    const itemCount = 2 + (orderIndex % 2);

    return Array.from({ length: itemCount }).map((_, itemIndex) => {
      const codSku = `8${String(20000 + orderIndex * 10 + itemIndex).padStart(5, "0")}`;
      const qtdSolicitada = 900 + orderIndex * 120 + itemIndex * 85;

      let saldoEstoque = 0;
      if (status === "Total") {
        saldoEstoque = qtdSolicitada + 140 + itemIndex * 30;
      } else if (status === "Parcial") {
        saldoEstoque =
          itemIndex === 0
            ? Math.round(qtdSolicitada * 0.72)
            : Math.round(qtdSolicitada * 0.34);
      }

      return {
        pedido,
        dtPedVenda: toIsoDate(dtPedVenda),
        codSku,
        marca,
        acabado,
        tituloVenda,
        descricao: `CONSTANCE MARS ${String(2000 + orderIndex + itemIndex)}`,
        qtdSolicitada,
        saldoEstoque
      } as Record<string, unknown>;
    });
  });
};

const createComparativo = (resumo: PedidoResumo[]): GridCompareRow[] => {
  const atual = {
    parcial: resumo.filter((row) => row.statusGrid === "Parcial").length,
    semSaldo: resumo.filter((row) => row.statusGrid === "Sem Saldo").length,
    total: resumo.filter((row) => row.statusGrid === "Total").length
  };

  const ultRelatorio = {
    parcial: Math.max(0, atual.parcial - 2),
    semSaldo: Math.max(0, atual.semSaldo - 1),
    total: Math.max(0, atual.total - 1)
  };

  const atualTotal = atual.parcial + atual.semSaldo + atual.total;
  const ultTotal = ultRelatorio.parcial + ultRelatorio.semSaldo + ultRelatorio.total;

  return [
    {
      statusGrid: "Parcial",
      ultRelatorio: ultRelatorio.parcial,
      atual: atual.parcial,
      dif: atual.parcial - ultRelatorio.parcial
    },
    {
      statusGrid: "Sem Saldo",
      ultRelatorio: ultRelatorio.semSaldo,
      atual: atual.semSaldo,
      dif: atual.semSaldo - ultRelatorio.semSaldo
    },
    {
      statusGrid: "Total",
      ultRelatorio: ultRelatorio.total,
      atual: atual.total,
      dif: atual.total - ultRelatorio.total
    },
    {
      statusGrid: "TOTAL",
      ultRelatorio: ultTotal,
      atual: atualTotal,
      dif: atualTotal - ultTotal
    }
  ];
};

const demoRows = createDemoRows();
const computed = computeDataset(demoRows);
const demoComparativo = createComparativo(computed.resumo);

const buildDemoLocationRows = () => {
  const statusByPedido = new Map(
    computed.resumo.map((row) => [row.pedido, row.statusGrid] as const)
  );

  return computed.items.flatMap((item, index) => {
    const status = statusByPedido.get(item.pedido) ?? "Parcial";

    return Array.from({ length: 2 }).map((_, slot) => {
      const localEstoque = LOCATION_STOCKS[(index + slot) % LOCATION_STOCKS.length];
      const corredor = String.fromCharCode(65 + ((index + slot) % 8));
      const rua = String(((index * 3 + slot) % 16) + 1).padStart(2, "0");
      const nivel = String(((index + slot) % 6) + 1).padStart(2, "0");
      const localizacao = `${corredor}${rua}-${nivel}`;

      const baseSaldo =
        status === "Sem Saldo"
          ? 0
          : Math.round(item.qtdAtendida * (slot === 0 ? 0.62 : 0.36)) + (index % 4) * 20;

      const qtdSaldo =
        status === "Parcial" && slot === 1 ? Math.max(0, baseSaldo - 140) : Math.max(0, baseSaldo);

      const validade = new Date(Date.UTC(2026, (index + slot) % 12, ((index + slot) % 28) + 1));
      const cubagem = Number((0.85 + ((index + slot) % 7) * 0.14).toFixed(3));
      const pesoVolume = Number((1.1 + ((index + slot) % 8) * 0.2).toFixed(3));
      const volume = Number((cubagem * Math.max(1, qtdSaldo / 95)).toFixed(3));

      return {
        codItem: item.codSku,
        itemDescricao: item.descricao,
        unidadeEst: "UN",
        localEstoque,
        codGrupo: `G${String((index % 12) + 1).padStart(2, "0")}`,
        nomeGrupo: `Grupo ${String((index % 12) + 1).padStart(2, "0")}`,
        nomeMasterGrupo: `Master ${(index % 4) + 1}`,
        localizacao,
        lote: `L${String(1000 + index)}-${slot + 1}`,
        dataValidadeLote: validade.toISOString(),
        qtdSaldo,
        qtdSaldoUniCusto: qtdSaldo,
        unidadeCusto: "CX",
        precisaoCusto: 2,
        precisaoEst: 2,
        cubagem,
        pesoVolume,
        volume,
        numOrdem: 3000 + index * 2 + slot,
        codCliente: `CL${String((index % 45) + 1).padStart(3, "0")}`,
        nomeCliente: CLIENT_NAMES[index % CLIENT_NAMES.length]
      } satisfies LocationRow;
    });
  });
};

const demoLocationRows = buildDemoLocationRows();

const getSortValue = (row: LocationRow, sortBy: string): string | number | null => {
  switch (sortBy) {
    case "coditem":
      return row.codItem;
    case "itemdescricao":
      return row.itemDescricao;
    case "localestoque":
      return row.localEstoque;
    case "localizacao":
      return row.localizacao;
    case "qtdsaldo":
      return row.qtdSaldo;
    case "lote":
      return row.lote;
    case "datavalidadelote":
      return row.dataValidadeLote ? new Date(row.dataValidadeLote).getTime() : null;
    case "cubagem":
      return row.cubagem;
    case "pesovolume":
      return row.pesoVolume;
    case "volume":
      return row.volume;
    default:
      return row.localizacao;
  }
};

const compareLocationRows = (
  left: LocationRow,
  right: LocationRow,
  sortBy: string,
  sortDir: "asc" | "desc"
) => {
  const dir = sortDir === "desc" ? -1 : 1;
  const leftValue = getSortValue(left, sortBy);
  const rightValue = getSortValue(right, sortBy);

  if (sortBy === "localizacao" || sortBy === "localestoque") {
    const leftText = normalizeText(leftValue as string | null | undefined);
    const rightText = normalizeText(rightValue as string | null | undefined);
    const leftEmpty = leftText.length === 0;
    const rightEmpty = rightText.length === 0;
    if (leftEmpty !== rightEmpty) return leftEmpty ? 1 : -1;
    return leftText.localeCompare(rightText) * dir;
  }

  if (typeof leftValue === "number" || typeof rightValue === "number") {
    const leftNum = typeof leftValue === "number" ? leftValue : Number.NaN;
    const rightNum = typeof rightValue === "number" ? rightValue : Number.NaN;
    const leftMissing = !Number.isFinite(leftNum);
    const rightMissing = !Number.isFinite(rightNum);
    if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
    return (leftNum - rightNum) * dir;
  }

  const leftText = normalizeText(leftValue as string | null | undefined);
  const rightText = normalizeText(rightValue as string | null | undefined);
  return leftText.localeCompare(rightText) * dir;
};

const filterLocationRows = (query: Omit<DemoLocationQuery, "page" | "pageSize" | "sortBy" | "sortDir">) => {
  const prefix = query.prefix.trim();
  const descricao = normalizeText(query.descricao);
  const localEstoque = normalizeText(query.localEstoque);
  const localizacao = normalizeText(query.localizacao);

  return demoLocationRows.filter((row) => {
    const codItem = row.codItem ?? "";
    if (prefix && !codItem.startsWith(prefix)) {
      return false;
    }

    if (descricao && !normalizeText(row.itemDescricao).includes(descricao)) {
      return false;
    }

    if (localEstoque && normalizeText(row.localEstoque) !== localEstoque) {
      return false;
    }

    if (localizacao && normalizeText(row.localizacao) !== localizacao) {
      return false;
    }

    if (query.onlyPositive && (row.qtdSaldo ?? 0) <= 0) {
      return false;
    }

    return true;
  });
};

const toTopEntries = (rows: LocationRow[], getName: (row: LocationRow) => string) => {
  const map = new Map<string, number>();

  rows.forEach((row) => {
    const key = getName(row);
    const current = map.get(key) ?? 0;
    map.set(key, current + (row.qtdSaldo ?? 0));
  });

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }) satisfies LocationAggregateEntry)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
};

export const getDemoDataPayload = (): DataPayload => ({
  lastRefreshAt: new Date().toISOString(),
  updateIntervalMinutes: 15,
  items: computed.items,
  resumo: computed.resumo,
  analise: computed.analise,
  comparativo: demoComparativo,
  refreshMode: "disabled"
});

export const getDemoLocationPayload = (query: DemoLocationQuery): LocationPayload => {
  const filtered = filterLocationRows(query);
  const sorted = [...filtered].sort((left, right) =>
    compareLocationRows(left, right, query.sortBy, query.sortDir)
  );

  const page = Math.max(1, query.page);
  const pageSize = Math.max(1, Math.min(200, query.pageSize));
  const offset = (page - 1) * pageSize;

  return {
    rows: sorted.slice(offset, offset + pageSize),
    page,
    pageSize,
    total: sorted.length
  };
};

export const getDemoLocationAggregates = (
  query: Pick<
    DemoLocationQuery,
    "prefix" | "descricao" | "localEstoque" | "localizacao" | "onlyPositive"
  >
): LocationAggregates => {
  const filtered = filterLocationRows(query);

  const saldoTotal = filtered.reduce((total, row) => total + (row.qtdSaldo ?? 0), 0);
  const localizacoesUnicas = new Set(
    filtered.map((row) => normalizeText(row.localizacao)).filter((value) => value.length > 0)
  ).size;
  const locaisEstoqueUnicos = new Set(
    filtered.map((row) => normalizeText(row.localEstoque)).filter((value) => value.length > 0)
  ).size;

  return {
    totalItens: filtered.length,
    saldoTotal,
    localizacoesUnicas,
    locaisEstoqueUnicos,
    saldoPorLocalEstoque: toTopEntries(filtered, (row) => row.localEstoque?.trim() || "Sem local"),
    saldoPorLocalizacao: toTopEntries(filtered, (row) => row.localizacao?.trim() || "Sem local")
  };
};
