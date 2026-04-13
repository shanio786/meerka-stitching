import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, articleComponentsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/articles/:articleId/components", async (req, res): Promise<void> => {
  const articleId = parseInt(req.params.articleId, 10);
  const components = await db.select().from(articleComponentsTable).where(eq(articleComponentsTable.articleId, articleId));
  res.json(components);
});

router.post("/articles/:articleId/components", async (req, res): Promise<void> => {
  const articleId = parseInt(req.params.articleId, 10);
  const { componentName, fabricName, totalMetersReceived } = req.body;
  if (!componentName || !fabricName) {
    res.status(400).json({ error: "Component name and fabric name are required" });
    return;
  }

  const [comp] = await db.insert(articleComponentsTable).values({
    articleId, componentName, fabricName, totalMetersReceived: totalMetersReceived || 0,
  }).returning();

  res.status(201).json(comp);
});

router.patch("/components/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { componentName, fabricName, totalMetersReceived } = req.body;

  const [comp] = await db
    .update(articleComponentsTable)
    .set({ componentName, fabricName, totalMetersReceived })
    .where(eq(articleComponentsTable.id, id))
    .returning();

  if (!comp) {
    res.status(404).json({ error: "Component not found" });
    return;
  }
  res.json(comp);
});

router.delete("/components/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [comp] = await db.delete(articleComponentsTable).where(eq(articleComponentsTable.id, id)).returning();
  if (!comp) {
    res.status(404).json({ error: "Component not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
