import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, overlockButtonEntriesTable, articlesTable, mastersTable, masterAccountsTable, masterTransactionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/overlock-button", async (req, res): Promise<void> => {
  const { articleId, taskType, status } = req.query;
  const conditions = [];
  if (articleId) conditions.push(eq(overlockButtonEntriesTable.articleId, Number(articleId)));
  if (taskType && taskType !== "all") conditions.push(eq(overlockButtonEntriesTable.taskType, taskType as string));
  if (status && status !== "all") conditions.push(eq(overlockButtonEntriesTable.status, status as any));

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
  const { articleId, taskType, masterId, componentName, size, receivedQty, ratePerPiece, receivedBy, notes, date } = req.body;
  if (!articleId || !taskType || !masterId || !receivedQty || !date) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [entry] = await db.insert(overlockButtonEntriesTable).values({
    articleId, taskType, masterId, componentName, size, receivedQty,
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
