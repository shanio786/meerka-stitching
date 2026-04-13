import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, qcEntriesTable, articlesTable, mastersTable } from "@workspace/db";

const router: IRouter = Router();

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
  const { articleId, stitchingJobId, inspectorName, masterId, componentName, size, receivedQty, passedQty, rejectedQty, rejectionReason, notes, date } = req.body;
  if (!articleId || !inspectorName || !receivedQty || !date) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [entry] = await db.insert(qcEntriesTable).values({
    articleId, stitchingJobId, inspectorName, masterId, componentName, size,
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
