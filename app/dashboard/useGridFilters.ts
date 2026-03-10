import { useReducer } from "react";

export type GridStatus = "Parcial" | "Sem Saldo" | "Total";

export type GridFilters = {
  status: GridStatus[];
  date: string[];
  search: string;
  marca: string[];
};

type FilterEvent =
  | { kind: "status"; value: GridStatus }
  | { kind: "date"; value: string }
  | { kind: "status+date"; status: GridStatus; date: string };

type FilterAction =
  | { type: "SET_SEARCH"; value: string }
  | { type: "SET_STATUS"; value: GridStatus[] }
  | { type: "SET_DATE"; value: string[] }
  | { type: "TOGGLE_EVENT"; event: FilterEvent; multi?: boolean }
  | { type: "CLEAR" };

export const normalizeDay = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatStatusLabel = (status: string) =>
  status === "Total" ? "Com saldo" : status;

const toggleInArray = <T,>(arr: T[], value: T, multi?: boolean) => {
  const exists = arr.includes(value);
  if (!multi) {
    return exists ? [] : [value];
  }
  return exists ? arr.filter((item) => item !== value) : [...arr, value];
};

const initialFilters: GridFilters = {
  status: [],
  date: [],
  search: "",
  marca: []
};

const reducer = (state: GridFilters, action: FilterAction): GridFilters => {
  switch (action.type) {
    case "SET_SEARCH":
      return { ...state, search: action.value };
    case "SET_STATUS":
      return { ...state, status: action.value };
    case "SET_DATE":
      return { ...state, date: action.value };
    case "TOGGLE_EVENT": {
      const { event, multi } = action;
      if (event.kind === "status") {
        return { ...state, status: toggleInArray(state.status, event.value, multi) };
      }
      if (event.kind === "date") {
        return { ...state, date: toggleInArray(state.date, event.value, multi) };
      }
      const statusSame = state.status.length === 1 && state.status[0] === event.status;
      const dateSame = state.date.length === 1 && state.date[0] === event.date;
      if (!multi && statusSame && dateSame) {
        return { ...state, status: [], date: [] };
      }
      if (!multi) {
        return { ...state, status: [event.status], date: [event.date] };
      }
      return {
        ...state,
        status: toggleInArray(state.status, event.status, true),
        date: toggleInArray(state.date, event.date, true)
      };
    }
    case "CLEAR":
      return { ...initialFilters, search: state.search };
    default:
      return state;
  }
};

export const applyFiltersToResumo = <T extends { pedido: string; dtPedVenda: string; statusGrid: string; usr_Marca?: string }>(
  rows: T[],
  filters: GridFilters
) => {
  const search = filters.search.trim().toLowerCase();
  const statusFilter = filters.status;
  const dateFilter = filters.date;
  const marcaFilter = filters.marca;

  return rows.filter((row) => {
    const status = row.statusGrid;
    if (statusFilter.length > 0 && !statusFilter.includes(status as GridStatus)) {
      return false;
    }
    if (dateFilter.length > 0) {
      const day = normalizeDay(row.dtPedVenda);
      if (!dateFilter.includes(day)) return false;
    }
    if (marcaFilter.length > 0) {
      const marca = row.usr_Marca ?? "";
      if (!marcaFilter.includes(marca)) return false;
    }
    if (!search) return true;
    const statusLabel = formatStatusLabel(status).toLowerCase();
    const marcaValue = (row.usr_Marca ?? "").toLowerCase();
    return (
      row.pedido.toLowerCase().includes(search) ||
      status.toLowerCase().includes(search) ||
      statusLabel.includes(search) ||
      marcaValue.includes(search)
    );
  });
};

export const useGridFilters = () => {
  const [filters, dispatch] = useReducer(reducer, initialFilters);

  const setSearch = (value: string) => dispatch({ type: "SET_SEARCH", value });
  const setStatus = (value: GridStatus[]) => dispatch({ type: "SET_STATUS", value });
  const setDate = (value: string[]) => dispatch({ type: "SET_DATE", value });
  const toggleEvent = (event: FilterEvent, multi?: boolean) =>
    dispatch({ type: "TOGGLE_EVENT", event, multi });
  const clearFilters = () => dispatch({ type: "CLEAR" });

  return {
    filters,
    setSearch,
    setStatus,
    setDate,
    toggleEvent,
    clearFilters
  };
};
