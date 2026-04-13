import { pgTable, text, serial, timestamp, doublePrecision, integer, pgEnum } from "drizzle-orm/pg-core";
import { mastersTable } from "./masters";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "earning",
  "payment",
  "adjustment",
]);

export const masterAccountsTable = pgTable("master_accounts", {
  id: serial("id").primaryKey(),
  masterId: integer("master_id").notNull().references(() => mastersTable.id, { onDelete: "cascade" }).unique(),
  balance: doublePrecision("balance").notNull().default(0),
  totalEarned: doublePrecision("total_earned").notNull().default(0),
  totalPaid: doublePrecision("total_paid").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const masterTransactionsTable = pgTable("master_transactions", {
  id: serial("id").primaryKey(),
  masterId: integer("master_id").notNull().references(() => mastersTable.id, { onDelete: "cascade" }),
  type: transactionTypeEnum("type").notNull(),
  amount: doublePrecision("amount").notNull(),
  referenceType: text("reference_type"),
  referenceId: integer("reference_id"),
  description: text("description").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const masterPaymentsTable = pgTable("master_payments", {
  id: serial("id").primaryKey(),
  masterId: integer("master_id").notNull().references(() => mastersTable.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  notes: text("notes"),
  date: timestamp("date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
