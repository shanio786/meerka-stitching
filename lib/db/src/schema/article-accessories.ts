import { pgTable, text, serial, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { articlesTable } from "./articles";

export const articleAccessoriesTable = pgTable("article_accessories", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  accessoryName: text("accessory_name").notNull(),
  quantity: doublePrecision("quantity").notNull().default(0),
  meters: doublePrecision("meters"),
  ratePerUnit: doublePrecision("rate_per_unit"),
  totalAmount: doublePrecision("total_amount"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertArticleAccessorySchema = createInsertSchema(articleAccessoriesTable).omit({ id: true, createdAt: true });
export type InsertArticleAccessory = z.infer<typeof insertArticleAccessorySchema>;
export type ArticleAccessory = typeof articleAccessoriesTable.$inferSelect;
