import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CACHE_TTL_MS = 3 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; payload: Record<string, unknown> }>();

const normalizeBool = (value: string | null | undefined) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const buildAcabadoClause = () => {
  return `
    AND (
      CASE
        WHEN ISNUMERIC(usr_acabado) = 1 THEN CAST(usr_acabado AS int)
        ELSE 0
      END = 1
      OR UPPER(CONVERT(varchar(10), usr_acabado)) IN ('S','SIM','YES','Y','TRUE','1')
    )
  `;
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const prefix = (url.searchParams.get("prefix") ?? "8").trim() || "8";
    const descricao = url.searchParams.get("descricao")?.trim() ?? "";
    const localEstoque = url.searchParams.get("localEstoque")?.trim() ?? "";
    const localizacao = url.searchParams.get("localizacao")?.trim() ?? "";
    const includeAcabado = normalizeBool(url.searchParams.get("acabado"));

    const forceRefresh = (url.searchParams.get("force") ?? "").toLowerCase() === "true";
    const cacheKey = JSON.stringify({
      prefix,
      descricao,
      localEstoque,
      localizacao,
      includeAcabado
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
    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const pool = await getPool();
    let acabadoClause = "";
    if (includeAcabado) {
      const columnCheck = await pool
        .request()
        .query(
          "SELECT COUNT(1) as hasColumn FROM sys.columns WHERE object_id = OBJECT_ID('usr_view_SaldoDeEstoquePorLocalizacao') AND name = 'usr_acabado'"
        );
      const hasColumn = Number(columnCheck.recordset?.[0]?.hasColumn ?? 0) > 0;
      acabadoClause = hasColumn ? buildAcabadoClause() : "";
    }
    const requestBase = pool.request();
    requestBase.input("prefix", `${prefix}%`);
    if (descricao) {
      requestBase.input("descricao", `%${descricao}%`);
    }
    if (localEstoque) {
      requestBase.input("localEstoque", localEstoque);
    }
    if (localizacao) {
      requestBase.input("localizacao", localizacao);
    }

    const totalsQuery = `
      SELECT
        COUNT(1) AS totalItens,
        COALESCE(SUM(QtdSaldo), 0) AS saldoTotal,
        COUNT(DISTINCT Localizacao) AS localizacoesUnicas,
        COUNT(DISTINCT LocalEstoque) AS locaisEstoqueUnicos
      FROM usr_view_SaldoDeEstoquePorLocalizacao
      ${whereClause}
      ${acabadoClause}
    `;

    const saldoPorLocalEstoqueQuery = `
      SELECT TOP (10)
        COALESCE(NULLIF(LTRIM(RTRIM(LocalEstoque)), ''), 'Sem local') AS name,
        COALESCE(SUM(QtdSaldo), 0) AS value
      FROM usr_view_SaldoDeEstoquePorLocalizacao
      ${whereClause}
      ${acabadoClause}
      GROUP BY COALESCE(NULLIF(LTRIM(RTRIM(LocalEstoque)), ''), 'Sem local')
      ORDER BY COALESCE(SUM(QtdSaldo), 0) DESC
    `;

    const topLocalizacoesQuery = `
      SELECT TOP (10)
        COALESCE(NULLIF(LTRIM(RTRIM(Localizacao)), ''), 'Sem local') AS name,
        COALESCE(SUM(QtdSaldo), 0) AS value
      FROM usr_view_SaldoDeEstoquePorLocalizacao
      ${whereClause}
      ${acabadoClause}
      GROUP BY COALESCE(NULLIF(LTRIM(RTRIM(Localizacao)), ''), 'Sem local')
      ORDER BY COALESCE(SUM(QtdSaldo), 0) DESC
    `;

    const [totals, saldoPorLocalEstoque, topLocalizacoes] = await Promise.all([
      requestBase.query(totalsQuery),
      requestBase.query(saldoPorLocalEstoqueQuery),
      requestBase.query(topLocalizacoesQuery)
    ]);

    const totalsRow = totals.recordset?.[0] ?? {
      totalItens: 0,
      saldoTotal: 0,
      localizacoesUnicas: 0,
      locaisEstoqueUnicos: 0
    };

    const payload = {
      totalItens: Number(totalsRow.totalItens ?? 0),
      saldoTotal: Number(totalsRow.saldoTotal ?? 0),
      localizacoesUnicas: Number(totalsRow.localizacoesUnicas ?? 0),
      locaisEstoqueUnicos: Number(totalsRow.locaisEstoqueUnicos ?? 0),
      saldoPorLocalEstoque: saldoPorLocalEstoque.recordset ?? [],
      saldoPorLocalizacao: topLocalizacoes.recordset ?? []
    };

    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar agregados";
    console.error("[localizacao] aggregates failed", error);
    return NextResponse.json(
      {
        totalItens: 0,
        saldoTotal: 0,
        localizacoesUnicas: 0,
        locaisEstoqueUnicos: 0,
        saldoPorLocalEstoque: [],
        saldoPorLocalizacao: [],
        error: message
      },
      { status: 500 }
    );
  }
}
