import { computeDataset } from "./compute";
import { getPool } from "./db";
import type { DataPayload, GridCompareRow } from "./types";

const UPDATE_INTERVAL_ALLOWED = new Set([1, 5, 15]);

const getUpdateIntervalMinutes = () => {
  const raw = process.env.UPDATE_INTERVAL_MINUTES;
  const parsed = raw ? Number(raw) : 15;
  if (Number.isFinite(parsed) && UPDATE_INTERVAL_ALLOWED.has(parsed)) {
    return parsed;
  }
  return 15;
};

type CacheState = {
  lastRefreshAt: string | null;
  payload: Omit<DataPayload, "lastRefreshAt" | "error"> | null;
  error: string | null;
  lastCounts: { parcial: number; semSaldo: number; total: number; totalGeral: number } | null;
};

const globalForCache = globalThis as typeof globalThis & {
  __gridCache?: CacheState;
  __gridCacheJob?: NodeJS.Timeout;
  __gridCacheRefreshing?: Promise<void> | null;
};

const getInitialState = (): CacheState => ({
  lastRefreshAt: null,
  payload: null,
  error: null,
  lastCounts: null
});

const getCacheState = () => {
  if (!globalForCache.__gridCache) {
    globalForCache.__gridCache = getInitialState();
  }
  return globalForCache.__gridCache;
};

const fetchRows = async () => {
  const pool = await getPool();
  const query = `
    SELECT
      NumPedido AS pedido,
      DTPEDVENDA AS dtPedVenda,
      CodMaterial AS codSku,
      usr_Marca AS marca,
      usr_acabado AS acabado,
      TITULOVENDA AS tituloVenda,
      Descricao AS descricao,
      Quantidade AS qtdSolicitada,
      DisponiveLREAL AS saldoEstoque
    FROM usr_view_StatusSeparacaoLOG
    WHERE StatusSeparacao = 'Pendente'
    ORDER BY DTPEDVENDA
  `;

  const maxAttempts = 3;
  const baseDelayMs = 500;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      const result = await pool.request().query(query);
      const expectedColumns = [
        "pedido",
        "dtPedVenda",
        "codSku",
        "marca",
        "acabado",
        "tituloVenda",
        "descricao",
        "qtdSolicitada",
        "saldoEstoque"
      ];
      if (result.recordset.length > 0) {
        const rowKeys = Object.keys(result.recordset[0] ?? {});
        const missing = expectedColumns.filter((col) => !rowKeys.includes(col));
        if (missing.length > 0) {
          throw new Error(`Colunas ausentes na view: ${missing.join(", ")}`);
        }
      }
      if (process.env.NODE_ENV !== "production" && result.recordset.length > 0) {
        const firstRow = result.recordset[0] ?? {};
        console.info("[grid] raw columns", Object.keys(firstRow));
        console.info("[grid] sample row", firstRow);
        console.info("[grid] marca sample", firstRow.marca);
      }
      const elapsedMs = Date.now() - startedAt;
      console.info("[grid] query completed", {
        rows: result.recordset.length,
        elapsedMs
      });
      return result.recordset as Record<string, unknown>[];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isDeadlock = message.toLowerCase().includes("deadlock");
      if (!isDeadlock || attempt === maxAttempts) {
        throw error;
      }
      const delayMs = baseDelayMs * attempt;
      console.warn("[grid] deadlock detected, retrying", { attempt, delayMs });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return [];
};

const buildCompare = (
  current: { parcial: number; semSaldo: number; total: number; totalGeral: number },
  previous?: { parcial: number; semSaldo: number; total: number; totalGeral: number }
): GridCompareRow[] => {
  const prev = previous ?? { parcial: 0, semSaldo: 0, total: 0, totalGeral: 0 };
  return [
    {
      statusGrid: "Parcial",
      ultRelatorio: prev.parcial,
      atual: current.parcial,
      dif: current.parcial - prev.parcial
    },
    {
      statusGrid: "Sem Saldo",
      ultRelatorio: prev.semSaldo,
      atual: current.semSaldo,
      dif: current.semSaldo - prev.semSaldo
    },
    {
      statusGrid: "Total",
      ultRelatorio: prev.total,
      atual: current.total,
      dif: current.total - prev.total
    },
    {
      statusGrid: "TOTAL",
      ultRelatorio: prev.totalGeral,
      atual: current.totalGeral,
      dif: current.totalGeral - prev.totalGeral
    }
  ];
};

const refreshCacheInternal = async () => {
  const cache = getCacheState();

  const rows = await fetchRows();
  const { items, resumo, analise } = computeDataset(rows);
  if (process.env.NODE_ENV !== "production" && items.length > 0) {
    console.info("[grid] sample item", items[0]);
  }

  const counts = {
    parcial: analise.find((row) => row.statusGrid === "Parcial")?.contagem ?? 0,
    semSaldo: analise.find((row) => row.statusGrid === "Sem Saldo")?.contagem ?? 0,
    total: analise.find((row) => row.statusGrid === "Total")?.contagem ?? 0,
    totalGeral: analise.find((row) => row.statusGrid === "TOTAL")?.contagem ?? 0
  };
  const previousCounts =
    cache.lastCounts ??
    ({
      parcial: 0,
      semSaldo: 0,
      total: 0,
      totalGeral: 0
    } as const);
  const comparativo = buildCompare(counts, previousCounts);
  cache.lastCounts = counts;

  cache.payload = {
    updateIntervalMinutes: getUpdateIntervalMinutes(),
    items,
    resumo,
    analise,
    comparativo,
    refreshMode: process.env.FORCE_REFRESH_TOKEN ? "token" : "disabled"
  };
  cache.lastRefreshAt = new Date().toISOString();
  cache.error = null;
};

export const refreshCache = async () => {
  if (!globalForCache.__gridCacheRefreshing) {
    globalForCache.__gridCacheRefreshing = refreshCacheInternal()
      .catch((error) => {
        const cache = getCacheState();
        cache.error = error instanceof Error ? error.message : "Erro ao atualizar";
        console.error("[grid] refresh failed", error);
      })
      .finally(() => {
        globalForCache.__gridCacheRefreshing = null;
      });
  }

  return globalForCache.__gridCacheRefreshing;
};

export const ensureScheduler = () => {
  if (globalForCache.__gridCacheJob) return;
  const interval = getUpdateIntervalMinutes();
  const ms = interval * 60 * 1000;
  globalForCache.__gridCacheJob = setInterval(() => {
    refreshCache().catch(() => undefined);
  }, ms);
};

export const getCachePayload = async () => {
  const cache = getCacheState();
  ensureScheduler();

  const intervalMs = getUpdateIntervalMinutes() * 60 * 1000;
  const lastRefreshMs = cache.lastRefreshAt ? new Date(cache.lastRefreshAt).getTime() : null;

  if (!cache.payload || !cache.lastRefreshAt || !Number.isFinite(lastRefreshMs)) {
    console.info("[grid] initial cache warmup");
    await refreshCache();
  } else if (Date.now() - (lastRefreshMs as number) > intervalMs) {
    console.info("[grid] stale cache detected", {
      lastRefreshAt: cache.lastRefreshAt,
      intervalMs
    });
    await refreshCache();
  }

  const payload = cache.payload ?? {
    updateIntervalMinutes: getUpdateIntervalMinutes(),
    items: [],
    resumo: [],
    analise: [],
    comparativo: [],
    refreshMode: process.env.FORCE_REFRESH_TOKEN ? "token" : "disabled"
  };

  return {
    lastRefreshAt: cache.lastRefreshAt,
    error: cache.error ?? undefined,
    ...payload
  } as DataPayload;
};
