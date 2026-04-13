import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, componentTemplatesTable, templateItemsTable, articleComponentsTable } from "@workspace/db";
import {
  ListTemplatesResponse,
  CreateTemplateBody,
  GetTemplateParams,
  GetTemplateResponse,
  DeleteTemplateParams,
  ApplyTemplateParams,
  ApplyTemplateResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/templates", async (_req, res): Promise<void> => {
  const templates = await db
    .select()
    .from(componentTemplatesTable)
    .orderBy(componentTemplatesTable.createdAt);

  res.json(ListTemplatesResponse.parse(templates));
});

router.post("/templates", async (req, res): Promise<void> => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [template] = await tx
      .insert(componentTemplatesTable)
      .values({ templateName: parsed.data.templateName, description: parsed.data.description })
      .returning();

    for (const item of parsed.data.items) {
      await tx.insert(templateItemsTable).values({
        templateId: template.id,
        ...item,
      });
    }

    return template;
  });

  res.status(201).json(result);
});

router.get("/templates/:id", async (req, res): Promise<void> => {
  const params = GetTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [template] = await db
    .select()
    .from(componentTemplatesTable)
    .where(eq(componentTemplatesTable.id, params.data.id));

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const items = await db
    .select()
    .from(templateItemsTable)
    .where(eq(templateItemsTable.templateId, template.id));

  res.json(GetTemplateResponse.parse({ ...template, items }));
});

router.delete("/templates/:id", async (req, res): Promise<void> => {
  const params = DeleteTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [template] = await db
    .delete(componentTemplatesTable)
    .where(eq(componentTemplatesTable.id, params.data.id))
    .returning();

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/templates/:id/apply/:articleId", async (req, res): Promise<void> => {
  const params = ApplyTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const items = await db
    .select()
    .from(templateItemsTable)
    .where(eq(templateItemsTable.templateId, params.data.id));

  if (items.length === 0) {
    res.status(404).json({ error: "Template not found or has no items" });
    return;
  }

  const components = [];
  for (const item of items) {
    const [component] = await db
      .insert(articleComponentsTable)
      .values({
        articleId: params.data.articleId,
        componentName: item.componentName,
        componentType: item.componentType,
        fabricType: item.fabricType,
        requiredMeters: item.requiredMeters,
        unitType: item.unitType,
        wastagePercent: item.wastagePercent,
      })
      .returning();
    components.push(component);
  }

  res.json(ApplyTemplateResponse.parse(components));
});

export default router;
