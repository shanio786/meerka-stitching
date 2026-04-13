import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, finalStoreReceiptsTable, articlesTable } from "@workspace/db";

const router: IRouter = Router();

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
