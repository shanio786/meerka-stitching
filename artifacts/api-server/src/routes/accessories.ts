import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, articleAccessoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/articles/:articleId/accessories", async (req, res): Promise<void> => {
  const articleId = parseInt(req.params.articleId, 10);
  const accessories = await db.select().from(articleAccessoriesTable).where(eq(articleAccessoriesTable.articleId, articleId));
  res.json(accessories);
});

router.post("/articles/:articleId/accessories", async (req, res): Promise<void> => {
  const articleId = parseInt(req.params.articleId, 10);
  const { accessoryName, quantity, meters, ratePerUnit } = req.body;
  if (!accessoryName) {
    res.status(400).json({ error: "Accessory name is required" });
    return;
  }

  const totalAmount = (quantity || 0) * (ratePerUnit || 0);

  const [acc] = await db.insert(articleAccessoriesTable).values({
    articleId, accessoryName, quantity: quantity || 0, meters: meters || null, ratePerUnit: ratePerUnit || null, totalAmount: totalAmount || null,
  }).returning();

  res.status(201).json(acc);
});

router.patch("/accessories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { accessoryName, quantity, meters, ratePerUnit } = req.body;
  const totalAmount = (quantity || 0) * (ratePerUnit || 0);

  const [acc] = await db
    .update(articleAccessoriesTable)
    .set({ accessoryName, quantity, meters, ratePerUnit, totalAmount: totalAmount || null })
    .where(eq(articleAccessoriesTable.id, id))
    .returning();

  if (!acc) {
    res.status(404).json({ error: "Accessory not found" });
    return;
  }
  res.json(acc);
});

router.delete("/accessories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [acc] = await db.delete(articleAccessoriesTable).where(eq(articleAccessoriesTable.id, id)).returning();
  if (!acc) {
    res.status(404).json({ error: "Accessory not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
