
"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DataPayload,
  ItemRow,
  LocationAggregates,
  LocationPayload,
  LocationRow
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import ChartsPanel from "@/components/inventory/ChartsPanel";
import {
  applyFiltersToResumo,
  formatStatusLabel,
  normalizeDay,
  useGridFilters
} from "./useGridFilters";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  ChevronDown,
  Copy,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X
} from "lucide-react";

const PAGE_SIZE = 25;

const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);

const formatNumberSafe = (value: number | null | undefined) =>
  value === null || value === undefined ? "--" : formatNumber(value);

const formatDate = (value: string) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString("pt-BR");
};

const formatDateTime = (value: string | null) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleString("pt-BR");
};

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return "--";
  const text = String(value).trim();
  return text ? text : "--";
};

const parseResponsePayload = async <T,>(response: Response) => {
  const raw = await response.text();
  if (!raw) return { payload: null as T | null, raw: "" };
  try {
    return { payload: JSON.parse(raw) as T, raw };
  } catch {
    return { payload: null as T | null, raw };
  }
};

const tooltipContentStyle = {
  background: "rgba(15,15,25,0.95)",
  border: "1px solid rgba(139,92,246,0.45)",
  borderRadius: 12,
  color: "#fff",
  boxShadow: "0 12px 30px rgba(139,92,246,0.25)"
};
const tooltipItemStyle = { color: "#f3e8ff" };
const tooltipLabelStyle = { color: "rgba(139,92,246,0.95)" };
const tooltipCursor = { fill: "rgba(139,92,246,0.08)" };

