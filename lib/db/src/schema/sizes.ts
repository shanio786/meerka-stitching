import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";

export const sizesTable = pgTable("sizes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});
