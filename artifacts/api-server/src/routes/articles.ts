import { Router, type IRouter } from "express";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db, articlesTable, articleComponentsTable } from "@workspace/db";
import {
  ListArticlesQueryParams,
  ListArticlesResponse,
  CreateArticleBody,
  GetArticleParams,
  GetArticleResponse,
  UpdateArticleParams,
  UpdateArticleBody,
  UpdateArticleResponse,
  DeleteArticleParams,
  ToggleArticleActiveParams,
  ToggleArticleActiveResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/articles", async (req, res): Promise<void> => {
  const params = ListArticlesQueryParams.safeParse(req.query);
  const filters = params.success ? params.data : {};

  const conditions = [];
  if (filters.search) {
    conditions.push(
      sql`(${ilike(articlesTable.articleName, `%${filters.search}%`)} OR ${ilike(articlesTable.articleCode, `%${filters.search}%`)})`
    );
  }
  if (filters.fabricType) {
    conditions.push(eq(articlesTable.fabricType, filters.fabricType));
  }
  if (filters.season) {
    conditions.push(eq(articlesTable.season, filters.season));
  }
  if (filters.category) {
    conditions.push(eq(articlesTable.category, filters.category));
  }
  if (filters.collection) {
    conditions.push(ilike(articlesTable.collectionName, `%${filters.collection}%`));
  }
  if (filters.isActive !== undefined) {
    conditions.push(eq(articlesTable.isActive, filters.isActive));
  }

  const articles = await db
    .select()
    .from(articlesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(articlesTable.createdAt);

  const articlesWithTotal = await Promise.all(
    articles.map(async (article) => {
      const components = await db
        .select({ total: sql<number>`COALESCE(SUM(${articleComponentsTable.requiredMeters}), 0)` })
        .from(articleComponentsTable)
        .where(eq(articleComponentsTable.articleId, article.id));
      return { ...article, totalFabricPerUnit: Number(components[0]?.total) || null };
    })
  );

  res.json(ListArticlesResponse.parse(articlesWithTotal));
});

router.post("/articles", async (req, res): Promise<void> => {
  const parsed = CreateArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.articleCode, parsed.data.articleCode));

  if (existing.length > 0) {
    res.status(409).json({ error: "Article with this code already exists" });
    return;
  }

  const [article] = await db.insert(articlesTable).values(parsed.data).returning();
  res.status(201).json({ ...article, totalFabricPerUnit: null });
});

router.get("/articles/:id", async (req, res): Promise<void> => {
  const params = GetArticleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [article] = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.id, params.data.id));

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  const components = await db
    .select()
    .from(articleComponentsTable)
    .where(eq(articleComponentsTable.articleId, article.id));

  const totalFabric = components.reduce((sum, c) => sum + c.requiredMeters, 0);

  res.json(GetArticleResponse.parse({
    ...article,
    totalFabricPerUnit: totalFabric || null,
    components,
  }));
});

router.patch("/articles/:id", async (req, res): Promise<void> => {
  const params = UpdateArticleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [article] = await db
    .update(articlesTable)
    .set(parsed.data)
    .where(eq(articlesTable.id, params.data.id))
    .returning();

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  res.json(UpdateArticleResponse.parse({ ...article, totalFabricPerUnit: null }));
});

router.delete("/articles/:id", async (req, res): Promise<void> => {
  const params = DeleteArticleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [article] = await db
    .delete(articlesTable)
    .where(eq(articlesTable.id, params.data.id))
    .returning();

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/articles/:id/toggle-active", async (req, res): Promise<void> => {
  const params = ToggleArticleActiveParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  const [article] = await db
    .update(articlesTable)
    .set({ isActive: !existing.isActive })
    .where(eq(articlesTable.id, params.data.id))
    .returning();

  res.json(ToggleArticleActiveResponse.parse({ ...article, totalFabricPerUnit: null }));
});

export default router;
