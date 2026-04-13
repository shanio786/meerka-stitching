import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, imagesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/images", async (req, res): Promise<void> => {
  const { entityType, entityId } = req.query;
  if (!entityType || !entityId) {
    res.status(400).json({ error: "entityType and entityId are required" });
    return;
  }
  const images = await db.select().from(imagesTable)
    .where(and(eq(imagesTable.entityType, entityType as string), eq(imagesTable.entityId, Number(entityId))))
    .orderBy(imagesTable.createdAt);
  res.json(images);
});

router.post("/images", async (req, res): Promise<void> => {
  const { entityType, entityId, url, filename, sizeBytes, caption } = req.body;
  if (!entityType || !entityId || !url || !filename) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [image] = await db.insert(imagesTable).values({
    entityType, entityId, url, filename, sizeBytes, caption,
  }).returning();
  res.status(201).json(image);
});

router.delete("/images/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [image] = await db.delete(imagesTable).where(eq(imagesTable.id, id)).returning();
  if (!image) { res.status(404).json({ error: "Image not found" }); return; }
  res.sendStatus(204);
});

export default router;
