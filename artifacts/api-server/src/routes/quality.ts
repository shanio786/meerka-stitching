import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, qcEntriesTable, articlesTable, mastersTable, overlockButtonEntriesTable } from "@workspace/db";

const router: IRouter = Router();

// Pending pool for QC: pieces completed at Overlock/Button minus already received at QC.
router.get("/qc/pending-from-overlock", async (req, res): Promise<void> => {
  const { articleId } = req.query;
  const completed = await db
    .select({
      articleId: overlockButtonEntriesTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      componentName: overlockButtonEntriesTable.componentName,
      size: overlockButtonEntriesTable.size,
      taskType: overlockButtonEntriesTable.taskType,
      masterId: overlockButtonEntriesTable.masterId,
      masterName: mastersTable.name,
      completed: sql<number>`COALESCE(SUM(${overlockButtonEntriesTable.completedQty}), 0)`.as("completed"),
      lastDate: sql<string>`MAX(${overlockButtonEntriesTable.completedDate})`.as("last_date"),
    })
    .from(overlockButtonEntriesTable)
    .leftJoin(articlesTable, eq(articlesTable.id, overlockButtonEntriesTable.articleId))
    .leftJoin(mastersTable, eq(mastersTable.id, overlockButtonEntriesTable.masterId))
    .where(and(
      eq(overlockButtonEntriesTable.status, "completed"),
      articleId ? eq(overlockButtonEntriesTable.articleId, Number(articleId)) : sql`TRUE`,
    ))
    .groupBy(
      overlockButtonEntriesTable.articleId, articlesTable.articleCode, articlesTable.articleName,
      overlockButtonEntriesTable.componentName, overlockButtonEntriesTable.size,
      overlockButtonEntriesTable.taskType, overlockButtonEntriesTable.masterId, mastersTable.name,
    );

  const received = await db
    .select({
      articleId: qcEntriesTable.articleId,
      componentName: qcEntriesTable.componentName,
      size: qcEntriesTable.size,
      received: sql<number>`COALESCE(SUM(${qcEntriesTable.receivedQty}), 0)`.as("received"),
    })
    .from(qcEntriesTable)
    .groupBy(qcEntriesTable.articleId, qcEntriesTable.componentName, qcEntriesTable.size);

  // FIFO allocation across master rows for the same (article, component, size).
  const sorted = [...completed].sort((a, b) => (a.lastDate || "").localeCompare(b.lastDate || ""));
  const consumedBucket = new Map<string, number>();
  const result = sorted.map((c) => {
    const key = `${c.articleId}|${c.componentName || ""}|${c.size || ""}`;
    const totalReceived = Number(received.find((r) => r.articleId === c.articleId && (r.componentName || "") === (c.componentName || "") && (r.size || "") === (c.size || ""))?.received ?? 0);
    const alreadyConsumed = consumedBucket.get(key) ?? 0;
    const remaining = Math.max(0, totalReceived - alreadyConsumed);
    const completedQty = Number(c.completed);
    const consumeFromThis = Math.min(completedQty, remaining);
    consumedBucket.set(key, alreadyConsumed + consumeFromThis);
    const available = completedQty - consumeFromThis;
    return { ...c, completed: completedQty, available };
  }).filter((r) => r.available > 0);

  res.json(result);
});

router.get("/qc", async (req, res): Promise<void> => {
  const { articleId } = req.query;
  const conditions = [];
  if (articleId) conditions.push(eq(qcEntriesTable.articleId, Number(articleId)));

  const entries = await db
    .select({
      id: qcEntriesTable.id,
      articleId: qcEntriesTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      stitchingJobId: qcEntriesTable.stitchingJobId,
      inspectorName: qcEntriesTable.inspectorName,
      masterId: qcEntriesTable.masterId,
      masterName: mastersTable.name,
      componentName: qcEntriesTable.componentName,
      size: qcEntriesTable.size,
      receivedFrom: qcEntriesTable.receivedFrom,
      receivedQty: qcEntriesTable.receivedQty,
      passedQty: qcEntriesTable.passedQty,
      rejectedQty: qcEntriesTable.rejectedQty,
      rejectionReason: qcEntriesTable.rejectionReason,
      notes: qcEntriesTable.notes,
      date: qcEntriesTable.date,
      createdAt: qcEntriesTable.createdAt,
    })
    .from(qcEntriesTable)
    .leftJoin(articlesTable, eq(qcEntriesTable.articleId, articlesTable.id))
    .leftJoin(mastersTable, eq(qcEntriesTable.masterId, mastersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${qcEntriesTable.date} DESC`);

  res.json(entries);
});

router.post("/qc", async (req, res): Promise<void> => {
  const { articleId, stitchingJobId, inspectorName, masterId, componentName, size, receivedFrom, receivedQty, passedQty, rejectedQty, rejectionReason, notes, date } = req.body;
  if (!articleId || !inspectorName || !receivedQty || !date) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [entry] = await db.insert(qcEntriesTable).values({
    articleId, stitchingJobId, inspectorName, masterId, componentName, size, receivedFrom,
    receivedQty, passedQty: passedQty || 0, rejectedQty: rejectedQty || 0,
    rejectionReason, notes, date: new Date(date),
  }).returning();
  res.status(201).json(entry);
});

router.delete("/qc/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [entry] = await db.delete(qcEntriesTable).where(eq(qcEntriesTable.id, id)).returning();
  if (!entry) { res.status(404).json({ error: "QC entry not found" }); return; }
  res.sendStatus(204);
});

export default router;
