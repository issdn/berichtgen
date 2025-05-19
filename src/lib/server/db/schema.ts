import { authUsers } from 'drizzle-orm/supabase';

import { integer, pgTable, text, primaryKey, numeric, uuid, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm/sql';

export const llmProviders = pgTable('llmProvider', {
	id: uuid('id').primaryKey().notNull(),
	name: text('name').notNull(),
	url: text('url').notNull(),
	owner: text('owner').notNull(),
	price: numeric('price', { precision: 5, scale: 2 }).notNull()
}).enableRLS();

export const usersLLMProviders = pgTable(
	'userLLMProvider',
	{
		userId: uuid('userId')
			.notNull()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		providerId: uuid('providerId')
			.notNull()
			.references(() => llmProviders.id, { onDelete: 'cascade' }),
		token: text('token')
	},
	(t) => [primaryKey({ columns: [t.userId, t.providerId] })]
).enableRLS();

export const usersTokens = pgTable(
	'userTokenCount',
	{
		userId: uuid('userId')
			.notNull()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		tokens: integer('tokens').notNull().default(0)
	},
	(t) => [primaryKey({ columns: [t.userId] })]
).enableRLS();

export const cart = pgTable(
	'cart',
	{
		userId: uuid('userId')
			.notNull()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		intentId: text().notNull(),
		quantity: integer('quantity').notNull().default(1),
		createdAt: timestamp({ mode: 'date' }).default(sql`now()`)
	},
	(t) => [primaryKey({ columns: [t.userId] })]
).enableRLS();
