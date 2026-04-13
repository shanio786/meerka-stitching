import { Router, type IRouter } from "express";
import { eq, sql, and, gte, lte } from "drizzle-orm";
import { db, masterAccountsTable, masterTransactionsTable, masterPaymentsTable, mastersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/accounts", async (_req, res): Promise<void> => {
  const accounts = await db
    .select({
      id: masterAccountsTable.id,
      masterId: masterAccountsTable.masterId,
      masterName: mastersTable.name,
      masterType: mastersTable.masterType,
      machineNo: mastersTable.machineNo,
      balance: masterAccountsTable.balance,
      totalEarned: masterAccountsTable.totalEarned,
      totalPaid: masterAccountsTable.totalPaid,
    })
    .from(masterAccountsTable)
    .leftJoin(mastersTable, eq(masterAccountsTable.masterId, mastersTable.id))
    .orderBy(mastersTable.name);

  res.json(accounts);
});

router.get("/accounts/:masterId/ledger", async (req, res): Promise<void> => {
  const masterId = parseInt(req.params.masterId, 10);
  const { fromDate, toDate } = req.query;

  const conditions = [eq(masterTransactionsTable.masterId, masterId)];
  if (fromDate) conditions.push(gte(masterTransactionsTable.date, new Date(fromDate as string)));
  if (toDate) conditions.push(lte(masterTransactionsTable.date, new Date(toDate as string)));

  const [account] = await db
    .select({
      masterId: masterAccountsTable.masterId,
      masterName: mastersTable.name,
      masterType: mastersTable.masterType,
      balance: masterAccountsTable.balance,
      totalEarned: masterAccountsTable.totalEarned,
      totalPaid: masterAccountsTable.totalPaid,
    })
    .from(masterAccountsTable)
    .leftJoin(mastersTable, eq(masterAccountsTable.masterId, mastersTable.id))
    .where(eq(masterAccountsTable.masterId, masterId));

  const transactions = await db
    .select()
    .from(masterTransactionsTable)
    .where(and(...conditions))
    .orderBy(sql`${masterTransactionsTable.date} DESC`);

  const payments = await db
    .select()
    .from(masterPaymentsTable)
    .where(eq(masterPaymentsTable.masterId, masterId))
    .orderBy(sql`${masterPaymentsTable.date} DESC`);

  res.json({ account, transactions, payments });
});

router.post("/accounts/:masterId/payment", async (req, res): Promise<void> => {
  const masterId = parseInt(req.params.masterId, 10);
  const { amount, paymentMethod, notes, date } = req.body;

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Valid amount is required" });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [payment] = await tx.insert(masterPaymentsTable).values({
      masterId, amount, paymentMethod: paymentMethod || "cash", notes, date: new Date(date || Date.now()),
    }).returning();

    await tx.insert(masterTransactionsTable).values({
      masterId, type: "payment", amount: -amount,
      description: `Payment - ${paymentMethod || "cash"} - ${notes || ""}`.trim(),
    });

    await tx.update(masterAccountsTable).set({
      balance: sql`${masterAccountsTable.balance} - ${amount}`,
      totalPaid: sql`${masterAccountsTable.totalPaid} + ${amount}`,
    }).where(eq(masterAccountsTable.masterId, masterId));

    return payment;
  });

  res.status(201).json(result);
});

export default router;
