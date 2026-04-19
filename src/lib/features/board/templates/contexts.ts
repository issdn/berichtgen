import { createContext } from 'svelte';
import type { TemplatesMutationContext } from './types';

export const [getTemplatesMutationContext, setTemplatesMutationContext] =
	createContext<TemplatesMutationContext>();
