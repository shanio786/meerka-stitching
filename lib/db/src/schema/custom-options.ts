import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const customOptionsTable = pgTable("custom_options", {
  id: serial("id").primaryKey(),
  optionType: text("option_type").notNull(),
  optionValue: text("option_value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
