import { sequence } from '@sveltejs/kit/hooks';
import * as Sentry from '@sentry/sveltekit';
import { handle as handleAuth } from './auth';

Sentry.init({
	dsn: 'https://0bf253098410971***REMOVED***721601bcddda16@o4509192225816576.ingest.de.sentry.io/4509192227258448',
	tracesSampleRate: 1
});

export const handleError = Sentry.handleErrorWithSentry();
export const handle = sequence(Sentry.sentryHandle(), handleAuth);
