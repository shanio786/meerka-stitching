import { pgTable, text, serial, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { articlesTable } from "./articles";
import { mastersTable } from "./masters";
import { jobStatusEnum } from "./cutting";

export const finishingEntriesTable = pgTable("finishing_entries", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  masterId: integer("master_id").references(() => mastersTable.id),
  workerName: text("worker_name").notNull(),
  componentName: text("component_name"),
  size: text("size"),
  receivedFrom: text("received_from"),
  receivedQty: integer("received_qty").notNull(),
  packedQty: integer("packed_qty").notNull().default(0),
  wasteQty: integer("waste_qty").notNull().default(0),
  wasteReason: text("waste_reason"),
  ratePerPiece: doublePrecision("rate_per_piece"),
  totalAmount: doublePrecision("total_amount"),
  status: jobStatusEnum("status").notNull().default("pending"),
  receivedBy: text("received_by"),
  notes: text("notes"),
  date: timestamp("date", { withTimezone: true }).notNull(),
  completedDate: timestamp("completed_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
