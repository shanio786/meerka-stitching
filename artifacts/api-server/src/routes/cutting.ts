import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, cuttingJobsTable, cuttingAssignmentsTable, cuttingSizeBreakdownTable, mastersTable, articlesTable, masterAccountsTable, masterTransactionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/cutting/jobs", async (req, res): Promise<void> => {
  const { articleId, status } = req.query;
  const conditions = [];
  if (articleId) conditions.push(eq(cuttingJobsTable.articleId, Number(articleId)));
  if (status && status !== "all") conditions.push(sql`${cuttingJobsTable.status} = ${String(status)}`);

  const jobs = await db
    .select({
      id: cuttingJobsTable.id,
      articleId: cuttingJobsTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      jobDate: cuttingJobsTable.jobDate,
      status: cuttingJobsTable.status,
      notes: cuttingJobsTable.notes,
      createdAt: cuttingJobsTable.createdAt,
    })
    .from(cuttingJobsTable)
    .leftJoin(articlesTable, eq(cuttingJobsTable.articleId, articlesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${cuttingJobsTable.jobDate} DESC`);

  res.json(jobs);
});

router.post("/cutting/jobs", async (req, res): Promise<void> => {
  const { articleId, jobDate, notes } = req.body;
  if (!articleId || !jobDate) {
    res.status(400).json({ error: "Article and date are required" });
    return;
  }

  const [job] = await db.insert(cuttingJobsTable).values({
    articleId, jobDate: new Date(jobDate), notes,
  }).returning();

  res.status(201).json(job);
});

router.get("/cutting/jobs/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [job] = await db
    .select({
      id: cuttingJobsTable.id,
      articleId: cuttingJobsTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      jobDate: cuttingJobsTable.jobDate,
      status: cuttingJobsTable.status,
      notes: cuttingJobsTable.notes,
      createdAt: cuttingJobsTable.createdAt,
    })
    .from(cuttingJobsTable)
    .leftJoin(articlesTable, eq(cuttingJobsTable.articleId, articlesTable.id))
    .where(eq(cuttingJobsTable.id, id));

  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const assignments = await db
    .select({
      id: cuttingAssignmentsTable.id,
      masterId: cuttingAssignmentsTable.masterId,
      masterName: mastersTable.name,
      componentName: cuttingAssignmentsTable.componentName,
      fabricType: cuttingAssignmentsTable.fabricType,
      fabricGivenMeters: cuttingAssignmentsTable.fabricGivenMeters,
      fabricPerPiece: cuttingAssignmentsTable.fabricPerPiece,
      estimatedPieces: cuttingAssignmentsTable.estimatedPieces,
      ratePerPiece: cuttingAssignmentsTable.ratePerPiece,
      ratePerSuit: cuttingAssignmentsTable.ratePerSuit,
      status: cuttingAssignmentsTable.status,
      notes: cuttingAssignmentsTable.notes,
      assignedDate: cuttingAssignmentsTable.assignedDate,
      completedDate: cuttingAssignmentsTable.completedDate,
      piecesCut: cuttingAssignmentsTable.piecesCut,
      wasteMeters: cuttingAssignmentsTable.wasteMeters,
      fabricReturnedMeters: cuttingAssignmentsTable.fabricReturnedMeters,
      totalAmount: cuttingAssignmentsTable.totalAmount,
    })
    .from(cuttingAssignmentsTable)
    .leftJoin(mastersTable, eq(cuttingAssignmentsTable.masterId, mastersTable.id))
    .where(eq(cuttingAssignmentsTable.jobId, id));

  const assignmentsWithSizes = await Promise.all(assignments.map(async (a) => {
    const sizes = await db.select().from(cuttingSizeBreakdownTable)
      .where(eq(cuttingSizeBreakdownTable.assignmentId, a.id));
    return { ...a, sizes };
  }));

  res.json({ ...job, assignments: assignmentsWithSizes });
});

router.patch("/cutting/jobs/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { status, notes } = req.body;
  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const [job] = await db.update(cuttingJobsTable).set(updateData).where(eq(cuttingJobsTable.id, id)).returning();
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(job);
});

router.post("/cutting/assignments", async (req, res): Promise<void> => {
  const { jobId, masterId, componentName, fabricType, fabricGivenMeters, fabricPerPiece, estimatedPieces, ratePerPiece, ratePerSuit, notes, sizes } = req.body;
  if (!jobId || !masterId || !componentName || !fabricGivenMeters) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [assignment] = await tx.insert(cuttingAssignmentsTable).values({
      jobId, masterId, componentName, fabricType, fabricGivenMeters, fabricPerPiece, estimatedPieces, ratePerPiece, ratePerSuit, notes,
    }).returning();

    if (sizes && Array.isArray(sizes)) {
      for (const s of sizes) {
        await tx.insert(cuttingSizeBreakdownTable).values({
          assignmentId: assignment.id, size: s.size, quantity: s.quantity,
        });
      }
    }

    await tx.update(cuttingJobsTable).set({ status: "in_progress" }).where(eq(cuttingJobsTable.id, jobId));
    return assignment;
  });

  res.status(201).json(result);
});

router.patch("/cutting/assignments/:id/complete", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { piecesCut, wasteMeters, fabricReturnedMeters, sizeResults } = req.body;

  const [existing] = await db.select().from(cuttingAssignmentsTable).where(eq(cuttingAssignmentsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Assignment not found" }); return; }
  if (existing.status === "completed") { res.status(400).json({ error: "Assignment already completed" }); return; }

  const rate = existing.ratePerPiece || existing.ratePerSuit || 0;
  const totalAmount = (piecesCut || 0) * rate;

  const result = await db.transaction(async (tx) => {
    const [assignment] = await tx.update(cuttingAssignmentsTable).set({
      status: "completed", piecesCut, wasteMeters, fabricReturnedMeters, totalAmount, completedDate: new Date(),
    }).where(eq(cuttingAssignmentsTable.id, id)).returning();

    if (sizeResults && Array.isArray(sizeResults)) {
      for (const s of sizeResults) {
        await tx.update(cuttingSizeBreakdownTable).set({ completedQty: s.completedQty })
          .where(and(eq(cuttingSizeBreakdownTable.assignmentId, id), eq(cuttingSizeBreakdownTable.size, s.size)));
      }
    }

    if (totalAmount > 0) {
      await tx.insert(masterTransactionsTable).values({
        masterId: existing.masterId, type: "earning", amount: totalAmount,
        referenceType: "cutting_assignment", referenceId: id,
        description: `Cutting job - ${existing.componentName} - ${piecesCut} pieces`,
      });

      await tx.update(masterAccountsTable).set({
        balance: sql`${masterAccountsTable.balance} + ${totalAmount}`,
        totalEarned: sql`${masterAccountsTable.totalEarned} + ${totalAmount}`,
      }).where(eq(masterAccountsTable.masterId, existing.masterId));
    }

    return assignment;
  });

  res.json(result);
});

router.delete("/cutting/assignments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [a] = await db.delete(cuttingAssignmentsTable).where(eq(cuttingAssignmentsTable.id, id)).returning();
  if (!a) { res.status(404).json({ error: "Assignment not found" }); return; }
  res.sendStatus(204);
});

export default router;
