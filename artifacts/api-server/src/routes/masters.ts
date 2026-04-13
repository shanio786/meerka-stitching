import { Router, type IRouter } from "express";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db, mastersTable, masterAccountsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/masters", async (req, res): Promise<void> => {
  const { type, search, active } = req.query;
  const conditions = [];
  if (type && type !== "all") conditions.push(sql`${mastersTable.masterType} = ${String(type)}`);
  if (search) conditions.push(ilike(mastersTable.name, `%${search}%`));
  if (active === "true") conditions.push(eq(mastersTable.isActive, true));
  if (active === "false") conditions.push(eq(mastersTable.isActive, false));

  const masters = await db
    .select()
    .from(mastersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(mastersTable.name);

  res.json(masters);
});

router.post("/masters", async (req, res): Promise<void> => {
  const { name, phone, address, masterType, machineNo, defaultRate, notes } = req.body;
  if (!name || !masterType) {
    res.status(400).json({ error: "Name and master type are required" });
    return;
  }

  const [master] = await db.insert(mastersTable).values({
    name, phone, address, masterType, machineNo, defaultRate, notes,
  }).returning();

  await db.insert(masterAccountsTable).values({
    masterId: master.id, balance: 0, totalEarned: 0, totalPaid: 0,
  });

  res.status(201).json(master);
});

router.get("/masters/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [master] = await db.select().from(mastersTable).where(eq(mastersTable.id, id));
  if (!master) { res.status(404).json({ error: "Master not found" }); return; }

  const [account] = await db.select().from(masterAccountsTable).where(eq(masterAccountsTable.masterId, id));
  res.json({ ...master, account: account || null });
});

router.patch("/masters/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { name, phone, address, machineNo, defaultRate, isActive, notes } = req.body;
  const [master] = await db.update(mastersTable)
    .set({ name, phone, address, machineNo, defaultRate, isActive, notes })
    .where(eq(mastersTable.id, id))
    .returning();
  if (!master) { res.status(404).json({ error: "Master not found" }); return; }
  res.json(master);
});

router.delete("/masters/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [master] = await db.delete(mastersTable).where(eq(mastersTable.id, id)).returning();
  if (!master) { res.status(404).json({ error: "Master not found" }); return; }
  res.sendStatus(204);
});

export default router;
