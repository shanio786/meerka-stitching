import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { articlesTable } from "./articles";

export const finalStoreReceiptsTable = pgTable("final_store_receipts", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  receivedBy: text("received_by").notNull(),
  receivedFrom: text("received_from").notNull(),
  size: text("size"),
  packedQty: integer("packed_qty").notNull(),
  notes: text("notes"),
  date: timestamp("date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
