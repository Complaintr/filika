import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

export interface DbHandle {
  close(): Promise<void>;
  db: Db;
}

export function createDb(databaseUrl: string): DbHandle {
  const client = postgres(databaseUrl, { prepare: false });
  const db = drizzle(client, { schema });

  return {
    close: () => client.end(),
    db,
  };
}
