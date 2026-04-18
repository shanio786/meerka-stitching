import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, cuttingJobsTable, cuttingAssignmentsTable, cuttingSizeBreakdownTable, mastersTable, articlesTable, articleComponentsTable, masterAccountsTable, masterTransactionsTable } from "@workspace/db";

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
  const { articleId, jobDate, demandPieces, notes } = req.body;
  if (!articleId || !jobDate) {
    res.status(400).json({ error: "Article and date are required" });
    return;
  }

  const [job] = await db.insert(cuttingJobsTable).values({
    articleId, jobDate: new Date(jobDate), demandPieces: demandPieces || null, notes,
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
      demandPieces: cuttingJobsTable.demandPieces,
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
      handoverStatus: cuttingAssignmentsTable.handoverStatus,
      receivedBy: cuttingAssignmentsTable.receivedBy,
      handoverDate: cuttingAssignmentsTable.handoverDate,
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
  const { jobId, masterId, items, notes, sizes, ratePerSuit } = req.body;
  if (!jobId || !masterId) {
    res.status(400).json({ error: "Job and master are required" });
    return;
  }

  if (Array.isArray(items) && items.length > 0) {
    const [job] = await db.select().from(cuttingJobsTable).where(eq(cuttingJobsTable.id, jobId));
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    const components = await db.select().from(articleComponentsTable).where(eq(articleComponentsTable.articleId, job.articleId));

    for (const item of items) {
      const comp = components.find((c) => c.componentName === item.componentName);
      if (!comp) {
        res.status(400).json({ error: `Component "${item.componentName}" not found in article` });
        return;
      }
      const existing = await db
        .select({ given: cuttingAssignmentsTable.fabricGivenMeters, returned: cuttingAssignmentsTable.fabricReturnedMeters })
        .from(cuttingAssignmentsTable)
        .innerJoin(cuttingJobsTable, eq(cuttingJobsTable.id, cuttingAssignmentsTable.jobId))
        .where(and(eq(cuttingJobsTable.articleId, job.articleId), eq(cuttingAssignmentsTable.componentName, item.componentName)));
      const usedSoFar = existing.reduce((s, r) => s + ((r.given || 0) - (r.returned || 0)), 0);
      const available = (comp.totalMetersReceived || 0) - usedSoFar;
      const fabricGiven = Number(item.fabricGivenMeters) || 0;
      if (fabricGiven > available + 0.001) {
        res.status(400).json({ error: `Not enough fabric for "${item.componentName}". Available: ${available.toFixed(2)}m, requested: ${fabricGiven}m` });
        return;
      }
      // Demand check is now a warning on the frontend, not a hard block,
      // because cutting can be split across multiple masters.
    }

    const result = await db.transaction(async (tx) => {
      const created = [];
      let suitRateApplied = false;
      for (const item of items) {
        const useSuitRate = ratePerSuit && !suitRateApplied;
        const [assignment] = await tx.insert(cuttingAssignmentsTable).values({
          jobId, masterId,
          componentName: item.componentName,
          fabricType: item.fabricType || null,
          fabricGivenMeters: Number(item.fabricGivenMeters),
          fabricPerPiece: item.fabricPerPiece ? Number(item.fabricPerPiece) : null,
          estimatedPieces: item.estimatedPieces ? Number(item.estimatedPieces) : null,
          ratePerPiece: ratePerSuit ? null : (item.ratePerPiece ? Number(item.ratePerPiece) : null),
          ratePerSuit: useSuitRate ? Number(ratePerSuit) : null,
          notes: useSuitRate ? `${notes || ""}${notes ? " | " : ""}Suit rate covers: ${items.map((it: { componentName: string }) => it.componentName).join(", ")}` : (ratePerSuit ? `Bundled with suit rate (paid via ${items[0].componentName})` : notes),
        }).returning();
        if (useSuitRate) suitRateApplied = true;
        created.push(assignment);

        if (sizes && Array.isArray(sizes)) {
          for (const s of sizes) {
            await tx.insert(cuttingSizeBreakdownTable).values({
              assignmentId: assignment.id, size: s.size, quantity: s.quantity,
            });
          }
        }
      }
      await tx.update(cuttingJobsTable).set({ status: "in_progress" }).where(eq(cuttingJobsTable.id, jobId));
      return created;
    });

    res.status(201).json(result);
    return;
  }

  const { componentName, fabricType, fabricGivenMeters, fabricPerPiece, estimatedPieces, ratePerPiece } = req.body;
  if (!componentName || !fabricGivenMeters) {
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

router.patch("/cutting/assignments/:id/handover", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { handoverStatus, receivedBy } = req.body;
  if (!["with_cutter", "returned_to_store", "received_by_next"].includes(handoverStatus)) {
    res.status(400).json({ error: "Invalid handover status" });
    return;
  }
  const [a] = await db.update(cuttingAssignmentsTable).set({
    handoverStatus,
    receivedBy: receivedBy || null,
    handoverDate: handoverStatus === "with_cutter" ? null : new Date(),
  }).where(eq(cuttingAssignmentsTable.id, id)).returning();
  if (!a) { res.status(404).json({ error: "Assignment not found" }); return; }
  res.json(a);
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
