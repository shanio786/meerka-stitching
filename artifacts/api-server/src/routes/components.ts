import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, articleComponentsTable } from "@workspace/db";
import {
  ListArticleComponentsParams,
  ListArticleComponentsResponse,
  CreateArticleComponentParams,
  CreateArticleComponentBody,
  BulkUpdateComponentsParams,
  BulkUpdateComponentsBody,
  BulkUpdateComponentsResponse,
  UpdateComponentParams,
  UpdateComponentBody,
  UpdateComponentResponse,
  DeleteComponentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/articles/:articleId/components", async (req, res): Promise<void> => {
  const params = ListArticleComponentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const components = await db
    .select()
    .from(articleComponentsTable)
    .where(eq(articleComponentsTable.articleId, params.data.articleId));

  res.json(ListArticleComponentsResponse.parse(components));
});

router.post("/articles/:articleId/components", async (req, res): Promise<void> => {
  const params = CreateArticleComponentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateArticleComponentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [component] = await db
    .insert(articleComponentsTable)
    .values({ ...parsed.data, articleId: params.data.articleId })
    .returning();

  res.status(201).json(component);
});

router.put("/articles/:articleId/components/bulk", async (req, res): Promise<void> => {
  const params = BulkUpdateComponentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = BulkUpdateComponentsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .delete(articleComponentsTable)
    .where(eq(articleComponentsTable.articleId, params.data.articleId));

  const components = [];
  for (const comp of parsed.data.components) {
    const [created] = await db
      .insert(articleComponentsTable)
      .values({ ...comp, articleId: params.data.articleId })
      .returning();
    components.push(created);
  }

  res.json(BulkUpdateComponentsResponse.parse(components));
});

router.patch("/components/:id", async (req, res): Promise<void> => {
  const params = UpdateComponentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateComponentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [component] = await db
    .update(articleComponentsTable)
    .set(parsed.data)
    .where(eq(articleComponentsTable.id, params.data.id))
    .returning();

  if (!component) {
    res.status(404).json({ error: "Component not found" });
    return;
  }

  res.json(UpdateComponentResponse.parse(component));
});

router.delete("/components/:id", async (req, res): Promise<void> => {
  const params = DeleteComponentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [component] = await db
    .delete(articleComponentsTable)
    .where(eq(articleComponentsTable.id, params.data.id))
    .returning();

  if (!component) {
    res.status(404).json({ error: "Component not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