export default function DashboardPage() {
  const [data, setData] = useState<DataPayload | null>(null);
  const [viewMode, setViewMode] = useState<"orders" | "locations">("orders");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [expandedPedido, setExpandedPedido] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState("");
  const [tableFlash, setTableFlash] = useState(false);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const { filters, setSearch, setStatus, toggleEvent, clearFilters } = useGridFilters();
  const [locationRows, setLocationRows] = useState<LocationRow[]>([]);
  const [locationTotal, setLocationTotal] = useState(0);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationAggregates, setLocationAggregates] = useState<LocationAggregates | null>(
    null
  );
  const [locationAggregatesLoading, setLocationAggregatesLoading] = useState(false);
  const [locationLastUpdated, setLocationLastUpdated] = useState<string | null>(null);
  const [locationPage, setLocationPage] = useState(1);
  const [locationSortBy, setLocationSortBy] = useState("localizacao");
  const [locationSortDir, setLocationSortDir] = useState<"asc" | "desc">("asc");
  const [locationSortIsDefault, setLocationSortIsDefault] = useState(true);
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  const [orderSort, setOrderSort] = useState<{
    key:
      | "pedido"
      | "usr_Marca"
      | "acabado"
      | "tituloVenda"
      | "dtPedVenda"
      | "totalSolicitado"
      | "totalAtendido"
      | "percAtendimentoPedido"
      | "statusGrid"
      | null;
    dir: "asc" | "desc" | null;
  }>({ key: null, dir: null });
  const [itemSort, setItemSort] = useState<{
    key:
      | "codSku"
      | "usr_Marca"
      | "acabado"
      | "tituloVenda"
      | "descricao"
      | "qtdSolicitada"
      | "saldoEstoque"
      | "qtdAtendida"
      | "saldoRestante"
      | "percAtendimentoItem"
      | null;
    dir: "asc" | "desc" | null;
  }>({ key: null, dir: null });
  const [locationFilters, setLocationFilters] = useState({
    prefix: "8",
    descricao: "",
    localEstoque: "",
    localizacao: "",
    onlyPositive: false
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/data", { cache: "no-store" });
      const payload = (await response.json()) as DataPayload;
      setData(payload);
      setErrorMessage(payload.error ?? null);
    } catch (error) {
      setErrorMessage("Falha ao carregar dados do servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (data?.refreshMode === "token" && !refreshToken.trim()) {
      setErrorMessage("Informe o token para atualizar agora");
      return;
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (data?.refreshMode === "token") {
        headers["x-refresh-token"] = refreshToken.trim();
      }
      const response = await fetch("/api/data", {
        method: "POST",
        headers,
        cache: "no-store"
      });
      const { payload, raw } = await parseResponsePayload<
        (DataPayload & { error?: string }) | null
      >(response);
      if (!response.ok) {
        const fallback = response.status
          ? `Falha ao atualizar agora (HTTP ${response.status})`
          : "Falha ao atualizar agora";
        setErrorMessage(payload?.error ?? fallback);
        if (!payload && raw) {
          console.error("[grid] refresh response not JSON", raw);
        }
      } else {
        if (!payload) {
          setErrorMessage("Falha ao atualizar agora");
          return;
        }
        setErrorMessage(payload.error ?? null);
      }
      if (payload) {
        setData(payload);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao atualizar agora";
      console.error("[grid] refresh failed", error);
      setErrorMessage(message || "Falha ao atualizar agora");
    } finally {
      setLoading(false);
    }
  }, [data, fetchData, refreshToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchData();
    }, 15 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    setExpandedPedido(null);
    setExpandedLocation(null);
    if (viewMode === "locations") {
      setLocationPage(1);
    }
  }, [viewMode]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, filters.date, orderSort.key, orderSort.dir]);

  useEffect(() => {
    setExpandedPedido(null);
  }, [page, filters.search, filters.status, filters.date]);

  useEffect(() => {
    setLocationPage(1);
    setExpandedLocation(null);
  }, [
    locationFilters.prefix,
    locationFilters.descricao,
    locationFilters.localEstoque,
    locationFilters.localizacao,
    locationFilters.onlyPositive
  ]);

  useEffect(() => {
    setLocationPage(1);
    setExpandedLocation(null);
  }, [locationSortBy, locationSortDir, locationSortIsDefault]);

  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    (data?.resumo ?? []).forEach((row) => values.add(row.statusGrid));
    return ["Todos", ...Array.from(values), "Multi"];
  }, [data]);

  const statusSelectValue =
    filters.status.length === 0 ? "Todos" : filters.status.length === 1 ? filters.status[0] : "Multi";

  const filteredResumo = useMemo(() => {
    return applyFiltersToResumo(data?.resumo ?? [], filters);
  }, [data, filters]);

  const sortedResumo = useMemo(() => {
    if (!orderSort.key || !orderSort.dir) return filteredResumo;
    const sorted = [...filteredResumo];
    const dir = orderSort.dir === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      switch (orderSort.key) {
        case "pedido":
          return a.pedido.localeCompare(b.pedido) * dir;
        case "usr_Marca":
          return (a.usr_Marca ?? "").localeCompare(b.usr_Marca ?? "") * dir;
        case "acabado":
          return (a.acabado ?? "").localeCompare(b.acabado ?? "") * dir;
        case "tituloVenda":
          return (a.tituloVenda ?? "").localeCompare(b.tituloVenda ?? "") * dir;
        case "dtPedVenda": {
          const da = new Date(a.dtPedVenda).getTime();
          const db = new Date(b.dtPedVenda).getTime();
          return (da - db) * dir;
        }
        case "totalSolicitado":
          return (a.totalSolicitado - b.totalSolicitado) * dir;
        case "totalAtendido":
          return (a.totalAtendido - b.totalAtendido) * dir;
        case "percAtendimentoPedido":
          return (a.percAtendimentoPedido - b.percAtendimentoPedido) * dir;
        case "statusGrid":
          return a.statusGrid.localeCompare(b.statusGrid) * dir;
        default:
          return 0;
      }
    });
    return sorted;
  }, [filteredResumo, orderSort.key, orderSort.dir]);

  const totalPages = Math.max(1, Math.ceil(sortedResumo.length / PAGE_SIZE));
  const pageSlice = sortedResumo.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const locationPageSize = 50;
  const locationTotalPages = Math.max(1, Math.ceil(locationTotal / locationPageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (locationPage > locationTotalPages) {
      setLocationPage(locationTotalPages);
    }
  }, [locationPage, locationTotalPages]);

  const itemsByPedido = useMemo(() => {
    const map = new Map<string, ItemRow[]>();
    (data?.items ?? []).forEach((item) => {
      const list = map.get(item.pedido) ?? [];
      list.push(item);
      map.set(item.pedido, list);
    });
    for (const list of map.values()) {
      list.sort((a, b) => (a.descricao || "").localeCompare(b.descricao || ""));
    }
    return map;
  }, [data]);

  const filteredItemsCount = useMemo(() => {
    let count = 0;
    for (const row of filteredResumo) {
      count += itemsByPedido.get(row.pedido)?.length ?? 0;
    }
    return count;
  }, [filteredResumo, itemsByPedido]);

  const analysisCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Parcial: 0,
      "Sem Saldo": 0,
      Total: 0,
      TOTAL: 0
    };
    (data?.analise ?? []).forEach((row) => {
      counts[row.statusGrid] = row.contagem;
    });
    if (!counts.TOTAL) {
      counts.TOTAL = counts.Parcial + counts["Sem Saldo"] + counts.Total;
    }
    return counts;
  }, [data]);

  const statusChartData = useMemo(() => {
    return [
      { name: "Parcial", value: analysisCounts.Parcial ?? 0 },
      { name: "Sem Saldo", value: analysisCounts["Sem Saldo"] ?? 0 },
      { name: "Total", value: analysisCounts.Total ?? 0 }
    ];
  }, [analysisCounts]);
  const statusColors = ["#7C3AED", "#A855F7", "#C084FC"];

  const heatmap = useMemo(() => {
    const statusList = ["Parcial", "Sem Saldo", "Total"];
    const map = new Map<
      number,
      { dateLabel: string; dateKey: string; counts: Record<string, number> }
    >();
    (data?.resumo ?? []).forEach((row) => {
      const ms = new Date(row.dtPedVenda).getTime();
      if (Number.isNaN(ms)) return;
      const dayMs = new Date(ms).setHours(0, 0, 0, 0);
      const existing = map.get(dayMs) ?? {
        dateLabel: new Date(dayMs).toLocaleDateString("pt-BR"),
        dateKey: normalizeDay(new Date(dayMs).toISOString()),
        counts: { Parcial: 0, "Sem Saldo": 0, Total: 0 }
      };
      existing.counts[row.statusGrid] += 1;
      map.set(dayMs, existing);
    });
    const days = Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, value]) => value)
      .slice(-14);
    const max = Math.max(
      1,
      ...days.flatMap((day) => statusList.map((status) => day.counts[status] ?? 0))
    );
    return { days, statusList, max };
  }, [data]);

  const comparativoRows = useMemo(() => {
    return data?.comparativo ?? [];
  }, [data]);

  const scrollToTable = useCallback(() => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTableFlash(true);
    window.setTimeout(() => setTableFlash(false), 700);
  }, []);

  const handleFilterEvent = useCallback(
    (event: { kind: string; value?: string; status?: string; date?: string }, multi?: boolean) => {
      toggleEvent(event as any, multi);
      scrollToTable();
    },
    [toggleEvent, scrollToTable]
  );

  const getLocationKey = useCallback(
    (row: LocationRow) =>
      `${row.codItem ?? ""}::${row.localizacao ?? ""}::${row.lote ?? ""}::${row.dataValidadeLote ?? ""}::${row.localEstoque ?? ""}`,
    []
  );

  const fetchLocations = useCallback(
    async (signal?: AbortSignal, force?: boolean) => {
      setLocationLoading(true);
      setLocationError(null);
      try {
        const params = new URLSearchParams();
        params.set("prefix", locationFilters.prefix || "8");
        if (locationFilters.descricao.trim()) {
          params.set("descricao", locationFilters.descricao.trim());
        }
        if (locationFilters.localEstoque.trim()) {
          params.set("localEstoque", locationFilters.localEstoque.trim());
        }
        if (locationFilters.localizacao.trim()) {
          params.set("localizacao", locationFilters.localizacao.trim());
        }
        if (locationFilters.onlyPositive) {
          params.set("onlyPositive", "true");
        }
        if (force) {
          params.set("force", "true");
        }
        params.set("page", String(locationPage));
        params.set("pageSize", String(locationPageSize));
        params.set("sortBy", locationSortBy);
        params.set("sortDir", locationSortDir);

        const response = await fetch(`/api/estoque/localizacao?${params.toString()}`, {
          cache: "no-store",
          signal
        });
        if (!response.ok) {
          throw new Error("Falha ao carregar localizacoes");
        }
        const payload = (await response.json()) as LocationPayload;
        if (signal?.aborted) return;
        setLocationRows(payload.rows ?? []);
        setLocationTotal(payload.total ?? 0);
        setLocationLastUpdated(new Date().toISOString());
      } catch (error) {
        if (signal?.aborted) return;
        setLocationError("Falha ao carregar localizacoes");
      } finally {
        if (!signal?.aborted) {
          setLocationLoading(false);
        }
      }
    },
    [
      locationFilters.prefix,
      locationFilters.descricao,
      locationFilters.localEstoque,
      locationFilters.localizacao,
      locationFilters.onlyPositive,
      locationPage,
      locationPageSize,
      locationSortBy,
      locationSortDir
    ]
  );

  const fetchLocationAggregates = useCallback(
    async (signal?: AbortSignal, force?: boolean) => {
      setLocationAggregatesLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("prefix", locationFilters.prefix || "8");
        if (locationFilters.descricao.trim()) {
          params.set("descricao", locationFilters.descricao.trim());
        }
        if (locationFilters.localEstoque.trim()) {
          params.set("localEstoque", locationFilters.localEstoque.trim());
        }
        if (locationFilters.localizacao.trim()) {
          params.set("localizacao", locationFilters.localizacao.trim());
        }
        params.set("acabado", "true");
        if (force) {
          params.set("force", "true");
        }

        const response = await fetch(`/api/estoque/localizacao/aggregates?${params.toString()}`, {
          cache: "no-store",
          signal
        });
        if (!response.ok) {
          throw new Error("Falha ao carregar agregados");
        }
        const payload = (await response.json()) as LocationAggregates;
        if (signal?.aborted) return;
        setLocationAggregates(payload);
        setLocationLastUpdated(new Date().toISOString());
      } catch (error) {
        if (signal?.aborted) return;
        setLocationAggregates(null);
      } finally {
        if (!signal?.aborted) {
          setLocationAggregatesLoading(false);
        }
      }
    },
    [
      locationFilters.prefix,
      locationFilters.descricao,
      locationFilters.localEstoque,
      locationFilters.localizacao
    ]
  );

  useEffect(() => {
    if (viewMode !== "locations") return;
    const controller = new AbortController();
    const debounce = window.setTimeout(() => {
      fetchLocations(controller.signal);
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(debounce);
    };
  }, [fetchLocations, viewMode]);

  useEffect(() => {
    if (viewMode !== "locations") return;
    const controller = new AbortController();
    const debounce = window.setTimeout(() => {
      fetchLocationAggregates(controller.signal);
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(debounce);
    };
  }, [fetchLocationAggregates, viewMode]);

  useEffect(() => {
    if (viewMode !== "locations") return;
    const interval = window.setInterval(() => {
      fetchLocations();
      fetchLocationAggregates();
    }, 15 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [fetchLocations, fetchLocationAggregates, viewMode]);

  const toggleLocationSort = useCallback(
    (key: string) => {
      if (locationSortBy !== key) {
        setLocationSortBy(key);
        setLocationSortDir("desc");
        setLocationSortIsDefault(false);
        return;
      }
      if (locationSortIsDefault) {
        setLocationSortDir("desc");
        setLocationSortIsDefault(false);
        return;
      }
      if (locationSortDir === "desc") {
        setLocationSortDir("asc");
        return;
      }
      setLocationSortBy("localizacao");
      setLocationSortDir("asc");
      setLocationSortIsDefault(true);
    },
    [locationSortBy, locationSortDir, locationSortIsDefault]
  );

  const getLocationSortIcon = useCallback(
    (key: string) => {
      if (locationSortIsDefault) return "";
      if (locationSortBy !== key) return "";
      return locationSortDir === "asc" ? "▲" : "▼";
    },
    [locationSortBy, locationSortDir, locationSortIsDefault]
  );

  const handleLocationRefresh = useCallback(() => {
    fetchLocations();
  }, [fetchLocations]);

  const resetLocationFilters = useCallback(() => {
    setLocationFilters({
      prefix: "8",
      descricao: "",
      localEstoque: "",
      localizacao: "",
      onlyPositive: false
    });
    setLocationSortBy("localizacao");
    setLocationSortDir("asc");
    setLocationSortIsDefault(true);
    setLocationPage(1);
    setExpandedLocation(null);
  }, []);

  const handleCopy = useCallback(async (value: string) => {
    if (!value) return;
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }, []);

  const toggleOrderSort = useCallback(
    (
      key:
        | "pedido"
        | "usr_Marca"
        | "acabado"
        | "tituloVenda"
        | "dtPedVenda"
        | "totalSolicitado"
        | "totalAtendido"
        | "percAtendimentoPedido"
        | "statusGrid"
    ) => {
      setOrderSort((prev) => {
        if (prev.key !== key) {
          return { key, dir: "desc" };
        }
        if (prev.dir === "desc") {
          return { key, dir: "asc" };
        }
        return { key: null, dir: null };
      });
    },
    []
  );

  const getOrderSortIcon = useCallback(
    (
      key:
        | "pedido"
        | "usr_Marca"
        | "acabado"
        | "tituloVenda"
        | "dtPedVenda"
        | "totalSolicitado"
        | "totalAtendido"
        | "percAtendimentoPedido"
        | "statusGrid"
    ) => {
      if (orderSort.key !== key || !orderSort.dir) return "";
      return orderSort.dir === "asc" ? "▲" : "▼";
    },
    [orderSort.key, orderSort.dir]
  );

  const toggleItemSort = useCallback(
    (
      key:
        | "codSku"
        | "usr_Marca"
        | "acabado"
        | "tituloVenda"
        | "descricao"
        | "qtdSolicitada"
        | "saldoEstoque"
        | "qtdAtendida"
        | "saldoRestante"
        | "percAtendimentoItem"
    ) => {
      setItemSort((prev) => {
        if (prev.key !== key) {
          return { key, dir: "desc" };
        }
        if (prev.dir === "desc") {
          return { key, dir: "asc" };
        }
        return { key: null, dir: null };
      });
    },
    []
  );

  const getItemSortIcon = useCallback(
    (
      key:
        | "codSku"
        | "usr_Marca"
        | "acabado"
        | "tituloVenda"
        | "descricao"
        | "qtdSolicitada"
        | "saldoEstoque"
        | "qtdAtendida"
        | "saldoRestante"
        | "percAtendimentoItem"
    ) => {
      if (itemSort.key !== key || !itemSort.dir) return "";
      return itemSort.dir === "asc" ? "▲" : "▼";
    },
    [itemSort.key, itemSort.dir]
  );

  const handleFilterLocalEstoque = useCallback((value: string) => {
    if (!value) return;
    setLocationFilters((prev) => ({
      ...prev,
      localEstoque: value,
      localizacao: ""
    }));
  }, []);

  const handleFilterLocalizacao = useCallback((value: string) => {
    if (!value) return;
    setLocationFilters((prev) => ({
      ...prev,
      localizacao: value
    }));
  }, []);

  return (
    <div className="app-shell divider-grid">
      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 py-8 2xl:max-w-[1700px]">
        <div className="flex items-center justify-end">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("orders")}
              className={`rounded-full px-4 py-1.5 transition ${
                viewMode === "orders"
                  ? "bg-violet-500/30 text-white shadow-[0_0_0_1px_rgba(139,92,246,0.6)]"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Pedidos
            </button>
            <button
              type="button"
              onClick={() => setViewMode("locations")}
              className={`rounded-full px-4 py-1.5 transition ${
                viewMode === "locations"
                  ? "bg-violet-500/30 text-white shadow-[0_0_0_1px_rgba(139,92,246,0.6)]"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Localizacao
            </button>
          </div>
        </div>

        {viewMode === "orders" && (
          <>
            <Card className="glass-card">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base text-white">Analise do GRID</CardTitle>
              <p className="text-xs text-muted-foreground">
                Ultima atualizacao: {formatDateTime(data?.lastRefreshAt ?? null)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-xs"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Atualizar agora
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-white/10 hover:shadow-[0_12px_40px_rgba(139,92,246,0.18)]">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Distribuicao de status
                </p>
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RechartsTooltip
                        contentStyle={tooltipContentStyle}
                        itemStyle={tooltipItemStyle}
                        labelStyle={tooltipLabelStyle}
                      />
                      <Pie
                        data={statusChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        fill="rgba(139,92,246,0.85)"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth={2}
                        isAnimationActive
                        onClick={(payload: any, _index: number, event: any) => {
                          const name = payload?.name as string | undefined;
                          if (!name) return;
                          handleFilterEvent(
                            { kind: "status", value: name },
                            Boolean(event?.shiftKey)
                          );
                        }}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${entry.name}`}
                            fill={statusColors[index % statusColors.length]}
                            opacity={
                              filters.status.length === 0 ||
                              filters.status.includes(entry.name as any)
                                ? 1
                                : 0.25
                            }
                          />
                        ))}
                      </Pie>
                      <Legend
                        wrapperStyle={{
                          color: "rgba(139,92,246,0.95)",
                          fontSize: 11
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-white/10 hover:shadow-[0_12px_40px_rgba(139,92,246,0.18)]">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Heatmap por dia e status
              </p>
              <div
                className="mt-4 grid gap-2 text-xs text-white/80"
                style={{
                  gridTemplateColumns: `140px repeat(${heatmap.days.length}, minmax(70px, 1fr))`
                }}
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Status
                </div>
                {heatmap.days.map((day) => (
                  <div
                    key={`h-${day.dateLabel}`}
                    className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    {day.dateLabel}
                  </div>
                ))}
                {heatmap.statusList.map((status) => (
                  <div key={`row-${status}`} className="contents">
                    <div
                      className={`text-white ${
                        filters.status.length > 0 && !filters.status.includes(status as any)
                          ? "opacity-40"
                          : ""
                      }`}
                    >
                      {formatStatusLabel(status)}
                    </div>
                    {heatmap.days.map((day) => {
                      const value = day.counts[status] ?? 0;
                      const intensity = Math.max(0.12, value / heatmap.max);
                      const statusActive =
                        filters.status.length === 0 || filters.status.includes(status as any);
                      const dateActive =
                        filters.date.length === 0 || filters.date.includes(day.dateKey);
                      const isDimmed = !(statusActive && dateActive);
                      return (
                        <div
                          key={`${status}-${day.dateLabel}`}
                          className={`rounded-md border border-white/10 px-2 py-2 text-center transition ${
                            isDimmed
                              ? "opacity-35"
                              : "cursor-pointer opacity-100 hover:border-violet-400/50"
                          }`}
                          style={{ backgroundColor: `rgba(139,92,246,${intensity})` }}
                          title={`${status} - ${day.dateLabel}: ${value}`}
                          onClick={(event) =>
                            handleFilterEvent(
                              {
                                kind: "status+date",
                                status,
                                date: day.dateKey
                              },
                              event.shiftKey
                            )
                          }
                        >
                          {value}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Status do GRID
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    { key: "Parcial", label: "Parcial", filter: "Parcial" },
                    { key: "Sem Saldo", label: "Sem Saldo", filter: "Sem Saldo" },
                    { key: "Total", label: "Com saldo", filter: "Total" },
                    { key: "TOTAL", label: "TOTAL", filter: null }
                  ].map((status) => {
                    const value = analysisCounts[status.key] ?? 0;
                    const max = Math.max(analysisCounts.TOTAL || 1, 1);
                    const width = Math.max(6, Math.round((value / max) * 100));
                    const isActive =
                      !status.filter ||
                      filters.status.length === 0 ||
                      filters.status.includes(status.filter as any);
                    return (
                      <div
                        key={status.key}
                        className={`space-y-1 rounded-lg px-2 py-1 transition ${
                          status.filter ? "cursor-pointer hover:bg-white/5" : ""
                        } ${isActive ? "" : "opacity-40"}`}
                        onClick={(event) => {
                          if (!status.filter) return;
                          handleFilterEvent(
                            { kind: "status", value: status.filter },
                            event.shiftKey
                          );
                        }}
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{status.label}</span>
                          <span className="text-white">{value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10">
                          <div
                            className="h-2 rounded-full bg-violet-500/80"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Comparativo
                </p>
                <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Status do GRID</th>
                        <th className="px-3 py-2 text-right">Ult. Relatorio</th>
                        <th className="px-3 py-2 text-right">Atual</th>
                        <th className="px-3 py-2 text-right">Dif</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparativoRows.map((row) => {
                        const isClickable = row.statusGrid !== "TOTAL";
                        const isActive =
                          !isClickable ||
                          filters.status.length === 0 ||
                          filters.status.includes(row.statusGrid as any);
                        return (
                          <tr
                            key={row.statusGrid}
                            className={`border-t border-white/10 transition ${
                              isClickable ? "cursor-pointer hover:bg-white/5" : ""
                            } ${isActive ? "" : "opacity-40"}`}
                            onClick={(event) => {
                              if (!isClickable) return;
                              handleFilterEvent(
                                { kind: "status", value: row.statusGrid },
                                event.shiftKey
                              );
                            }}
                          >
                          <td className="px-3 py-2 text-white">
                            {formatStatusLabel(row.statusGrid)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-white">
                            {row.ultRelatorio}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-white">
                            {row.atual}
                          </td>
                          <td
                            className={`px-3 py-2 text-right tabular-nums ${
                              row.dif > 0
                                ? "text-emerald-300"
                                : row.dif < 0
                                  ? "text-rose-300"
                                  : "text-white/70"
                            }`}
                          >
                            {row.dif > 0 ? `+${row.dif}` : row.dif}
                          </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base text-white">Pedidos Pendentes - GRID</CardTitle>
              <p className="text-xs text-muted-foreground">
                Ultima atualizacao: {formatDateTime(data?.lastRefreshAt ?? null)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {data?.refreshMode === "token" && (
                <Input
                  value={refreshToken}
                  onChange={(event) => setRefreshToken(event.target.value)}
                  placeholder="Token de refresh"
                  className="h-9 w-40 bg-muted/40 text-xs"
                />
              )}
              <Button
                variant="outline"
                className="border-white/10 bg-white/5"
                onClick={handleRefresh}
                disabled={loading}
              >
                {loading ? "Atualizando..." : "Atualizar agora"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {errorMessage}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Input
                value={filters.search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por pedido, status ou marca"
                className="h-10 w-full max-w-md bg-muted/40"
              />
              <select
                value={statusSelectValue}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "Todos") {
                    setStatus([]);
                    return;
                  }
                  if (value === "Multi") {
                    return;
                  }
                  setStatus([value as any]);
                }}
                className="h-10 rounded-md border border-white/10 bg-muted/40 px-3 text-xs text-white"
              >
                {statusOptions.map((status) => (
                  <option
                    key={status}
                    value={status}
                    className="text-slate-900"
                    disabled={status === "Multi"}
                  >
                    {status}
                  </option>
                ))}
              </select>
              <div className="text-xs text-muted-foreground">
                {filteredResumo.length.toLocaleString("pt-BR")} pedidos /{" "}
                {filteredItemsCount.toLocaleString("pt-BR")} itens
              </div>
            </div>
            {(filters.status.length > 0 || filters.date.length > 0 || filters.search) && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {filters.status.map((status) => (
                  <span
                    key={`status-${status}`}
                    className="rounded-full border border-violet-400/40 bg-violet-500/10 px-2 py-0.5 text-violet-200"
                  >
                    Status: {formatStatusLabel(status)}
                  </span>
                ))}
                {filters.date.map((date) => (
                  <span
                    key={`date-${date}`}
                    className="rounded-full border border-sky-400/40 bg-sky-500/10 px-2 py-0.5 text-sky-200"
                  >
                    Data: {date}
                  </span>
                ))}
                {filters.search && (
                  <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-white/80">
                    Busca: {filters.search}
                  </span>
                )}
                <button
                  type="button"
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/80 transition hover:border-violet-400/40 hover:text-white"
                  onClick={() => clearFilters()}
                >
                  Limpar filtros
                </button>
              </div>
            )}
            <div
              ref={tableRef}
              id="grid-table-anchor"
              className={`w-full overflow-x-auto rounded-2xl border bg-[#101010] shadow-[0_16px_40px_rgba(0,0,0,0.25)] ${
                tableFlash
                  ? "border-violet-400/70 shadow-[0_0_0_2px_rgba(139,92,246,0.35)]"
                  : "border-white/10"
              }`}
            >
              <table className="w-full min-w-[1400px] table-fixed border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-20 bg-gradient-to-r from-slate-950/95 via-slate-900/95 to-slate-950/95 backdrop-blur">
                  <tr>
                    <th className="sticky left-0 z-30 w-[56px] border-b border-white/10 bg-slate-950/95 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)] xl:px-3">
                      #
                    </th>
                    <th className="sticky left-[56px] z-30 w-[120px] border-b border-white/10 bg-slate-950/95 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)] xl:px-3">
                      <button
                        type="button"
                        onClick={() => toggleOrderSort("pedido")}
                        className="flex items-center gap-2"
                      >
                        pedido
                        <span className="text-[10px] text-white/50">
                          {getOrderSortIcon("pedido")}
                        </span>
                      </button>
                    </th>
                    <th className="w-[140px] border-b border-white/10 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground xl:px-3">
                      <button
                        type="button"
                        onClick={() => toggleOrderSort("usr_Marca")}
                        className="flex items-center gap-2"
                      >
                        marca
                        <span className="text-[10px] text-white/50">
                          {getOrderSortIcon("usr_Marca")}
                        </span>
                      </button>
                    </th>
                    <th className="w-[120px] border-b border-white/10 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground xl:px-3">
                      <button
                        type="button"
                        onClick={() => toggleOrderSort("dtPedVenda")}
                        className="flex items-center gap-2"
                      >
                        dtPedVenda
                        <span className="text-[10px] text-white/50">
                          {getOrderSortIcon("dtPedVenda")}
                        </span>
                      </button>
                    </th>
                    <th className="w-[90px] border-b border-white/10 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground xl:px-3">
                      <button
                        type="button"
                        onClick={() => toggleOrderSort("acabado")}
                        className="flex items-center gap-2"
                      >
                        acabado
                        <span className="text-[10px] text-white/50">
                          {getOrderSortIcon("acabado")}
                        </span>
                      </button>
                    </th>
                    <th className="w-[260px] border-b border-white/10 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground xl:px-3">
                      <button
                        type="button"
                        onClick={() => toggleOrderSort("tituloVenda")}
                        className="flex items-center gap-2"
                      >
                        tituloVenda
                        <span className="text-[10px] text-white/50">
                          {getOrderSortIcon("tituloVenda")}
                        </span>
                      </button>
                    </th>
                    <th className="w-[140px] border-b border-white/10 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground xl:px-3">
                      <button
                        type="button"
                        onClick={() => toggleOrderSort("totalSolicitado")}
                        className="flex items-center justify-end gap-2"
                      >
                        totalSolicitado
                        <span className="text-[10px] text-white/50">
                          {getOrderSortIcon("totalSolicitado")}
                        </span>
                      </button>
                    </th>
                    <th className="w-[140px] border-b border-white/10 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground xl:px-3">
                      <button
                        type="button"
                        onClick={() => toggleOrderSort("totalAtendido")}
                        className="flex items-center justify-end gap-2"
                      >
                        totalAtendido
                        <span className="text-[10px] text-white/50">
                          {getOrderSortIcon("totalAtendido")}
                        </span>
                      </button>
                    </th>
                    <th className="w-[120px] border-b border-white/10 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground xl:px-3">
                      <button
                        type="button"
                        onClick={() => toggleOrderSort("percAtendimentoPedido")}
                        className="flex items-center justify-end gap-2"
                      >
                        percPedido
                        <span className="text-[10px] text-white/50">
                          {getOrderSortIcon("percAtendimentoPedido")}
                        </span>
                      </button>
                    </th>
                    <th className="w-[140px] border-b border-white/10 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground xl:px-3">
                      <button
                        type="button"
                        onClick={() => toggleOrderSort("statusGrid")}
                        className="flex items-center gap-2"
                      >
                        statusGrid
                        <span className="text-[10px] text-white/50">
                          {getOrderSortIcon("statusGrid")}
                        </span>
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !data ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={`loading-${idx}`} className="border-b border-white/5">
                        <td className="px-3 py-3 text-white/40">Carregando...</td>
                        <td className="px-3 py-3 text-white/40" />
                        <td className="px-3 py-3 text-white/40" />
                        <td className="px-3 py-3 text-white/40" />
                        <td className="px-3 py-3 text-white/40" />
                        <td className="px-3 py-3 text-white/40" />
                        <td className="px-3 py-3 text-white/40" />
                        <td className="px-3 py-3 text-white/40" />
                      </tr>
                    ))
                  ) : (
                    pageSlice.map((row) => {
                      const isExpanded = expandedPedido === row.pedido;
                      const items = itemsByPedido.get(row.pedido) ?? [];
                      const displayItems =
                        itemSort.key && itemSort.dir
                          ? [...items].sort((a, b) => {
                              const dir = itemSort.dir === "asc" ? 1 : -1;
                              switch (itemSort.key) {
                                case "codSku":
                                  return a.codSku.localeCompare(b.codSku) * dir;
                                case "usr_Marca":
                                  return (a.usr_Marca ?? "").localeCompare(b.usr_Marca ?? "") * dir;
                                case "acabado":
                                  return (a.acabado ?? "").localeCompare(b.acabado ?? "") * dir;
                                case "tituloVenda":
                                  return (a.tituloVenda ?? "")
                                    .localeCompare(b.tituloVenda ?? "") * dir;
                                case "descricao":
                                  return (a.descricao ?? "").localeCompare(b.descricao ?? "") * dir;
                                case "qtdSolicitada":
                                  return (a.qtdSolicitada - b.qtdSolicitada) * dir;
                                case "saldoEstoque":
                                  return (a.saldoEstoque - b.saldoEstoque) * dir;
                                case "qtdAtendida":
                                  return (a.qtdAtendida - b.qtdAtendida) * dir;
                                case "saldoRestante":
                                  return (a.saldoRestante - b.saldoRestante) * dir;
                                case "percAtendimentoItem":
                                  return (a.percAtendimentoItem - b.percAtendimentoItem) * dir;
                                default:
                                  return 0;
                              }
                            })
                          : items;
                      return (
                        <Fragment key={row.pedido}>
                          <tr
                            className="cursor-pointer border-b border-white/5 transition hover:bg-white/5 odd:bg-white/2"
                            onClick={() =>
                              setExpandedPedido((prev) => (prev === row.pedido ? null : row.pedido))
                            }
                          >
                            <td className="sticky left-0 z-20 bg-[#101010] px-2 py-2 text-white/80 shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)] xl:px-3">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px]">
                                {isExpanded ? "v" : ">"}
                              </span>
                            </td>
                            <td className="sticky left-[56px] z-20 bg-[#101010] px-2 py-2 text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)] xl:px-3">
                              {row.pedido || "--"}
                            </td>
                            <td className="px-2 py-2 text-white/90 xl:px-3">
                              <span className="block truncate" title={row.usr_Marca || ""}>
                                {row.usr_Marca || "--"}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-white/80 xl:px-3">
                              {formatDate(row.dtPedVenda)}
                            </td>
                            <td className="px-2 py-2 text-white/80 xl:px-3">
                              {formatText(row.acabado)}
                            </td>
                            <td className="px-2 py-2 text-white/80 xl:px-3">
                              <span className="block truncate" title={row.tituloVenda ?? ""}>
                                {formatText(row.tituloVenda)}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-white xl:px-3">
                              {formatNumber(row.totalSolicitado)}
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-white xl:px-3">
                              {formatNumber(row.totalAtendido)}
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-white xl:px-3">
                              {formatNumber(row.percAtendimentoPedido * 100)}%
                            </td>
                            <td className="px-2 py-2 text-white/90 xl:px-3">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                  row.statusGrid === "Sem Saldo"
                                    ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
                                    : row.statusGrid === "Parcial"
                                      ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
                                      : "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                                }`}
                              >
                                {formatStatusLabel(row.statusGrid)}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="border-b border-white/5 bg-white/5">
                              <td colSpan={10} className="px-3 py-4">
                                <div className="pl-[84px]">
                                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-gradient-to-br from-white/5 via-transparent to-white/5 shadow-[0_14px_30px_rgba(0,0,0,0.25)]">
                                  <table className="w-full min-w-[1500px] table-fixed border-separate border-spacing-0 text-xs">
                                    <thead className="bg-white/10 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                                      <tr>
                                        <th className="w-[140px] px-2 py-2 text-left xl:px-4">
                                          <button
                                            type="button"
                                            onClick={() => toggleItemSort("codSku")}
                                            className="flex items-center gap-2"
                                          >
                                            codSku
                                            <span className="text-[10px] text-white/40">
                                              {getItemSortIcon("codSku")}
                                            </span>
                                          </button>
                                        </th>
                                        <th className="w-[180px] px-2 py-2 text-left xl:px-4">
                                          <button
                                            type="button"
                                            onClick={() => toggleItemSort("usr_Marca")}
                                            className="flex items-center gap-2"
                                          >
                                            marca
                                            <span className="text-[10px] text-white/40">
                                              {getItemSortIcon("usr_Marca")}
                                            </span>
                                          </button>
                                        </th>
                                        <th className="w-[110px] px-2 py-2 text-left xl:px-4">
                                          <button
                                            type="button"
                                            onClick={() => toggleItemSort("acabado")}
                                            className="flex items-center gap-2"
                                          >
                                            acabado
                                            <span className="text-[10px] text-white/40">
                                              {getItemSortIcon("acabado")}
                                            </span>
                                          </button>
                                        </th>
                                        <th className="w-[220px] px-2 py-2 text-left xl:px-4">
                                          <button
                                            type="button"
                                            onClick={() => toggleItemSort("tituloVenda")}
                                            className="flex items-center gap-2"
                                          >
                                            tituloVenda
                                            <span className="text-[10px] text-white/40">
                                              {getItemSortIcon("tituloVenda")}
                                            </span>
                                          </button>
                                        </th>
                                        <th className="w-[360px] px-2 py-2 text-left xl:px-4">
                                          <button
                                            type="button"
                                            onClick={() => toggleItemSort("descricao")}
                                            className="flex items-center gap-2"
                                          >
                                            descricao
                                            <span className="text-[10px] text-white/40">
                                              {getItemSortIcon("descricao")}
                                            </span>
                                          </button>
                                        </th>
                                        <th className="w-[140px] px-2 py-2 text-right xl:px-4">
                                          <button
                                            type="button"
                                            onClick={() => toggleItemSort("qtdSolicitada")}
                                            className="flex items-center justify-end gap-2"
                                          >
                                            qtdSolicitada
                                            <span className="text-[10px] text-white/40">
                                              {getItemSortIcon("qtdSolicitada")}
                                            </span>
                                          </button>
                                        </th>
                                        <th className="w-[140px] px-2 py-2 text-right xl:px-4">
                                          <button
                                            type="button"
                                            onClick={() => toggleItemSort("saldoEstoque")}
                                            className="flex items-center justify-end gap-2"
                                          >
                                            saldoEstoque
                                            <span className="text-[10px] text-white/40">
                                              {getItemSortIcon("saldoEstoque")}
                                            </span>
                                          </button>
                                        </th>
                                        <th className="w-[140px] px-2 py-2 text-right xl:px-4">
                                          <button
                                            type="button"
                                            onClick={() => toggleItemSort("qtdAtendida")}
                                            className="flex items-center justify-end gap-2"
                                          >
                                            qtdAtendida
                                            <span className="text-[10px] text-white/40">
                                              {getItemSortIcon("qtdAtendida")}
                                            </span>
                                          </button>
                                        </th>
                                        <th className="w-[140px] px-2 py-2 text-right xl:px-4">
                                          <button
                                            type="button"
                                            onClick={() => toggleItemSort("saldoRestante")}
                                            className="flex items-center justify-end gap-2"
                                          >
                                            saldoRestante
                                            <span className="text-[10px] text-white/40">
                                              {getItemSortIcon("saldoRestante")}
                                            </span>
                                          </button>
                                        </th>
                                        <th className="w-[120px] px-2 py-2 text-right xl:px-4">
                                          <button
                                            type="button"
                                            onClick={() => toggleItemSort("percAtendimentoItem")}
                                            className="flex items-center justify-end gap-2"
                                          >
                                            percItem
                                            <span className="text-[10px] text-white/40">
                                              {getItemSortIcon("percAtendimentoItem")}
                                            </span>
                                          </button>
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {displayItems.map((item, index) => (
                                        <tr
                                          key={`${item.codSku}-${index}`}
                                          className="border-t border-white/10 transition hover:bg-white/5"
                                        >
                                          <td className="px-2 py-2 text-white/90 xl:px-4">
                                            <span className="inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-violet-200">
                                              {item.codSku || "--"}
                                            </span>
                                          </td>
                                          <td className="px-2 py-2 text-white/90 xl:px-4">
                                            <span
                                              className="block truncate whitespace-nowrap"
                                              title={item.usr_Marca || ""}
                                            >
                                              {item.usr_Marca || "--"}
                                            </span>
                                          </td>
                                          <td className="px-2 py-2 text-white/90 xl:px-4">
                                            {formatText(item.acabado)}
                                          </td>
                                          <td className="px-2 py-2 text-white/90 xl:px-4">
                                            <span
                                              className="block truncate whitespace-nowrap"
                                              title={item.tituloVenda ?? ""}
                                            >
                                              {formatText(item.tituloVenda)}
                                            </span>
                                          </td>
                                          <td className="px-2 py-2 text-white/90 xl:px-4">
                                            <span
                                              className="block truncate whitespace-nowrap"
                                              title={item.descricao || ""}
                                            >
                                              {item.descricao || "--"}
                                            </span>
                                          </td>
                                          <td className="px-2 py-2 text-right tabular-nums text-white xl:px-4">
                                            {formatNumber(item.qtdSolicitada)}
                                          </td>
                                          <td className="px-2 py-2 text-right tabular-nums text-white xl:px-4">
                                            {formatNumber(item.saldoEstoque)}
                                          </td>
                                          <td className="px-2 py-2 text-right tabular-nums text-white xl:px-4">
                                            {formatNumber(item.qtdAtendida)}
                                          </td>
                                          <td className="px-2 py-2 text-right tabular-nums text-white xl:px-4">
                                            {formatNumber(item.saldoRestante)}
                                          </td>
                                          <td className="px-2 py-2 text-right tabular-nums text-white xl:px-4">
                                            <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                                              {formatNumber(item.percAtendimentoItem * 100)}%
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Pagina {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 bg-white/5"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 bg-white/5"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Proxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
          </>
        )}

        {viewMode === "locations" && (
          <Card className="glass-card border border-white/5 bg-[var(--premium-surface-1)]">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base text-[var(--premium-text)]">
                  Localizacao do item
                </CardTitle>
                <p className="text-xs text-[var(--premium-text-muted)]">
                  Inventario por localizacao com filtros e paginacao.
                </p>
                <p className="text-[11px] text-[var(--premium-text-soft)]">
                  Ultima atualizacao: {formatDateTime(locationLastUpdated)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-violet-400/30 bg-violet-400/10 text-xs text-violet-100 hover:border-violet-400/60"
                  onClick={() => {
                    fetchLocations(undefined, true);
                    fetchLocationAggregates(undefined, true);
                  }}
                  disabled={locationLoading || locationAggregatesLoading}
                >
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Atualizar agora
                </Button>
                <Badge
                  variant="outline"
                  className="border-violet-400/30 bg-violet-400/10 text-violet-100"
                >
                  {locationTotal.toLocaleString("pt-BR")} itens
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {locationError && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {locationError}
                </div>
              )}
              <div className="sticky top-4 z-30 rounded-2xl p-4 premium-sticky">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--premium-text-soft)]">
                    <SlidersHorizontal className="h-4 w-4 text-violet-200/80" />
                    Filtros de localizacao
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/10 bg-white/5 text-xs text-white/80 hover:border-violet-400/40 hover:text-white"
                      onClick={resetLocationFilters}
                      disabled={locationLoading}
                    >
                      <X className="mr-2 h-3.5 w-3.5" />
                      Limpar filtros
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-violet-400/30 bg-violet-400/10 text-xs text-violet-100 hover:border-violet-400/60"
                      onClick={handleLocationRefresh}
                      disabled={locationLoading}
                    >
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                      Atualizar
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-1 text-xs text-[var(--premium-text-muted)]">
                    <span>Prefixo do item</span>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <Input
                        value={locationFilters.prefix}
                        onChange={(event) =>
                          setLocationFilters((prev) => ({
                            ...prev,
                            prefix: event.target.value
                          }))
                        }
                        placeholder="8"
                        className="h-11 bg-[var(--premium-surface-1)] pl-9 text-white placeholder:text-white/35 focus-visible:ring-violet-400/50"
                      />
                    </div>
                  </label>
                  <label className="space-y-1 text-xs text-[var(--premium-text-muted)]">
                    <span>Buscar descricao</span>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <Input
                        value={locationFilters.descricao}
                        onChange={(event) =>
                          setLocationFilters((prev) => ({
                            ...prev,
                            descricao: event.target.value
                          }))
                        }
                        placeholder="Descricao"
                        className="h-11 bg-[var(--premium-surface-1)] pl-9 text-white placeholder:text-white/35 focus-visible:ring-violet-400/50"
                      />
                    </div>
                  </label>
                  <label className="space-y-1 text-xs text-[var(--premium-text-muted)]">
                    <span>Local Estoque</span>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <Input
                        value={locationFilters.localEstoque}
                        onChange={(event) =>
                          setLocationFilters((prev) => ({
                            ...prev,
                            localEstoque: event.target.value
                          }))
                        }
                        placeholder="Local"
                        className="h-11 bg-[var(--premium-surface-1)] pl-9 text-white placeholder:text-white/35 focus-visible:ring-violet-400/50"
                      />
                    </div>
                  </label>
                  <div className="flex items-end">
                    <label className="flex items-center gap-3 text-xs text-[var(--premium-text-muted)]">
                      <Switch
                        checked={locationFilters.onlyPositive}
                        onCheckedChange={(checked) =>
                          setLocationFilters((prev) => ({
                            ...prev,
                            onlyPositive: checked
                          }))
                        }
                      />
                      Somente saldo &gt; 0
                    </label>
                  </div>
                </div>
                {locationFilters.localizacao && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className="border-violet-400/30 bg-violet-400/10 text-violet-100"
                    >
                      Localizacao: {locationFilters.localizacao}
                    </Badge>
                    <button
                      type="button"
                      className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-violet-200"
                      onClick={() =>
                        setLocationFilters((prev) => ({
                          ...prev,
                          localizacao: ""
                        }))
                      }
                    >
                      Limpar
                    </button>
                  </div>
                )}
              </div>
              <ChartsPanel
                aggregates={locationAggregates}
                loading={locationAggregatesLoading}
                onFilterLocalEstoque={handleFilterLocalEstoque}
                onFilterLocalizacao={handleFilterLocalizacao}
              />
              <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-[var(--premium-bg)] shadow-[var(--premium-shadow)]">
                <table className="w-full min-w-[1200px] table-fixed border-separate border-spacing-0 text-[12px] xl:text-[13px]">
                  <thead className="sticky top-0 z-20 bg-[var(--premium-surface-1)] backdrop-blur">
                    <tr>
                      <th className="sticky left-0 z-30 w-[56px] border-b border-white/10 bg-[var(--premium-surface-1)] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--premium-text-soft)] xl:px-4 xl:py-3">
                        #
                      </th>
                      <th className="sticky left-[56px] z-30 w-[180px] border-b border-white/10 bg-[var(--premium-surface-1)] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--premium-text-soft)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)] xl:px-4 xl:py-3">
                        <button
                          type="button"
                          onClick={() => toggleLocationSort("coditem")}
                          className="flex items-center gap-2"
                        >
                          Codigo Item
                          <span className="text-[10px] text-white/50">
                            {getLocationSortIcon("coditem")}
                          </span>
                        </button>
                      </th>
                      <th className="w-[320px] border-b border-white/10 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--premium-text-soft)] xl:px-4 xl:py-3">
                        <button
                          type="button"
                          onClick={() => toggleLocationSort("itemdescricao")}
                          className="flex items-center gap-2"
                        >
                          Descricao Item
                          <span className="text-[10px] text-white/50">
                            {getLocationSortIcon("itemdescricao")}
                          </span>
                        </button>
                      </th>
                      <th className="w-[200px] border-b border-white/10 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--premium-text-soft)] xl:px-4 xl:py-3">
                        <button
                          type="button"
                          onClick={() => toggleLocationSort("localestoque")}
                          className="flex items-center gap-2"
                        >
                          Local Estoque
                          <span className="text-[10px] text-white/50">
                            {getLocationSortIcon("localestoque")}
                          </span>
                        </button>
                      </th>
                      <th className="w-[200px] border-b border-white/10 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--premium-text-soft)] xl:px-4 xl:py-3">
                        <button
                          type="button"
                          onClick={() => toggleLocationSort("localizacao")}
                          className="flex items-center gap-2"
                        >
                          Localizacao
                          <span className="text-[10px] text-white/50">
                            {getLocationSortIcon("localizacao")}
                          </span>
                        </button>
                      </th>
                      <th className="w-[160px] border-b border-white/10 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--premium-text-soft)] xl:px-4 xl:py-3">
                        <button
                          type="button"
                          onClick={() => toggleLocationSort("qtdsaldo")}
                          className="flex items-center gap-2"
                        >
                          Saldo Est.
                          <span className="text-[10px] text-white/50">
                            {getLocationSortIcon("qtdsaldo")}
                          </span>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationLoading && locationRows.length === 0 ? (
                      Array.from({ length: 6 }).map((_, idx) => (
                        <tr key={`loading-location-${idx}`} className="border-b border-white/5">
                          <td className="px-2 py-2 text-white/40 xl:px-4 xl:py-3">
                            Carregando...
                          </td>
                          <td className="px-2 py-2 text-white/40 xl:px-4 xl:py-3" />
                          <td className="px-2 py-2 text-white/40 xl:px-4 xl:py-3" />
                          <td className="px-2 py-2 text-white/40 xl:px-4 xl:py-3" />
                          <td className="px-2 py-2 text-white/40 xl:px-4 xl:py-3" />
                        </tr>
                      ))
                    ) : locationRows.length === 0 ? (
                      <tr className="border-b border-white/5">
                        <td className="px-2 py-4 text-white/70 xl:px-4" colSpan={6}>
                          Nenhum resultado encontrado.
                        </td>
                      </tr>
                    ) : (
                      locationRows.map((row) => {
                        const rowKey = getLocationKey(row);
                        const isExpanded = expandedLocation === rowKey;
                        const detailItems = [
                          { label: "Unid.", value: formatText(row.unidadeEst) },
                          { label: "Grupo", value: formatText(row.codGrupo) },
                          { label: "Nome Grupo", value: formatText(row.nomeGrupo) },
                          { label: "Grupo Master", value: formatText(row.nomeMasterGrupo) },
                          { label: "Lote", value: formatText(row.lote) },
                          { label: "Validade", value: formatDate(row.dataValidadeLote ?? "") },
                          { label: "Saldo Un Custo", value: formatNumberSafe(row.qtdSaldoUniCusto) },
                          { label: "Un. Custo", value: formatText(row.unidadeCusto) },
                          { label: "Prec. Custo", value: formatNumberSafe(row.precisaoCusto) },
                          { label: "Prec. Est", value: formatNumberSafe(row.precisaoEst) },
                          { label: "Cubagem", value: formatNumberSafe(row.cubagem) },
                          { label: "Peso Vol.", value: formatNumberSafe(row.pesoVolume) },
                          { label: "Volume", value: formatNumberSafe(row.volume) },
                          { label: "Num Ordem", value: formatNumberSafe(row.numOrdem) },
                          { label: "Cod Cliente", value: formatText(row.codCliente) },
                          { label: "Nome Cliente", value: formatText(row.nomeCliente) }
                        ];

                        return (
                          <Fragment key={rowKey}>
                            <tr
                              className={`group cursor-pointer border-b border-white/5 transition-colors ${
                                isExpanded
                                  ? "bg-[var(--premium-accent-soft)]"
                                  : "odd:bg-white/[0.02] hover:bg-[var(--premium-surface-2)]"
                              }`}
                              onClick={() =>
                                setExpandedLocation((prev) => (prev === rowKey ? null : rowKey))
                              }
                            >
                              <td
                                className={`sticky left-0 z-10 bg-[var(--premium-bg)] px-2 py-2 text-white/80 xl:px-4 xl:py-3 ${
                                  isExpanded
                                    ? "border-l-2 border-violet-300/80 bg-[var(--premium-accent-soft)]"
                                    : "border-l-2 border-transparent group-hover:border-violet-300/60 group-hover:bg-[var(--premium-surface-2)]"
                                }`}
                              >
                                <button
                                  type="button"
                                  aria-expanded={isExpanded}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-violet-300/50 hover:text-white"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setExpandedLocation((prev) =>
                                      prev === rowKey ? null : rowKey
                                    );
                                  }}
                                >
                                  <ChevronDown
                                    className={`h-4 w-4 transition-transform ${
                                      isExpanded ? "rotate-180" : "rotate-0"
                                    }`}
                                  />
                                </button>
                              </td>
                              <td
                                className={`sticky left-[56px] z-10 bg-[var(--premium-bg)] px-2 py-2 text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)] xl:px-4 xl:py-3 ${
                                  isExpanded
                                    ? "bg-[var(--premium-accent-soft)]"
                                    : "group-hover:bg-[var(--premium-surface-2)]"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[13px] text-white/90">
                                    {formatText(row.codItem)}
                                  </span>
                                  {row.codItem && (
                                    <button
                                      type="button"
                                      className="opacity-0 transition group-hover:opacity-100"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleCopy(String(row.codItem));
                                      }}
                                      aria-label="Copiar codigo do item"
                                    >
                                      <Copy className="h-3.5 w-3.5 text-white/50 hover:text-violet-200" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 py-2 text-white/90 xl:px-4 xl:py-3">
                                <span
                                  className="block truncate whitespace-nowrap"
                                  title={row.itemDescricao ?? ""}
                                >
                                  {formatText(row.itemDescricao)}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-white/80 xl:px-4 xl:py-3">
                                <span
                                  className="block truncate whitespace-nowrap"
                                  title={row.localEstoque ?? ""}
                                >
                                  {formatText(row.localEstoque)}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-white/90 xl:px-4 xl:py-3">
                                {row.localizacao ? (
                                  <Badge
                                    variant="outline"
                                    className="border-violet-400/30 bg-violet-400/10 text-violet-100"
                                  >
                                    {row.localizacao}
                                  </Badge>
                                ) : (
                                  "--"
                                )}
                              </td>
                              <td className="px-2 py-2 text-right font-semibold tabular-nums text-white xl:px-4 xl:py-3">
                                {formatNumberSafe(row.qtdSaldo)}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="border-b border-white/5 bg-[var(--premium-surface-2)]">
                                <td colSpan={6} className="px-4 py-4">
                                  <div className="rounded-2xl border border-white/10 bg-[var(--premium-surface-1)] p-4">
                                    <div className="mb-3 text-xs uppercase tracking-[0.24em] text-[var(--premium-text-soft)]">
                                      Detalhes do item
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                      {detailItems.map((detail) => (
                                        <div
                                          key={detail.label}
                                          className="rounded-xl border border-white/10 bg-[var(--premium-surface-2)] px-3 py-2"
                                        >
                                          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--premium-text-soft)]">
                                            {detail.label}
                                          </p>
                                          <p className="mt-1 text-xs text-[var(--premium-text)]">
                                            {detail.value}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--premium-text-muted)]">
                <span>
                  Pagina {locationPage} de {locationTotalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 text-xs text-white/80 hover:border-violet-400/40"
                    disabled={locationPage <= 1 || locationLoading}
                    onClick={() => setLocationPage((prev) => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 text-xs text-white/80 hover:border-violet-400/40"
                    disabled={locationPage >= locationTotalPages || locationLoading}
                    onClick={() =>
                      setLocationPage((prev) => Math.min(locationTotalPages, prev + 1))
                    }
                  >
                    Proxima
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

