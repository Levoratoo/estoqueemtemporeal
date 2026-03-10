import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CACHE_TTL_MS = 3 * 60 * 1000;
const cache = new Map<
  string,
  { expiresAt: number; payload: { rows: Record<string, unknown>[]; page: number; pageSize: number; total: number } }
>();

const parseBoolean = (value: string | null | undefined) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const sortColumns: Record<string, string> = {
  coditem: "CodItem",
  itemdescricao: "ItemDescricao",
  localestoque: "LocalEstoque",
  localizacao: "Localizacao",
  qtdsaldo: "QtdSaldo",
  lote: "Lote",
  datavalidadelote: "DataValidadeLote",
  cubagem: "Cubagem",
  pesovolume: "PesoVolume",
  volume: "Volume"
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const prefix = (url.searchParams.get("prefix") ?? "8").trim() || "8";
    const descricao = url.searchParams.get("descricao")?.trim() ?? "";
    const localEstoque = url.searchParams.get("localEstoque")?.trim() ?? "";
    const localizacao = url.searchParams.get("localizacao")?.trim() ?? "";
    const onlyPositive = parseBoolean(url.searchParams.get("onlyPositive"));
    const page = clampNumber(Number(url.searchParams.get("page") ?? "1"), 1, 100000);
    const pageSize = clampNumber(Number(url.searchParams.get("pageSize") ?? "50"), 1, 200);
    const sortByRaw = (url.searchParams.get("sortBy") ?? "Localizacao").toLowerCase();
    const sortDirRaw = (url.searchParams.get("sortDir") ?? "asc").toLowerCase();

    const sortBy = sortColumns[sortByRaw] ?? "Localizacao";
    const sortDir = sortDirRaw === "desc" ? "DESC" : "ASC";

    const forceRefresh = (url.searchParams.get("force") ?? "").toLowerCase() === "true";
    const cacheKey = JSON.stringify({
      prefix,
      descricao,
      localEstoque,
      localizacao,
      onlyPositive,
      page,
      pageSize,
      sortBy,
      sortDir
    });

    const cached = cache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload);
    }

    const conditions: string[] = ["CodItem LIKE @prefix"];
    if (descricao) {
      conditions.push("ItemDescricao LIKE @descricao");
    }
    if (localEstoque) {
      conditions.push("LocalEstoque = @localEstoque");
    }
    if (localizacao) {
      conditions.push("Localizacao = @localizacao");
    }
    if (onlyPositive) {
      conditions.push("QtdSaldo > 0");
    }
    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const pool = await getPool();

    const countRequest = pool.request();
    countRequest.input("prefix", `${prefix}%`);
    if (descricao) {
      countRequest.input("descricao", `%${descricao}%`);
    }
    if (localEstoque) {
      countRequest.input("localEstoque", localEstoque);
    }
    if (localizacao) {
      countRequest.input("localizacao", localizacao);
    }

    const dataRequest = pool.request();
    dataRequest.input("prefix", `${prefix}%`);
    if (descricao) {
      dataRequest.input("descricao", `%${descricao}%`);
    }
    if (localEstoque) {
      dataRequest.input("localEstoque", localEstoque);
    }
    if (localizacao) {
      dataRequest.input("localizacao", localizacao);
    }
    dataRequest.input("offset", (page - 1) * pageSize);
    dataRequest.input("pageSize", pageSize);

    const countQuery = `
      SELECT COUNT(1) as total
      FROM usr_view_SaldoDeEstoquePorLocalizacao
      ${whereClause}
    `;

    const orderByClause =
      sortBy === "Localizacao" || sortBy === "LocalEstoque"
        ? `ORDER BY CASE WHEN ${sortBy} IS NULL OR LTRIM(RTRIM(${sortBy})) = '' THEN 1 ELSE 0 END, ${sortBy} ${sortDir}`
        : `ORDER BY ${sortBy} ${sortDir}`;

    const dataQuery = `
      SELECT
        CodItem AS codItem,
        ItemDescricao AS itemDescricao,
        UnidadeEst AS unidadeEst,
        LocalEstoque AS localEstoque,
        CodGrupo AS codGrupo,
        NomeGrupo AS nomeGrupo,
        NomeMasterGrupo AS nomeMasterGrupo,
        Localizacao AS localizacao,
        Lote AS lote,
        DataValidadeLote AS dataValidadeLote,
        QtdSaldo AS qtdSaldo,
        QtdSaldoUniCusto AS qtdSaldoUniCusto,
        UnidadeCusto AS unidadeCusto,
        PrecisaoCusto AS precisaoCusto,
        PrecisaoEst AS precisaoEst,
        Cubagem AS cubagem,
        PesoVolume AS pesoVolume,
        Volume AS volume,
        NumOrdem AS numOrdem,
        CodCliente AS codCliente,
        NomeCliente AS nomeCliente
      FROM usr_view_SaldoDeEstoquePorLocalizacao
      ${whereClause}
      ${orderByClause}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;

    const [countResult, dataResult] = await Promise.all([
      countRequest.query(countQuery),
      dataRequest.query(dataQuery)
    ]);

    const total = Number(countResult.recordset?.[0]?.total ?? 0);
    const payload = {
      rows: (dataResult.recordset ?? []) as Record<string, unknown>[],
      page,
      pageSize,
      total
    };

    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar localizacoes";
    console.error("[localizacao] query failed", error);
    return NextResponse.json(
      { rows: [], page: 1, pageSize: 50, total: 0, error: message },
      { status: 500 }
    );
  }
}
