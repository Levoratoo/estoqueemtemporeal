import { describe, expect, it } from "vitest";
import { computeDataset } from "../compute";

const baseRow = {
  pedido: "",
  dtPedVenda: "2024-01-01T00:00:00.000Z",
  codSku: "SKU",
  descricao: "Item",
  qtdSolicitada: 0,
  saldoEstoque: 0
};

describe("computeDataset", () => {
  it("classifica pedidos com saldo total", () => {
    const rows = [
      {
        ...baseRow,
        pedido: "A1",
        qtdSolicitada: 5,
        saldoEstoque: 5
      },
      {
        ...baseRow,
        pedido: "A1",
        qtdSolicitada: 2,
        saldoEstoque: 10
      }
    ];

    const result = computeDataset(rows);
    const pedido = result.resumo.find((row) => row.pedido === "A1");

    expect(pedido?.statusGrid).toBe("Total");
    expect(pedido?.totalAtendido).toBe(7);
    expect(pedido?.totalSolicitado).toBe(7);
  });

  it("classifica pedidos sem saldo", () => {
    const rows = [
      {
        ...baseRow,
        pedido: "B1",
        qtdSolicitada: 4,
        saldoEstoque: 0
      }
    ];

    const result = computeDataset(rows);
    const pedido = result.resumo.find((row) => row.pedido === "B1");

    expect(pedido?.statusGrid).toBe("Sem Saldo");
    expect(pedido?.totalAtendido).toBe(0);
  });

  it("classifica pedidos parciais", () => {
    const rows = [
      {
        ...baseRow,
        pedido: "C1",
        qtdSolicitada: 10,
        saldoEstoque: 4
      }
    ];

    const result = computeDataset(rows);
    const pedido = result.resumo.find((row) => row.pedido === "C1");

    expect(pedido?.statusGrid).toBe("Parcial");
    expect(pedido?.totalAtendido).toBe(4);
  });
});
