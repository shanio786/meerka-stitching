import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike } from "drizzle-orm";
import { db, grnEntriesTable, articlesTable } from "@workspace/db";
import {
  ListGrnEntriesQueryParams,
  ListGrnEntriesResponse,
  CreateGrnEntryBody,
  GetGrnEntryParams,
  GetGrnEntryResponse,
  DeleteGrnEntryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/grn", async (req, res): Promise<void> => {
  const params = ListGrnEntriesQueryParams.safeParse(req.query);
  const filters = params.success ? params.data : {};

  const conditions = [];
  if (filters.articleId) {
    conditions.push(eq(grnEntriesTable.articleId, filters.articleId));
  }
  if (filters.supplier) {
    conditions.push(ilike(grnEntriesTable.supplierName, `%${filters.supplier}%`));
  }
  if (filters.fromDate) {
    conditions.push(gte(grnEntriesTable.date, new Date(filters.fromDate)));
  }
  if (filters.toDate) {
    conditions.push(lte(grnEntriesTable.date, new Date(filters.toDate)));
  }

  const entries = await db
    .select({
      id: grnEntriesTable.id,
      grnNumber: grnEntriesTable.grnNumber,
      date: grnEntriesTable.date,
      supplierName: grnEntriesTable.supplierName,
      articleId: grnEntriesTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      totalRolls: grnEntriesTable.totalRolls,
      totalMeters: grnEntriesTable.totalMeters,
      ratePerMeter: grnEntriesTable.ratePerMeter,
      totalCost: grnEntriesTable.totalCost,
      batchNumber: grnEntriesTable.batchNumber,
      colorLot: grnEntriesTable.colorLot,
      qualityType: grnEntriesTable.qualityType,
      rackLocation: grnEntriesTable.rackLocation,
      createdAt: grnEntriesTable.createdAt,
    })
    .from(grnEntriesTable)
    .leftJoin(articlesTable, eq(grnEntriesTable.articleId, articlesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(grnEntriesTable.date);

  res.json(ListGrnEntriesResponse.parse(entries));
});

router.post("/grn", async (req, res): Promise<void> => {
  const parsed = CreateGrnEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const totalCost = parsed.data.totalMeters * parsed.data.ratePerMeter;

  const [entry] = await db
    .insert(grnEntriesTable)
    .values({ ...parsed.data, totalCost })
    .returning();

  const [article] = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.id, entry.articleId));

  res.status(201).json(GetGrnEntryResponse.parse({
    ...entry,
    articleCode: article?.articleCode || null,
    articleName: article?.articleName || null,
  }));
});

router.get("/grn/:id", async (req, res): Promise<void> => {
  const params = GetGrnEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .select({
      id: grnEntriesTable.id,
      grnNumber: grnEntriesTable.grnNumber,
      date: grnEntriesTable.date,
      supplierName: grnEntriesTable.supplierName,
      articleId: grnEntriesTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      totalRolls: grnEntriesTable.totalRolls,
      totalMeters: grnEntriesTable.totalMeters,
      ratePerMeter: grnEntriesTable.ratePerMeter,
      totalCost: grnEntriesTable.totalCost,
      batchNumber: grnEntriesTable.batchNumber,
      colorLot: grnEntriesTable.colorLot,
      qualityType: grnEntriesTable.qualityType,
      rackLocation: grnEntriesTable.rackLocation,
      createdAt: grnEntriesTable.createdAt,
    })
    .from(grnEntriesTable)
    .leftJoin(articlesTable, eq(grnEntriesTable.articleId, articlesTable.id))
    .where(eq(grnEntriesTable.id, params.data.id));

  if (!entry) {
    res.status(404).json({ error: "GRN entry not found" });
    return;
  }

  res.json(GetGrnEntryResponse.parse(entry));
});

router.delete("/grn/:id", async (req, res): Promise<void> => {
  const params = DeleteGrnEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .delete(grnEntriesTable)
    .where(eq(grnEntriesTable.id, params.data.id))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "GRN entry not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
