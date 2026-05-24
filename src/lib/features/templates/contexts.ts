import { Context } from 'runed';

import type { TemplatesMutationContext } from './types';

export const templatesMutationContext = new Context<TemplatesMutationContext>(
	'templates_mutation'
);
