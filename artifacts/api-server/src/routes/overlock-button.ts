import { Router, type IRouter } from "express";
import { eq, and, sql, ne } from "drizzle-orm";
import { db, overlockButtonEntriesTable, articlesTable, mastersTable, masterAccountsTable, masterTransactionsTable, stitchingAssignmentsTable } from "@workspace/db";

const router: IRouter = Router();

// Pending pool: pieces completed at Stitching but not yet received at Overlock/Button.
// Aggregated by article + component + size + stitching-master.
router.get("/overlock-button/pending-from-stitching", async (req, res): Promise<void> => {
  const { articleId } = req.query;
  const conditions = [eq(stitchingAssignmentsTable.status, "completed")];

  const stitched = await db
    .select({
      articleId: sql<number>`${articlesTable.id}`.as("article_id"),
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      componentName: stitchingAssignmentsTable.componentName,
      size: stitchingAssignmentsTable.size,
      masterId: stitchingAssignmentsTable.masterId,
      masterName: mastersTable.name,
      completed: sql<number>`COALESCE(SUM(${stitchingAssignmentsTable.piecesCompleted}), 0)`.as("completed"),
      lastDate: sql<string>`MAX(${stitchingAssignmentsTable.completedDate})`.as("last_date"),
    })
    .from(stitchingAssignmentsTable)
    .innerJoin(sql`stitching_jobs sj`, sql`sj.id = ${stitchingAssignmentsTable.jobId}`)
    .innerJoin(articlesTable, sql`${articlesTable.id} = sj.article_id`)
    .leftJoin(mastersTable, eq(mastersTable.id, stitchingAssignmentsTable.masterId))
    .where(and(...conditions, articleId ? sql`sj.article_id = ${Number(articleId)}` : sql`TRUE`))
    .groupBy(
      articlesTable.id, articlesTable.articleCode, articlesTable.articleName,
      stitchingAssignmentsTable.componentName, stitchingAssignmentsTable.size,
      stitchingAssignmentsTable.masterId, mastersTable.name,
    );

  // How much already received at overlock for each (article, component, size)
  const received = await db
    .select({
      articleId: overlockButtonEntriesTable.articleId,
      componentName: overlockButtonEntriesTable.componentName,
      size: overlockButtonEntriesTable.size,
      received: sql<number>`COALESCE(SUM(${overlockButtonEntriesTable.receivedQty}), 0)`.as("received"),
    })
    .from(overlockButtonEntriesTable)
    .where(ne(overlockButtonEntriesTable.status, "cancelled"))
    .groupBy(overlockButtonEntriesTable.articleId, overlockButtonEntriesTable.componentName, overlockButtonEntriesTable.size);

  // Distribute the "received" total across master rows for the same (article, component, size).
  // We allocate FIFO by lastDate so the oldest stitched batch is consumed first.
  const stitchedSorted = [...stitched].sort((a, b) => (a.lastDate || "").localeCompare(b.lastDate || ""));
  const consumedBucket = new Map<string, number>();
  const result = stitchedSorted.map((s) => {
    const key = `${s.articleId}|${s.componentName || ""}|${s.size || ""}`;
    const totalReceived = Number(received.find((r) => r.articleId === s.articleId && (r.componentName || "") === (s.componentName || "") && (r.size || "") === (s.size || ""))?.received ?? 0);
    const alreadyConsumed = consumedBucket.get(key) ?? 0;
    const remaining = Math.max(0, totalReceived - alreadyConsumed);
    const completed = Number(s.completed);
    const consumeFromThis = Math.min(completed, remaining);
    consumedBucket.set(key, alreadyConsumed + consumeFromThis);
    const available = completed - consumeFromThis;
    return { ...s, completed, available };
  }).filter((r) => r.available > 0);

  res.json(result);
});

router.get("/overlock-button", async (req, res): Promise<void> => {
  const { articleId, taskType, status } = req.query;
  const conditions = [];
  if (articleId) conditions.push(eq(overlockButtonEntriesTable.articleId, Number(articleId)));
  if (taskType && taskType !== "all") conditions.push(eq(overlockButtonEntriesTable.taskType, taskType as string));
  if (status && status !== "all") conditions.push(sql`${overlockButtonEntriesTable.status} = ${String(status)}`);

  const entries = await db
    .select({
      id: overlockButtonEntriesTable.id,
      articleId: overlockButtonEntriesTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      taskType: overlockButtonEntriesTable.taskType,
      masterId: overlockButtonEntriesTable.masterId,
      masterName: mastersTable.name,
      componentName: overlockButtonEntriesTable.componentName,
      size: overlockButtonEntriesTable.size,
      receivedFrom: overlockButtonEntriesTable.receivedFrom,
      receivedQty: overlockButtonEntriesTable.receivedQty,
      completedQty: overlockButtonEntriesTable.completedQty,
      wasteQty: overlockButtonEntriesTable.wasteQty,
      wasteReason: overlockButtonEntriesTable.wasteReason,
      ratePerPiece: overlockButtonEntriesTable.ratePerPiece,
      totalAmount: overlockButtonEntriesTable.totalAmount,
      status: overlockButtonEntriesTable.status,
      receivedBy: overlockButtonEntriesTable.receivedBy,
      notes: overlockButtonEntriesTable.notes,
      date: overlockButtonEntriesTable.date,
      completedDate: overlockButtonEntriesTable.completedDate,
      createdAt: overlockButtonEntriesTable.createdAt,
    })
    .from(overlockButtonEntriesTable)
    .leftJoin(articlesTable, eq(overlockButtonEntriesTable.articleId, articlesTable.id))
    .leftJoin(mastersTable, eq(overlockButtonEntriesTable.masterId, mastersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${overlockButtonEntriesTable.date} DESC`);

  res.json(entries);
});

router.post("/overlock-button", async (req, res): Promise<void> => {
  const { articleId, taskType, masterId, componentName, size, receivedFrom, receivedQty, ratePerPiece, receivedBy, notes, date } = req.body;
  if (!articleId || !taskType || !masterId || !receivedQty || !date) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [entry] = await db.insert(overlockButtonEntriesTable).values({
    articleId, taskType, masterId: masterId || null, componentName, size, receivedFrom, receivedQty,
    ratePerPiece, receivedBy, notes, date: new Date(date),
  }).returning();
  res.status(201).json(entry);
});

router.patch("/overlock-button/:id/complete", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { completedQty, wasteQty, wasteReason } = req.body;

  const [existing] = await db.select().from(overlockButtonEntriesTable).where(eq(overlockButtonEntriesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Entry not found" }); return; }
  if (existing.status === "completed") { res.status(400).json({ error: "Entry already completed" }); return; }

  const totalAmount = (completedQty || 0) * (existing.ratePerPiece || 0);

  const result = await db.transaction(async (tx) => {
    const [entry] = await tx.update(overlockButtonEntriesTable).set({
      status: "completed", completedQty, wasteQty, wasteReason, totalAmount, completedDate: new Date(),
    }).where(eq(overlockButtonEntriesTable.id, id)).returning();

    if (totalAmount > 0) {
      await tx.insert(masterTransactionsTable).values({
        masterId: existing.masterId, type: "earning", amount: totalAmount,
        referenceType: "overlock_button", referenceId: id,
        description: `${existing.taskType} - ${completedQty} pieces`,
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

router.delete("/overlock-button/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [entry] = await db.delete(overlockButtonEntriesTable).where(eq(overlockButtonEntriesTable.id, id)).returning();
  if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }
  res.sendStatus(204);
});

export default router;
