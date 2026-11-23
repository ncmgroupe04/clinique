import { beforeAll, describe, expect, it } from "vitest";
import { asAnon, asSuperuser, asUser, createDb, seed, type Db, type Fixture } from "./helpers/db";

let db: Db;
let f: Fixture;
let ticketA: string;
let ticketB: string;

async function createTicket(user: string, service: string, qty = 1, advance = 0) {
  await asUser(db, user);
  const r = await db.query<{ id: string }>("select * from public.create_ticket($1, 'Patient', $2, $3)", [
    service,
    qty,
    advance,
  ]);
  return r.rows[0].id;
}

beforeAll(async () => {
  db = await createDb();
  f = await seed(db);
  ticketA = await createTicket(f.cashierA, f.serviceA);
  ticketB = await createTicket(f.cashierB, f.serviceB);
});

describe("isolation multi-structure", () => {
  it("un caissier ne voit que les tickets de sa structure", async () => {
    await asUser(db, f.cashierA);
    const r = await db.query<{ id: string }>("select id from public.tickets");
    expect(r.rows.map((x) => x.id)).toEqual([ticketA]);
  });

  it("un admin de structure ne voit pas les tickets d'une autre", async () => {
    await asUser(db, f.adminA);
    const r = await db.query("select id from public.tickets where id = $1", [ticketB]);
    expect(r.rows).toHaveLength(0);
  });

  it("services, profils, structures et audit sont cloisonnés", async () => {
    await asUser(db, f.adminA);
    expect((await db.query("select id from public.services where structure_id = $1", [f.structB])).rows).toHaveLength(0);
    expect((await db.query("select id from public.profiles where structure_id = $1", [f.structB])).rows).toHaveLength(0);
    expect((await db.query("select id from public.structures where id = $1", [f.structB])).rows).toHaveLength(0);
    expect((await db.query("select id from public.audit_log where structure_id = $1", [f.structB])).rows).toHaveLength(0);
  });

  it("impossible d'utiliser le service d'une autre structure", async () => {
    await asUser(db, f.cashierA);
    await expect(db.query("select * from public.create_ticket($1, 'X', 1, 0)", [f.serviceB])).rejects.toThrow();
  });

  it("impossible d'annuler, imprimer ou modifier le ticket d'une autre structure", async () => {
    await asUser(db, f.adminA);
    await expect(db.query("select public.cancel_ticket($1, 'motif test')", [ticketB])).rejects.toThrow();
    await expect(db.query("select public.register_print($1)", [ticketB])).rejects.toThrow();
    await expect(db.query("select public.set_ticket_total($1, 100)", [ticketB])).rejects.toThrow();
  });

  it("impossible d'insérer un service dans une autre structure", async () => {
    await asUser(db, f.adminA);
    await expect(
      db.query("insert into public.services (structure_id, name, price) values ($1, 'Pirate', 1)", [f.structB]),
    ).rejects.toThrow();
  });

  it("impossible de modifier un service d'une autre structure", async () => {
    await asUser(db, f.adminA);
    await db.query("update public.services set price = 1 where id = $1", [f.serviceB]);
    await asSuperuser(db);
    const r = await db.query<{ price: number }>("select price from public.services where id = $1", [f.serviceB]);
    expect(r.rows[0].price).toBe(7000);
  });

  it("anon n'a accès à rien", async () => {
    await asAnon(db);
    await expect(db.query("select * from public.tickets")).rejects.toThrow();
    await expect(db.query("select * from public.services")).rejects.toThrow();
    await expect(db.query("select * from public.create_ticket($1, 'X', 1, 0)", [f.serviceA])).rejects.toThrow();
  });

  it("ticket_counters est inaccessible aux clients", async () => {
    await asUser(db, f.adminA);
    await expect(db.query("select * from public.ticket_counters")).rejects.toThrow();
  });
});
