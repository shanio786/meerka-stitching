import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, finishingEntriesTable, articlesTable, mastersTable, masterAccountsTable, masterTransactionsTable, qcEntriesTable } from "@workspace/db";

const router: IRouter = Router();

// Pending pool for Finishing: pieces passed at QC minus already received at Finishing.
router.get("/finishing/pending-from-qc", async (req, res): Promise<void> => {
  const { articleId } = req.query;
  const passed = await db
    .select({
      articleId: qcEntriesTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      componentName: qcEntriesTable.componentName,
      size: qcEntriesTable.size,
      inspectorName: qcEntriesTable.inspectorName,
      passed: sql<number>`COALESCE(SUM(${qcEntriesTable.passedQty}), 0)`.as("passed"),
      lastDate: sql<string>`MAX(${qcEntriesTable.date})`.as("last_date"),
    })
    .from(qcEntriesTable)
    .leftJoin(articlesTable, eq(articlesTable.id, qcEntriesTable.articleId))
    .where(articleId ? eq(qcEntriesTable.articleId, Number(articleId)) : sql`TRUE`)
    .groupBy(
      qcEntriesTable.articleId, articlesTable.articleCode, articlesTable.articleName,
      qcEntriesTable.componentName, qcEntriesTable.size, qcEntriesTable.inspectorName,
    );

  const received = await db
    .select({
      articleId: finishingEntriesTable.articleId,
      componentName: finishingEntriesTable.componentName,
      size: finishingEntriesTable.size,
      received: sql<number>`COALESCE(SUM(${finishingEntriesTable.receivedQty}), 0)`.as("received"),
    })
    .from(finishingEntriesTable)
    .groupBy(finishingEntriesTable.articleId, finishingEntriesTable.componentName, finishingEntriesTable.size);

  const sorted = [...passed].sort((a, b) => (a.lastDate || "").localeCompare(b.lastDate || ""));
  const consumedBucket = new Map<string, number>();
  const result = sorted.map((p) => {
    const key = `${p.articleId}|${p.componentName || ""}|${p.size || ""}`;
    const totalReceived = Number(received.find((r) => r.articleId === p.articleId && (r.componentName || "") === (p.componentName || "") && (r.size || "") === (p.size || ""))?.received ?? 0);
    const alreadyConsumed = consumedBucket.get(key) ?? 0;
    const remaining = Math.max(0, totalReceived - alreadyConsumed);
    const passedQty = Number(p.passed);
    const consumeFromThis = Math.min(passedQty, remaining);
    consumedBucket.set(key, alreadyConsumed + consumeFromThis);
    const available = passedQty - consumeFromThis;
    return { ...p, passed: passedQty, available };
  }).filter((r) => r.available > 0);

  res.json(result);
});

router.get("/finishing", async (req, res): Promise<void> => {
  const { articleId, status } = req.query;
  const conditions = [];
  if (articleId) conditions.push(eq(finishingEntriesTable.articleId, Number(articleId)));
  if (status && status !== "all") conditions.push(sql`${finishingEntriesTable.status} = ${String(status)}`);

  const entries = await db
    .select({
      id: finishingEntriesTable.id,
      articleId: finishingEntriesTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      masterId: finishingEntriesTable.masterId,
      masterName: mastersTable.name,
      workerName: finishingEntriesTable.workerName,
      componentName: finishingEntriesTable.componentName,
      size: finishingEntriesTable.size,
      receivedFrom: finishingEntriesTable.receivedFrom,
      receivedQty: finishingEntriesTable.receivedQty,
      packedQty: finishingEntriesTable.packedQty,
      wasteQty: finishingEntriesTable.wasteQty,
      wasteReason: finishingEntriesTable.wasteReason,
      ratePerPiece: finishingEntriesTable.ratePerPiece,
      totalAmount: finishingEntriesTable.totalAmount,
      status: finishingEntriesTable.status,
      receivedBy: finishingEntriesTable.receivedBy,
      notes: finishingEntriesTable.notes,
      date: finishingEntriesTable.date,
      completedDate: finishingEntriesTable.completedDate,
      createdAt: finishingEntriesTable.createdAt,
    })
    .from(finishingEntriesTable)
    .leftJoin(articlesTable, eq(finishingEntriesTable.articleId, articlesTable.id))
    .leftJoin(mastersTable, eq(finishingEntriesTable.masterId, mastersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${finishingEntriesTable.date} DESC`);

  res.json(entries);
});

router.post("/finishing", async (req, res): Promise<void> => {
  const { articleId, masterId, workerName, componentName, size, receivedFrom, receivedQty, ratePerPiece, receivedBy, notes, date } = req.body;
  if (!articleId || !workerName || !receivedQty || !date) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [entry] = await db.insert(finishingEntriesTable).values({
    articleId, masterId, workerName, componentName, size, receivedFrom, receivedQty, ratePerPiece, receivedBy, notes, date: new Date(date),
  }).returning();
  res.status(201).json(entry);
});

router.patch("/finishing/:id/complete", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { packedQty, wasteQty, wasteReason } = req.body;

  const [existing] = await db.select().from(finishingEntriesTable).where(eq(finishingEntriesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }
  if (existing.status === "completed") { res.status(400).json({ error: "Entry already completed" }); return; }

  const totalAmount = (packedQty || 0) * (existing.ratePerPiece || 0);

  const result = await db.transaction(async (tx) => {
    const [entry] = await tx.update(finishingEntriesTable).set({
      status: "completed", packedQty, wasteQty, wasteReason, totalAmount, completedDate: new Date(),
    }).where(eq(finishingEntriesTable.id, id)).returning();

    if (totalAmount > 0 && existing.masterId) {
      await tx.insert(masterTransactionsTable).values({
        masterId: existing.masterId, type: "earning", amount: totalAmount,
        referenceType: "finishing", referenceId: id,
        description: `Finishing - ${packedQty} pieces packed`,
      });
      await tx.update(masterAccountsTable).set({
        balance: sql`${masterAccountsTable.balance} + ${totalAmount}`,
        totalEarned: sql`${masterAccountsTable.totalEarned} + ${totalAmount}`,
      }).where(eq(masterAccountsTable.masterId, existing.masterId));
    }
    return entry;
  });

  res.json(result);
});

router.delete("/finishing/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [entry] = await db.delete(finishingEntriesTable).where(eq(finishingEntriesTable.id, id)).returning();
  if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }
  res.sendStatus(204);
});

export default router;
