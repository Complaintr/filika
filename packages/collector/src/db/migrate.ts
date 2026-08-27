import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDb } from "./client";

const handle = createDb(process.env.DATABASE_URL ?? "postgres://localhost:5432/filika");

await migrate(handle.db, { migrationsFolder: "drizzle" });
await handle.close();

console.log("Filika migrations applied.");
