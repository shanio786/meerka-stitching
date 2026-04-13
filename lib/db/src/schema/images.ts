import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const imagesTable = pgTable("images", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  sizeBytes: integer("size_bytes"),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
