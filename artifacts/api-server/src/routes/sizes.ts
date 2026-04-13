import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sizesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/sizes", async (_req, res): Promise<void> => {
  const sizes = await db.select().from(sizesTable).orderBy(sizesTable.sortOrder);
  res.json(sizes);
});

router.post("/sizes", async (req, res): Promise<void> => {
  const { name, sortOrder } = req.body;
  if (!name) { res.status(400).json({ error: "Name is required" }); return; }
  const [size] = await db.insert(sizesTable).values({ name, sortOrder: sortOrder || 0 }).returning();
  res.status(201).json(size);
});

router.delete("/sizes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [size] = await db.delete(sizesTable).where(eq(sizesTable.id, id)).returning();
  if (!size) { res.status(404).json({ error: "Size not found" }); return; }
  res.sendStatus(204);
});

export default router;
