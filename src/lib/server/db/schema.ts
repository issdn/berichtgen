import { authUsers } from 'drizzle-orm/supabase';

import { integer, pgTable, text, primaryKey, numeric, uuid } from 'drizzle-orm/pg-core';

export const llmProviders = pgTable('llmProvider', {
	id: uuid('id').primaryKey().notNull(),
	name: text('name').notNull(),
	url: text('url').notNull(),
	owner: text('owner').notNull(),
	price: numeric('price', { precision: 5, scale: 2 }).notNull()
});

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
);

export const usersTokens = pgTable(
	'userTokenCount',
	{
		userId: uuid('userId')
			.notNull()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		tokens: integer('tokens').notNull().default(0)
	},
	(t) => [primaryKey({ columns: [t.userId] })]
);
