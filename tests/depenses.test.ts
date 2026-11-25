import { beforeAll, describe, expect, it } from "vitest";
import { asAnon, asUser, createDb, seed, type Db, type Fixture } from "./helpers/db";

let db: Db;
let f: Fixture;

async function insertDepense(user: string, structureId: string, montant = 5000) {
  await asUser(db, user);
  const r = await db.query<{ id: string }>(
    `insert into public.depenses (structure_id, libelle, categorie, montant)
     values ($1, 'Achat de gants', 'Fournitures', $2) returning id`,
    [structureId, montant],
  );
  return r.rows[0].id;
}

beforeAll(async () => {
  db = await createDb(["0022_depenses.sql"]);
  f = await seed(db);
});

describe("module dépenses", () => {
  it("un caissier peut créer une dépense pour sa structure", async () => {
    const id = await insertDepense(f.cashierA, f.structA, 7500);
    await asUser(db, f.cashierA);
    const r = await db.query<{ montant: number }>(
      "select montant from public.depenses where id = $1",
      [id],
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].montant).toBe(7500);
  });

  it("isole les dépenses entre structures", async () => {
    const idA = await insertDepense(f.cashierA, f.structA);
    await insertDepense(f.cashierB, f.structB);

    await asUser(db, f.adminB);
    const cross = await db.query("select id from public.depenses where id = $1", [idA]);
    expect(cross.rows).toHaveLength(0);

    await asUser(db, f.adminA);
    const own = await db.query("select id from public.depenses where id = $1", [idA]);
    expect(own.rows).toHaveLength(1);
  });

  it("refuse une insertion dans une autre structure", async () => {
    await asUser(db, f.cashierB);
    await expect(
      db.query(
        `insert into public.depenses (structure_id, libelle, categorie, montant)
         values ($1, 'Intrusion', 'Autre', 1000)`,
        [f.structA],
      ),
    ).rejects.toThrow();
  });

  it("annule avec motif et interdit la réactivation", async () => {
    const id = await insertDepense(f.adminA, f.structA, 2000);
    await asUser(db, f.adminA);
    await db.query(
      "update public.depenses set status = 'annule', cancel_reason = 'Erreur de saisie' where id = $1",
      [id],
    );
    const r = await db.query<{ status: string }>(
      "select status from public.depenses where id = $1",
      [id],
    );
    expect(r.rows[0].status).toBe("annule");

    await expect(
      db.query("update public.depenses set status = 'actif', cancel_reason = null where id = $1", [id]),
    ).rejects.toThrow();
  });

  it("un utilisateur anonyme ne voit rien", async () => {
    await asAnon(db);
    await expect(db.query("select id from public.depenses")).rejects.toThrow();
  });
});
