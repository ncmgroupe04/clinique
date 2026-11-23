import { beforeAll, describe, expect, it } from "vitest";
import { asSuperuser, asUser, createDb, seed, type Db, type Fixture } from "./helpers/db";

let db: Db;
let f: Fixture;

interface Ticket {
  id: string;
  year: number;
  number: number;
  unit_price: number;
  quantity: number;
  total: number;
  advance: number;
  remaining: number;
  status: string;
}

async function create(user: string, service: string, qty = 1, advance = 0): Promise<Ticket> {
  await asUser(db, user);
  const r = await db.query<Ticket>("select * from public.create_ticket($1, 'Patient', $2, $3)", [
    service,
    qty,
    advance,
  ]);
  return r.rows[0];
}

beforeAll(async () => {
  db = await createDb();
  f = await seed(db);
});

describe("numérotation des reçus", () => {
  it("est séquentielle, sans trou, par structure", async () => {
    const a1 = await create(f.cashierA, f.serviceA);
    const a2 = await create(f.cashierA, f.serviceA);
    const b1 = await create(f.cashierB, f.serviceB);
    expect([a1.number, a2.number]).toEqual([1, 2]);
    expect(b1.number).toBe(1);
    expect(a1.year).toBe(new Date().getUTCFullYear());
  });

  it("une erreur ne consomme pas de numéro", async () => {
    const before = await create(f.cashierA, f.serviceA);
    await asUser(db, f.cashierA);
    await expect(db.query("select * from public.create_ticket($1, 'X', 1, 999999)", [f.serviceA])).rejects.toThrow();
    const after = await create(f.cashierA, f.serviceA);
    expect(after.number).toBe(before.number + 1);
  });

  it("le doublon (structure, année, numéro) est impossible", async () => {
    await asSuperuser(db);
    await expect(
      db.query(
        `insert into public.tickets (structure_id, year, number, service_name, unit_price, quantity, total, advance, created_by)
         select structure_id, year, number, service_name, unit_price, quantity, total, advance, created_by
         from public.tickets limit 1`,
      ),
    ).rejects.toThrow();
  });
});

describe("argent", () => {
  it("copie le prix et calcule total et reste en base", async () => {
    const t = await create(f.cashierA, f.serviceA, 3, 4000);
    expect(t.unit_price).toBe(5000);
    expect(t.total).toBe(15000);
    expect(t.remaining).toBe(11000);
  });

  it("changer le tarif ne modifie pas les anciens tickets", async () => {
    const t = await create(f.cashierA, f.serviceA, 1, 0);
    await asUser(db, f.adminA);
    await db.query("update public.services set price = 9999 where id = $1", [f.serviceA]);
    await asSuperuser(db);
    const r = await db.query<{ unit_price: number }>("select unit_price from public.tickets where id = $1", [t.id]);
    expect(r.rows[0].unit_price).toBe(5000);
    const t2 = await create(f.cashierA, f.serviceA);
    expect(t2.unit_price).toBe(9999);
  });

  it("refuse avance négative, avance > total, quantité hors bornes", async () => {
    await asUser(db, f.cashierA);
    await expect(db.query("select * from public.create_ticket($1, 'X', 1, -1)", [f.serviceA])).rejects.toThrow();
    await expect(db.query("select * from public.create_ticket($1, 'X', 1, 99999999)", [f.serviceA])).rejects.toThrow();
    await expect(db.query("select * from public.create_ticket($1, 'X', 0, 0)", [f.serviceA])).rejects.toThrow();
    await expect(db.query("select * from public.create_ticket($1, 'X', 101, 0)", [f.serviceA])).rejects.toThrow();
  });
});

describe("pas de suppression, annulation tracée", () => {
  it("DELETE sur tickets est bloqué, même en superutilisateur", async () => {
    const t = await create(f.cashierA, f.serviceA);
    await asUser(db, f.adminA);
    await expect(db.query("delete from public.tickets where id = $1", [t.id])).rejects.toThrow();
    await asSuperuser(db);
    await expect(db.query("delete from public.tickets where id = $1", [t.id])).rejects.toThrow();
  });

  it("l'annulation exige un motif et est définitive", async () => {
    const t = await create(f.cashierA, f.serviceA);
    await asUser(db, f.cashierA);
    await expect(db.query("select public.cancel_ticket($1, '')", [t.id])).rejects.toThrow();
    await db.query("select public.cancel_ticket($1, 'erreur de saisie')", [t.id]);
    await asSuperuser(db);
    const r = await db.query<{ status: string; cancel_reason: string }>(
      "select status, cancel_reason from public.tickets where id = $1",
      [t.id],
    );
    expect(r.rows[0]).toEqual({ status: "annule", cancel_reason: "erreur de saisie" });
    await expect(db.query("update public.tickets set status = 'actif' where id = $1", [t.id])).rejects.toThrow();
  });

  it("un client ne peut pas modifier un ticket directement", async () => {
    const t = await create(f.cashierA, f.serviceA);
    await asUser(db, f.adminA);
    await expect(db.query("update public.tickets set total = 1 where id = $1", [t.id])).rejects.toThrow();
    await expect(db.query("update public.tickets set number = 999 where id = $1", [t.id])).rejects.toThrow();
  });
});

describe("journal d'audit", () => {
  it("est immuable", async () => {
    await create(f.cashierA, f.serviceA);
    await asSuperuser(db);
    await expect(db.query("update public.audit_log set action = 'x'")).rejects.toThrow();
    await expect(db.query("delete from public.audit_log")).rejects.toThrow();
  });
});
