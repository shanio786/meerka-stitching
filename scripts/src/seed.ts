import {
  db,
  articlesTable,
  articleComponentsTable,
  articleAccessoriesTable,
  mastersTable,
  sizesTable,
  masterAccountsTable,
  cuttingJobsTable,
  cuttingAssignmentsTable,
  cuttingSizeBreakdownTable,
  stitchingJobsTable,
  stitchingAssignmentsTable,
  qcEntriesTable,
  overlockButtonEntriesTable,
  finishingEntriesTable,
  finalStoreReceiptsTable,
  masterTransactionsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const [art1] = await db.insert(articlesTable).values({
    articleCode: "LS-3PC-001",
    articleName: "Ladies Summer 3PC Lawn",
    collectionName: "Summer Collection 2026",
    partType: "Apna",
    category: "Summer",
    piecesType: "3PC",
    isActive: true,
  }).returning();

  const [art2] = await db.insert(articlesTable).values({
    articleCode: "GW-2PC-005",
    articleName: "Gents Winter 2PC Khaddar",
    collectionName: "Winter 2026",
    partType: "Bahir Ka",
    category: "Winter",
    piecesType: "2PC",
    isActive: true,
  }).returning();

  const [art3] = await db.insert(articlesTable).values({
    articleCode: "EX-SS-010",
    articleName: "Export Single Shirt Cotton",
    collectionName: "Spring Export",
    partType: "Export",
    category: "Spring",
    piecesType: "Single Shirt",
    isActive: true,
  }).returning();

  await db.insert(articleComponentsTable).values([
    { articleId: art1.id, componentName: "Shirt", fabricName: "Lawn", totalMetersReceived: 250 },
    { articleId: art1.id, componentName: "Trouser", fabricName: "Cotton", totalMetersReceived: 180 },
    { articleId: art1.id, componentName: "Dupatta", fabricName: "Chiffon", totalMetersReceived: 120 },
  ]);

  await db.insert(articleComponentsTable).values([
    { articleId: art2.id, componentName: "Kurta", fabricName: "Khaddar", totalMetersReceived: 300 },
    { articleId: art2.id, componentName: "Shalwar", fabricName: "Khaddar", totalMetersReceived: 200 },
  ]);

  await db.insert(articleComponentsTable).values([
    { articleId: art3.id, componentName: "Shirt", fabricName: "Cotton", totalMetersReceived: 400 },
  ]);

  await db.insert(articleAccessoriesTable).values([
    { articleId: art1.id, accessoryName: "Lace Border", quantity: 500, meters: 100, ratePerUnit: 15, totalAmount: 7500 },
    { articleId: art1.id, accessoryName: "Patch Embroidery", quantity: 250, ratePerUnit: 45, totalAmount: 11250 },
    { articleId: art1.id, accessoryName: "Buttons", quantity: 1500, ratePerUnit: 2, totalAmount: 3000 },
    { articleId: art2.id, accessoryName: "Buttons", quantity: 1000, ratePerUnit: 5, totalAmount: 5000 },
    { articleId: art2.id, accessoryName: "Zipper", quantity: 500, ratePerUnit: 8, totalAmount: 4000 },
  ]);

  await db.insert(sizesTable).values([
    { name: "XS", sortOrder: 1 },
    { name: "S", sortOrder: 2 },
    { name: "M", sortOrder: 3 },
    { name: "L", sortOrder: 4 },
    { name: "XL", sortOrder: 5 },
    { name: "XXL", sortOrder: 6 },
  ]);

  const [m1] = await db.insert(mastersTable).values({ name: "Usman Tailor", phone: "0300-1234567", masterType: "cutting", machineNo: "C-01", defaultRate: 15, address: "Faisalabad" }).returning();
  const [m2] = await db.insert(mastersTable).values({ name: "Akram Cutter", phone: "0301-2345678", masterType: "cutting", machineNo: "C-02", defaultRate: 12, address: "Faisalabad" }).returning();
  const [m3] = await db.insert(mastersTable).values({ name: "Bilal Stitch", phone: "0302-3456789", masterType: "stitching", machineNo: "S-05", defaultRate: 25, address: "Lahore" }).returning();
  const [m4] = await db.insert(mastersTable).values({ name: "Kamran Stitch", phone: "0303-4567890", masterType: "stitching", machineNo: "S-08", defaultRate: 22, address: "Lahore" }).returning();
  const [m5] = await db.insert(mastersTable).values({ name: "Aslam Overlock", phone: "0304-5678901", masterType: "overlock", machineNo: "O-01", defaultRate: 8 }).returning();
  const [m6] = await db.insert(mastersTable).values({ name: "Zahid Button", phone: "0305-6789012", masterType: "button", machineNo: "B-01", defaultRate: 5 }).returning();
  const [m7] = await db.insert(mastersTable).values({ name: "Rashid Finish", phone: "0306-7890123", masterType: "finishing", defaultRate: 10 }).returning();

  for (const m of [m1, m2, m3, m4, m5, m6, m7]) {
    await db.insert(masterAccountsTable).values({ masterId: m.id, balance: 0, totalEarned: 0, totalPaid: 0 });
  }

  const [cutJob1] = await db.insert(cuttingJobsTable).values({
    articleId: art1.id, jobDate: new Date("2026-04-03"), status: "completed", notes: "Full lot cutting",
  }).returning();

  const [ca1] = await db.insert(cuttingAssignmentsTable).values({
    jobId: cutJob1.id, masterId: m1.id, componentName: "Shirt", fabricType: "Lawn",
    fabricGivenMeters: 150, estimatedPieces: 55, ratePerPiece: 15,
    status: "completed", piecesCut: 52, wasteMeters: 5.2, fabricReturnedMeters: 10,
    totalAmount: 52 * 15, completedDate: new Date("2026-04-05"),
  }).returning();

  await db.insert(cuttingSizeBreakdownTable).values([
    { assignmentId: ca1.id, size: "S", quantity: 10, completedQty: 10 },
    { assignmentId: ca1.id, size: "M", quantity: 20, completedQty: 19 },
    { assignmentId: ca1.id, size: "L", quantity: 15, completedQty: 14 },
    { assignmentId: ca1.id, size: "XL", quantity: 10, completedQty: 9 },
  ]);

  await db.insert(masterTransactionsTable).values({
    masterId: m1.id, type: "earning", amount: 52 * 15,
    referenceType: "cutting_assignment", referenceId: ca1.id,
    description: "Cutting job - Shirt - 52 pieces",
  });
  await db.update(masterAccountsTable).set({
    balance: sql`${masterAccountsTable.balance} + ${52 * 15}`,
    totalEarned: sql`${masterAccountsTable.totalEarned} + ${52 * 15}`,
  }).where(sql`${masterAccountsTable.masterId} = ${m1.id}`);

  const [cutJob2] = await db.insert(cuttingJobsTable).values({
    articleId: art1.id, jobDate: new Date("2026-04-04"), status: "in_progress", notes: "Trouser cutting",
  }).returning();

  await db.insert(cuttingAssignmentsTable).values({
    jobId: cutJob2.id, masterId: m2.id, componentName: "Trouser", fabricType: "Cotton",
    fabricGivenMeters: 100, estimatedPieces: 50, ratePerPiece: 12,
    status: "pending",
  });

  const [sthJob1] = await db.insert(stitchingJobsTable).values({
    articleId: art1.id, cuttingJobId: cutJob1.id, supervisorName: "Hasan Supervisor",
    jobDate: new Date("2026-04-06"), status: "in_progress",
  }).returning();

  const [sa1] = await db.insert(stitchingAssignmentsTable).values({
    jobId: sthJob1.id, masterId: m3.id, componentName: "Shirt", size: "M",
    quantityGiven: 19, ratePerPiece: 25, status: "completed",
    piecesCompleted: 18, piecesWaste: 1, wasteReason: "Fabric defect",
    totalAmount: 18 * 25, completedDate: new Date("2026-04-08"),
  }).returning();

  await db.insert(masterTransactionsTable).values({
    masterId: m3.id, type: "earning", amount: 18 * 25,
    referenceType: "stitching_assignment", referenceId: sa1.id,
    description: "Stitching - Shirt M - 18 pieces",
  });
  await db.update(masterAccountsTable).set({
    balance: sql`${masterAccountsTable.balance} + ${18 * 25}`,
    totalEarned: sql`${masterAccountsTable.totalEarned} + ${18 * 25}`,
  }).where(sql`${masterAccountsTable.masterId} = ${m3.id}`);

  await db.insert(stitchingAssignmentsTable).values({
    jobId: sthJob1.id, masterId: m4.id, componentName: "Shirt", size: "L",
    quantityGiven: 14, ratePerPiece: 22, status: "pending",
  });

  await db.insert(qcEntriesTable).values([
    { articleId: art1.id, stitchingJobId: sthJob1.id, inspectorName: "Ali Inspector", masterId: m3.id, componentName: "Shirt", size: "M", receivedQty: 18, passedQty: 16, rejectedQty: 2, rejectionReason: "Uneven stitch on collar", date: new Date("2026-04-09") },
  ]);

  await db.insert(overlockButtonEntriesTable).values([
    { articleId: art1.id, taskType: "overlock", masterId: m5.id, componentName: "Shirt", size: "M", receivedQty: 16, completedQty: 16, ratePerPiece: 8, totalAmount: 128, status: "completed", date: new Date("2026-04-10"), completedDate: new Date("2026-04-10") },
    { articleId: art1.id, taskType: "button", masterId: m6.id, componentName: "Shirt", size: "M", receivedQty: 16, ratePerPiece: 5, status: "pending", date: new Date("2026-04-11") },
  ]);

  await db.insert(masterTransactionsTable).values({
    masterId: m5.id, type: "earning", amount: 128,
    referenceType: "overlock_button", referenceId: 1,
    description: "overlock - 16 pieces",
  });
  await db.update(masterAccountsTable).set({
    balance: sql`${masterAccountsTable.balance} + ${128}`,
    totalEarned: sql`${masterAccountsTable.totalEarned} + ${128}`,
  }).where(sql`${masterAccountsTable.masterId} = ${m5.id}`);

  await db.insert(finishingEntriesTable).values({
    articleId: art2.id, masterId: m7.id, workerName: "Rashid Finish",
    receivedQty: 30, ratePerPiece: 10, status: "pending",
    date: new Date("2026-04-12"),
  });

  await db.insert(finalStoreReceiptsTable).values({
    articleId: art2.id, receivedBy: "Store Manager", receivedFrom: "Finishing Dept",
    size: "M", packedQty: 20, date: new Date("2026-04-11"),
    notes: "First batch ready for dispatch",
  });

  console.log("Seed complete!");
  console.log("Created: 3 articles with components + accessories, 7 masters, 6 sizes, 2 cutting jobs, 1 stitching job, 1 QC entry, 2 overlock/button entries, 1 finishing entry, 1 store receipt");
  process.exit(0);
}

seed().catch((err: Error) => {
  console.error("Seed error:", err);
  process.exit(1);
});
