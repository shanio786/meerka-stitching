import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, finishingEntriesTable, articlesTable, mastersTable, masterAccountsTable, masterTransactionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/finishing", async (req, res): Promise<void> => {
  const { articleId, status } = req.query;
  const conditions = [];
  if (articleId) conditions.push(eq(finishingEntriesTable.articleId, Number(articleId)));
  if (status && status !== "all") conditions.push(eq(finishingEntriesTable.status, status as any));

  const entries = await db
    .select({
      id: finishingEntriesTable.id,
      articleId: finishingEntriesTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      masterId: finishingEntriesTable.masterId,
      masterName: mastersTable.name,
      workerName: finishingEntriesTable.workerName,
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
  const { articleId, masterId, workerName, receivedQty, ratePerPiece, receivedBy, notes, date } = req.body;
  if (!articleId || !workerName || !receivedQty || !date) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [entry] = await db.insert(finishingEntriesTable).values({
    articleId, masterId, workerName, receivedQty, ratePerPiece, receivedBy, notes, date: new Date(date),
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
