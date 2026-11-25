import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Db = PGlite;

const BOOTSTRAP = `
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(
      coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'sub', ''
    )::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

export async function createDb(extraMigrations: string[] = []): Promise<Db> {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  const sql = readFileSync(
    join(process.cwd(), "supabase", "migrations", "0001_init.sql"),
    "utf8",
  );
  await db.exec(sql);
  for (const file of extraMigrations) {
    const extra = readFileSync(
      join(process.cwd(), "supabase", "migrations", file),
      "utf8",
    );
    await db.exec(extra);
  }
  return db;
}

export async function asSuperuser(db: Db) {
  await db.exec("reset role; select set_config('request.jwt.claims', '', false);");
}

export async function asUser(db: Db, userId: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [
    JSON.stringify({ sub: userId, role: "authenticated" }),
  ]);
  await db.exec("set role authenticated");
}

export async function asAnon(db: Db) {
  await db.exec("reset role; select set_config('request.jwt.claims', '', false);");
  await db.exec("set role anon");
}

export type Role = "platform_admin" | "structure_admin" | "cashier";

export interface Fixture {
  structA: string;
  structB: string;
  platform: string;
  adminA: string;
  cashierA: string;
  adminB: string;
  cashierB: string;
  serviceA: string;
  serviceB: string;
}

let counter = 0;
function uuid(): string {
  counter += 1;
  return `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
}

/** Seeds two structures with users and one service each (as superuser). */
export async function seed(db: Db): Promise<Fixture> {
  await asSuperuser(db);
  const f: Fixture = {
    structA: uuid(),
    structB: uuid(),
    platform: uuid(),
    adminA: uuid(),
    cashierA: uuid(),
    adminB: uuid(),
    cashierB: uuid(),
    serviceA: uuid(),
    serviceB: uuid(),
  };
  for (const [id, name] of [
    [f.structA, "Clinique A"],
    [f.structB, "Clinique B"],
  ]) {
    await db.query("insert into public.structures (id, name) values ($1, $2)", [id, name]);
  }
  const users: [string, string | null, Role][] = [
    [f.platform, null, "platform_admin"],
    [f.adminA, f.structA, "structure_admin"],
    [f.cashierA, f.structA, "cashier"],
    [f.adminB, f.structB, "structure_admin"],
    [f.cashierB, f.structB, "cashier"],
  ];
  for (const [id, structureId, role] of users) {
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@t.sn`]);
    await db.query(
      "insert into public.profiles (id, structure_id, role) values ($1, $2, $3)",
      [id, structureId, role],
    );
  }
  await db.query(
    "insert into public.services (id, structure_id, name, price) values ($1, $2, 'Consultation', 5000), ($3, $4, 'Consultation', 7000)",
    [f.serviceA, f.structA, f.serviceB, f.structB],
  );
  return f;
}
