import { beforeAll, describe, expect, it } from "vitest";
import { asSuperuser, asUser, createDb, seed, type Db, type Fixture } from "./helpers/db";

let db: Db;
let f: Fixture;
let ticketId: string;

beforeAll(async () => {
  db = await createDb();
  f = await seed(db);
  await asUser(db, f.cashierA);
  const r = await db.query<{ id: string }>("select * from public.create_ticket($1, 'P', 1, 0)", [f.serviceA]);
  ticketId = r.rows[0].id;
});

describe("droits par rôle", () => {
  it("le caissier ne peut pas fixer un total, ni modifier services ni structure", async () => {
    await asUser(db, f.cashierA);
    await expect(db.query("select public.set_ticket_total($1, 100)", [ticketId])).rejects.toThrow();
    await expect(
      db.query("insert into public.services (structure_id, name, price) values ($1, 'X', 1)", [f.structA]),
    ).rejects.toThrow();
    await db.query("update public.services set price = 1 where id = $1", [f.serviceA]);
    await db.query("update public.structures set name = 'Pirate' where id = $1", [f.structA]);
    await asSuperuser(db);
    expect((await db.query<{ price: number }>("select price from public.services where id = $1", [f.serviceA])).rows[0].price).toBe(5000);
    expect((await db.query<{ name: string }>("select name from public.structures where id = $1", [f.structA])).rows[0].name).toBe("Clinique A");
  });

  it("le caissier ne voit pas l'audit", async () => {
    await asUser(db, f.cashierA);
    expect((await db.query("select * from public.audit_log")).rows).toHaveLength(0);
  });

  it("l'admin de structure peut fixer un total", async () => {
    await asUser(db, f.adminA);
    await db.query("select public.set_ticket_total($1, 4000)", [ticketId]);
    const r = await db.query<{ total: number }>("select total from public.tickets where id = $1", [ticketId]);
    expect(r.rows[0].total).toBe(4000);
  });

  it("seul platform_admin active/désactive une structure", async () => {
    await asUser(db, f.adminA);
    await expect(db.query("select public.set_structure_active($1, false)", [f.structB])).rejects.toThrow();
    await asUser(db, f.platform);
    await db.query("select public.set_structure_active($1, false)", [f.structB]);
    await db.query("select public.set_structure_active($1, true)", [f.structB]);
  });

  it("une structure désactivée est refusée (échec fermé)", async () => {
    await asUser(db, f.platform);
    await db.query("select public.set_structure_active($1, false)", [f.structA]);
    await asUser(db, f.cashierA);
    expect((await db.query("select * from public.tickets")).rows).toHaveLength(0);
    await expect(db.query("select * from public.create_ticket($1, 'X', 1, 0)", [f.serviceA])).rejects.toThrow();
    await asUser(db, f.platform);
    await db.query("select public.set_structure_active($1, true)", [f.structA]);
  });

  it("un profil désactivé est refusé", async () => {
    await asSuperuser(db);
    await db.query("update public.profiles set active = false where id = $1", [f.cashierA]);
    await asUser(db, f.cashierA);
    await expect(db.query("select * from public.create_ticket($1, 'X', 1, 0)", [f.serviceA])).rejects.toThrow();
    await asSuperuser(db);
    await db.query("update public.profiles set active = true where id = $1", [f.cashierA]);
  });

  it("un utilisateur ne peut pas s'auto-promouvoir", async () => {
    await asUser(db, f.cashierA);
    await expect(db.query("update public.profiles set role = 'platform_admin' where id = $1", [f.cashierA])).rejects.toThrow();
  });
});
