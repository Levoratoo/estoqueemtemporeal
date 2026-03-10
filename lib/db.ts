import sql from "mssql";

const parseBool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
};

const resolveServerConfig = () => {
  const legacyServer = process.env.DB_SERVER;
  const host = process.env.DB_HOST;
  const instance = process.env.DB_INSTANCE;
  const portRaw = process.env.DB_PORT;
  const port = portRaw ? Number(portRaw) : undefined;

  if (host) {
    return {
      server: host,
      instanceName: instance,
      port
    };
  }

  if (legacyServer && legacyServer.includes("\\")) {
    const [legacyHost, legacyInstance] = legacyServer.split("\\");
    return {
      server: legacyHost,
      instanceName: legacyInstance,
      port
    };
  }

  return {
    server: legacyServer ?? "",
    instanceName: instance,
    port
  };
};

const { server, instanceName, port } = resolveServerConfig();

const config: sql.config = {
  server,
  database: process.env.DB_DATABASE ?? "",
  user: process.env.DB_USER ?? "",
  password: process.env.DB_PASSWORD ?? "",
  options: {
    encrypt: parseBool(process.env.DB_ENCRYPT, false),
    trustServerCertificate: parseBool(process.env.DB_TRUST_SERVER_CERT, true),
    instanceName: port ? undefined : instanceName || undefined
  },
  port,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  requestTimeout: process.env.DB_REQUEST_TIMEOUT_MS
    ? Number(process.env.DB_REQUEST_TIMEOUT_MS)
    : 60000
};

const globalForDb = globalThis as typeof globalThis & { __dbPool?: Promise<sql.ConnectionPool> };

export const getPool = () => {
  if (!globalForDb.__dbPool) {
    globalForDb.__dbPool = new sql.ConnectionPool(config).connect();
  }

  return globalForDb.__dbPool;
};

export const sqlTypes = sql;

