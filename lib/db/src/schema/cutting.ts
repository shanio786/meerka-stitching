import { pgTable, text, serial, timestamp, doublePrecision, integer, pgEnum, date } from "drizzle-orm/pg-core";
import { articlesTable } from "./articles";
import { mastersTable } from "./masters";

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export const cuttingJobsTable = pgTable("cutting_jobs", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  jobDate: timestamp("job_date", { withTimezone: true }).notNull(),
  demandPieces: integer("demand_pieces"),
  status: jobStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const handoverStatusEnum = pgEnum("handover_status", [
  "with_cutter",
  "returned_to_store",
  "received_by_next",
]);

export const cuttingAssignmentsTable = pgTable("cutting_assignments", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => cuttingJobsTable.id, { onDelete: "cascade" }),
  masterId: integer("master_id").notNull().references(() => mastersTable.id),
  componentName: text("component_name").notNull(),
  fabricType: text("fabric_type"),
  fabricGivenMeters: doublePrecision("fabric_given_meters").notNull(),
  fabricPerPiece: doublePrecision("fabric_per_piece"),
  estimatedPieces: integer("estimated_pieces"),
  ratePerPiece: doublePrecision("rate_per_piece"),
  ratePerSuit: doublePrecision("rate_per_suit"),
  status: jobStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  assignedDate: timestamp("assigned_date", { withTimezone: true }).notNull().defaultNow(),
  completedDate: timestamp("completed_date", { withTimezone: true }),
  piecesCut: integer("pieces_cut"),
  wasteMeters: doublePrecision("waste_meters"),
  fabricReturnedMeters: doublePrecision("fabric_returned_meters"),
  totalAmount: doublePrecision("total_amount"),
  piecesConsumed: integer("pieces_consumed").notNull().default(0),
  handoverStatus: handoverStatusEnum("handover_status").notNull().default("with_cutter"),
  receivedBy: text("received_by"),
  handoverDate: timestamp("handover_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cuttingSizeBreakdownTable = pgTable("cutting_size_breakdown", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => cuttingAssignmentsTable.id, { onDelete: "cascade" }),
  size: text("size").notNull(),
  quantity: integer("quantity").notNull(),
  completedQty: integer("completed_qty").default(0),
});
