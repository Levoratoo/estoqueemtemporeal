import type sql from "mssql";

export type SnapshotCounts = {
  parcial: number;
  semSaldo: number;
  comSaldo: number;
  total: number;
};

export const ensureSnapshotTable = async (pool: sql.ConnectionPool) => {
  const query = `
    IF OBJECT_ID('dbo.grid_snapshot', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.grid_snapshot (
        id INT IDENTITY(1,1) PRIMARY KEY,
        snapshot_at DATETIME2 NOT NULL CONSTRAINT DF_grid_snapshot_snapshot_at DEFAULT SYSDATETIME(),
        parcial INT NOT NULL,
        sem_saldo INT NOT NULL,
        com_saldo INT NOT NULL,
        total INT NOT NULL
      );
    END
  `;

  await pool.request().query(query);
};

export const insertSnapshot = async (pool: sql.ConnectionPool, counts: SnapshotCounts) => {
  const query = `
    INSERT INTO dbo.grid_snapshot (parcial, sem_saldo, com_saldo, total)
    VALUES (@parcial, @semSaldo, @comSaldo, @total)
  `;

  await pool
    .request()
    .input("parcial", counts.parcial)
    .input("semSaldo", counts.semSaldo)
    .input("comSaldo", counts.comSaldo)
    .input("total", counts.total)
    .query(query);
};

export const getLatestSnapshot = async (pool: sql.ConnectionPool) => {
  const query = `
    SELECT TOP (1) parcial, sem_saldo, com_saldo, total, snapshot_at
    FROM dbo.grid_snapshot
    ORDER BY snapshot_at DESC
  `;

  const result = await pool.request().query(query);
  if (result.recordset.length === 0) return null;
  return result.recordset[0] as {
    parcial: number;
    sem_saldo: number;
    com_saldo: number;
    total: number;
    snapshot_at: Date;
  };
};

