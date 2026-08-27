import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { createDb } from "./client";
import { seedDemoProject } from "./seed";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://localhost:5432/filika";
const client = postgres(databaseUrl, { prepare: false });

await client.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
await client.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
await client.unsafe("CREATE SCHEMA public");

const handle = createDb(databaseUrl);
await migrate(handle.db, { migrationsFolder: "drizzle" });
await seedDemoProject(handle);
await handle.close();
await client.end();

console.log("Filika database reset: schema, migrations, and seed applied.");
