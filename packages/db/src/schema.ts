import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const systemMetadata = pgTable('system_metadata', {
  key: text().primaryKey(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .notNull()
    .defaultNow(),
  value: text().notNull(),
});
