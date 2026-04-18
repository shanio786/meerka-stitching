import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, finalStoreReceiptsTable, articlesTable, finishingEntriesTable } from "@workspace/db";

const router: IRouter = Router();

// Pending pool for Final Store: pieces packed at Finishing minus already received at Final Store.
// Aggregated by article + size (final store doesn't track component).
router.get("/final-store/pending-from-finishing", async (req, res): Promise<void> => {
  const { articleId } = req.query;
  const packed = await db
    .select({
      articleId: finishingEntriesTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      size: finishingEntriesTable.size,
      workerName: finishingEntriesTable.workerName,
      packed: sql<number>`COALESCE(SUM(${finishingEntriesTable.packedQty}), 0)`.as("packed"),
      lastDate: sql<string>`MAX(${finishingEntriesTable.completedDate})`.as("last_date"),
    })
    .from(finishingEntriesTable)
    .leftJoin(articlesTable, eq(articlesTable.id, finishingEntriesTable.articleId))
    .where(and(
      eq(finishingEntriesTable.status, "completed"),
      articleId ? eq(finishingEntriesTable.articleId, Number(articleId)) : sql`TRUE`,
    ))
    .groupBy(
      finishingEntriesTable.articleId, articlesTable.articleCode, articlesTable.articleName,
      finishingEntriesTable.size, finishingEntriesTable.workerName,
    );

  const received = await db
    .select({
      articleId: finalStoreReceiptsTable.articleId,
      size: finalStoreReceiptsTable.size,
      received: sql<number>`COALESCE(SUM(${finalStoreReceiptsTable.packedQty}), 0)`.as("received"),
    })
    .from(finalStoreReceiptsTable)
    .groupBy(finalStoreReceiptsTable.articleId, finalStoreReceiptsTable.size);

  const sorted = [...packed].sort((a, b) => (a.lastDate || "").localeCompare(b.lastDate || ""));
  const consumedBucket = new Map<string, number>();
  const result = sorted.map((p) => {
    const key = `${p.articleId}|${p.size || ""}`;
    const totalReceived = Number(received.find((r) => r.articleId === p.articleId && (r.size || "") === (p.size || ""))?.received ?? 0);
    const alreadyConsumed = consumedBucket.get(key) ?? 0;
    const remaining = Math.max(0, totalReceived - alreadyConsumed);
    const packedQty = Number(p.packed);
    const consumeFromThis = Math.min(packedQty, remaining);
    consumedBucket.set(key, alreadyConsumed + consumeFromThis);
    const available = packedQty - consumeFromThis;
    return { ...p, packed: packedQty, available };
  }).filter((r) => r.available > 0);

  res.json(result);
});

router.get("/final-store", async (req, res): Promise<void> => {
  const { articleId } = req.query;
  const conditions = [];
  if (articleId) conditions.push(eq(finalStoreReceiptsTable.articleId, Number(articleId)));

  const entries = await db
    .select({
      id: finalStoreReceiptsTable.id,
      articleId: finalStoreReceiptsTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      receivedBy: finalStoreReceiptsTable.receivedBy,
      receivedFrom: finalStoreReceiptsTable.receivedFrom,
      size: finalStoreReceiptsTable.size,
      packedQty: finalStoreReceiptsTable.packedQty,
      notes: finalStoreReceiptsTable.notes,
      date: finalStoreReceiptsTable.date,
      createdAt: finalStoreReceiptsTable.createdAt,
    })
    .from(finalStoreReceiptsTable)
    .leftJoin(articlesTable, eq(finalStoreReceiptsTable.articleId, articlesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${finalStoreReceiptsTable.date} DESC`);

  res.json(entries);
});

router.post("/final-store", async (req, res): Promise<void> => {
  const { articleId, receivedBy, receivedFrom, size, packedQty, notes, date } = req.body;
  if (!articleId || !receivedBy || !receivedFrom || !packedQty || !date) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [entry] = await db.insert(finalStoreReceiptsTable).values({
    articleId, receivedBy, receivedFrom, size, packedQty, notes, date: new Date(date),
  }).returning();
  res.status(201).json(entry);
});

router.delete("/final-store/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [entry] = await db.delete(finalStoreReceiptsTable).where(eq(finalStoreReceiptsTable.id, id)).returning();
  if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }
  res.sendStatus(204);
});

export default router;
