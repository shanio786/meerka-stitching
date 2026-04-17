import { Router, type IRouter } from "express";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db, articlesTable, articleComponentsTable, articleAccessoriesTable, cuttingAssignmentsTable, cuttingJobsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/articles", async (req, res): Promise<void> => {
  const { search, category, partType, piecesType } = req.query;
  const conditions = [];
  if (search) {
    conditions.push(
      sql`(${ilike(articlesTable.articleName, `%${search}%`)} OR ${ilike(articlesTable.articleCode, `%${search}%`)})`
    );
  }
  if (category) conditions.push(eq(articlesTable.category, category as string));
  if (partType) conditions.push(eq(articlesTable.partType, partType as string));
  if (piecesType) conditions.push(eq(articlesTable.piecesType, piecesType as string));

  const articles = await db
    .select()
    .from(articlesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${articlesTable.createdAt} DESC`);

  const result = await Promise.all(
    articles.map(async (article) => {
      const [compStats] = await db
        .select({
          componentCount: sql<number>`COUNT(*)`,
          totalMeters: sql<number>`COALESCE(SUM(${articleComponentsTable.totalMetersReceived}), 0)`,
        })
        .from(articleComponentsTable)
        .where(eq(articleComponentsTable.articleId, article.id));

      const [accStats] = await db
        .select({ accessoryCount: sql<number>`COUNT(*)` })
        .from(articleAccessoriesTable)
        .where(eq(articleAccessoriesTable.articleId, article.id));

      return {
        ...article,
        componentCount: Number(compStats.componentCount),
        totalMetersReceived: Number(compStats.totalMeters),
        accessoryCount: Number(accStats.accessoryCount),
      };
    })
  );

  res.json(result);
});

router.post("/articles", async (req, res): Promise<void> => {
  const { articleCode, articleName, collectionName, partType, category, piecesType } = req.body;
  if (!articleCode || !articleName || !partType || !category || !piecesType) {
    res.status(400).json({ error: "Article code, name, work type, category, and pieces type are required" });
    return;
  }

  const existing = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.articleCode, articleCode));

  if (existing.length > 0) {
    res.status(409).json({ error: "Article with this code already exists" });
    return;
  }

  const [article] = await db.insert(articlesTable).values({
    articleCode, articleName, collectionName: collectionName || null, partType, category, piecesType,
  }).returning();

  res.status(201).json(article);
});

router.get("/articles/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [article] = await db.select().from(articlesTable).where(eq(articlesTable.id, id));
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  const components = await db.select().from(articleComponentsTable).where(eq(articleComponentsTable.articleId, id));
  const accessories = await db.select().from(articleAccessoriesTable).where(eq(articleAccessoriesTable.articleId, id));

  res.json({ ...article, components, accessories });
});

router.get("/articles/:id/cutting-stock", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const excludeJobId = req.query.excludeJobId ? parseInt(String(req.query.excludeJobId), 10) : null;
  const [article] = await db.select().from(articlesTable).where(eq(articlesTable.id, id));
  if (!article) { res.status(404).json({ error: "Article not found" }); return; }

  const components = await db.select().from(articleComponentsTable).where(eq(articleComponentsTable.articleId, id));

  const result = await Promise.all(components.map(async (c) => {
    const conditions = [
      eq(cuttingJobsTable.articleId, id),
      eq(cuttingAssignmentsTable.componentName, c.componentName),
    ];
    const rows = await db
      .select({ given: cuttingAssignmentsTable.fabricGivenMeters, returned: cuttingAssignmentsTable.fabricReturnedMeters, jobId: cuttingAssignmentsTable.jobId })
      .from(cuttingAssignmentsTable)
      .innerJoin(cuttingJobsTable, eq(cuttingJobsTable.id, cuttingAssignmentsTable.jobId))
      .where(and(...conditions));
    let totalGiven = 0;
    for (const r of rows) {
      if (excludeJobId && r.jobId === excludeJobId) continue;
      totalGiven += (r.given || 0) - (r.returned || 0);
    }
    const available = (c.totalMetersReceived || 0) - totalGiven;
    return {
      componentName: c.componentName,
      fabricName: c.fabricName,
      totalReceived: c.totalMetersReceived || 0,
      totalGiven,
      available: Math.max(0, available),
    };
  }));

  res.json(result);
});

router.patch("/articles/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { articleName, collectionName, partType, category, piecesType } = req.body;

  const [article] = await db
    .update(articlesTable)
    .set({ articleName, collectionName, partType, category, piecesType })
    .where(eq(articlesTable.id, id))
    .returning();

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json(article);
});

router.delete("/articles/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [article] = await db.delete(articlesTable).where(eq(articlesTable.id, id)).returning();
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.sendStatus(204);
});

router.patch("/articles/:id/toggle-active", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [existing] = await db.select().from(articlesTable).where(eq(articlesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  const [article] = await db
    .update(articlesTable)
    .set({ isActive: !existing.isActive })
    .where(eq(articlesTable.id, id))
    .returning();
  res.json(article);
});

export default router;
