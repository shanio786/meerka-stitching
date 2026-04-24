import { Router, type IRouter } from "express";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db, qcEntriesTable, qcReworksTable, articlesTable, mastersTable, overlockButtonEntriesTable } from "@workspace/db";

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

  // Attach rework summary so the UI can show "Reworked" badges and remaining qty.
  const ids = entries.map((e) => e.id);
  let reworkRows: { qcEntryId: number; qty: number; targetStage: string; targetMasterId: number | null; targetMasterName: string | null; status: string; date: Date; notes: string | null; id: number }[] = [];
  if (ids.length > 0) {
    reworkRows = await db
      .select({
        id: qcReworksTable.id,
        qcEntryId: qcReworksTable.qcEntryId,
        qty: qcReworksTable.qty,
        targetStage: qcReworksTable.targetStage,
        targetMasterId: qcReworksTable.targetMasterId,
        targetMasterName: mastersTable.name,
        status: qcReworksTable.status,
        date: qcReworksTable.date,
        notes: qcReworksTable.notes,
      })
      .from(qcReworksTable)
      .leftJoin(mastersTable, eq(qcReworksTable.targetMasterId, mastersTable.id))
      .where(inArray(qcReworksTable.qcEntryId, ids))
      .orderBy(sql`${qcReworksTable.createdAt} DESC`);
  }
  const byEntry = new Map<number, typeof reworkRows>();
  for (const r of reworkRows) {
    const arr = byEntry.get(r.qcEntryId) || [];
    arr.push(r);
    byEntry.set(r.qcEntryId, arr);
  }
  const enriched = entries.map((e) => {
    const reworks = byEntry.get(e.id) || [];
    const reworkedQty = reworks.reduce((s, r) => s + r.qty, 0);
    const remainingRejected = Math.max(0, (e.rejectedQty || 0) - reworkedQty);
    return { ...e, reworks, reworkedQty, remainingRejected };
  });

  res.json(enriched);
});

// Create a rework decision for a QC entry.
router.post("/qc/:id/rework", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { targetStage, targetMasterId, qty, notes, date } = req.body as {
    targetStage?: string;
    targetMasterId?: number | null;
    qty?: number;
    notes?: string;
    date?: string;
  };

  const allowedStages = new Set(["stitching", "overlock", "button", "discarded"]);
  if (!targetStage || !allowedStages.has(targetStage)) {
    res.status(400).json({ error: "targetStage must be stitching, overlock, button, or discarded" });
    return;
  }
  const reworkQty = Number(qty);
  if (!reworkQty || reworkQty <= 0) {
    res.status(400).json({ error: "qty must be greater than zero" });
    return;
  }

  try {
    const created = await db.transaction(async (tx) => {
      // Lock the QC entry row so concurrent requests serialize on it.
      const [entry] = await tx.execute<{ id: number; rejected_qty: number }>(
        sql`SELECT id, rejected_qty FROM qc_entries WHERE id = ${id} FOR UPDATE`
      ) as unknown as { id: number; rejected_qty: number }[];
      if (!entry) {
        throw Object.assign(new Error("QC entry not found"), { status: 404 });
      }
      const rejectedQty = entry.rejected_qty;

      const existing = await tx
        .select({ qty: qcReworksTable.qty })
        .from(qcReworksTable)
        .where(eq(qcReworksTable.qcEntryId, id));
      const alreadyAllocated = existing.reduce((s, r) => s + r.qty, 0);
      const remaining = (rejectedQty || 0) - alreadyAllocated;
      if (reworkQty > remaining) {
        throw Object.assign(new Error(`Only ${remaining} rejected piece(s) remain to allocate.`), { status: 400 });
      }

      const [row] = await tx.insert(qcReworksTable).values({
        qcEntryId: id,
        targetStage,
        targetMasterId: targetStage === "discarded" ? null : (targetMasterId ?? null),
        qty: reworkQty,
        status: targetStage === "discarded" ? "completed" : "pending",
        notes: notes || null,
        date: date ? new Date(date) : new Date(),
        completedAt: targetStage === "discarded" ? new Date() : null,
      }).returning();
      return row;
    });

    res.status(201).json(created);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status || 500;
    const message = err instanceof Error ? err.message : "Failed to create rework";
    res.status(status).json({ error: message });
  }
});

// Mark a rework as completed (e.g. once re-stitched and back in flow).
router.patch("/qc/reworks/:reworkId/complete", async (req, res): Promise<void> => {
  const reworkId = parseInt(req.params.reworkId, 10);
  const [updated] = await db.update(qcReworksTable)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(qcReworksTable.id, reworkId))
    .returning();
  if (!updated) { res.status(404).json({ error: "Rework not found" }); return; }
  res.json(updated);
});

// Delete a rework decision (e.g. created in error).
router.delete("/qc/reworks/:reworkId", async (req, res): Promise<void> => {
  const reworkId = parseInt(req.params.reworkId, 10);
  const [deleted] = await db.delete(qcReworksTable).where(eq(qcReworksTable.id, reworkId)).returning();
  if (!deleted) { res.status(404).json({ error: "Rework not found" }); return; }
  res.sendStatus(204);
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
