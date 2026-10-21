import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const aiVideoWorkflows = sqliteTable(
  "ai_video_workflows",
  {
    id: text("id").primaryKey().notNull(),
    title: text("title").notNull(),
    state: text("state").notNull(),
    payload: text("payload").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("ai_video_workflows_updated_at_idx").on(table.updatedAt)],
);
