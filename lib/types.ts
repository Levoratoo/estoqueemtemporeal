export type ItemRow = {
  pedido: string;
  dtPedVenda: string;
  codSku: string;
  usr_Marca?: string;
  acabado?: string | null;
  tituloVenda?: string | null;
  descricao: string;
  qtdSolicitada: number;
  saldoEstoque: number;
  qtdAtendida: number;
  percAtendimentoItem: number;
  saldoRestante: number;
};

export type PedidoResumo = {
  pedido: string;
  dtPedVenda: string;
  usr_Marca?: string;
  acabado?: string | null;
  tituloVenda?: string | null;
  totalSolicitado: number;
  totalAtendido: number;
  statusGrid: "Parcial" | "Sem Saldo" | "Total";
  percAtendimentoPedido: number;
};

export type GridAnalise = {
  statusGrid: "Parcial" | "Sem Saldo" | "Total" | "TOTAL";
  contagem: number;
};

export type GridCompareRow = {
  statusGrid: "Parcial" | "Sem Saldo" | "Total" | "TOTAL";
  ultRelatorio: number;
  atual: number;
  dif: number;
};

export type DataPayload = {
  lastRefreshAt: string | null;
  updateIntervalMinutes: number;
  items: ItemRow[];
  resumo: PedidoResumo[];
  analise: GridAnalise[];
  comparativo: GridCompareRow[];
  error?: string;
  refreshMode: "disabled" | "token";
};

export type LocationRow = {
  codItem: string | null;
  itemDescricao: string | null;
  unidadeEst: string | null;
  localEstoque: string | null;
  codGrupo: string | null;
  nomeGrupo: string | null;
  nomeMasterGrupo: string | null;
  localizacao: string | null;
  lote: string | null;
  dataValidadeLote: string | null;
  qtdSaldo: number | null;
  qtdSaldoUniCusto: number | null;
  unidadeCusto: string | null;
  precisaoCusto: number | null;
  precisaoEst: number | null;
  cubagem: number | null;
  pesoVolume: number | null;
  volume: number | null;
  numOrdem: number | null;
  codCliente: string | null;
  nomeCliente: string | null;
};

export type LocationPayload = {
  rows: LocationRow[];
  page: number;
  pageSize: number;
  total: number;
};

export type LocationAggregateEntry = {
  name: string;
  value: number;
};

export type LocationAggregates = {
  totalItens: number;
  saldoTotal: number;
  localizacoesUnicas: number;
  locaisEstoqueUnicos: number;
  saldoPorLocalEstoque: LocationAggregateEntry[];
  saldoPorLocalizacao: LocationAggregateEntry[];
};
