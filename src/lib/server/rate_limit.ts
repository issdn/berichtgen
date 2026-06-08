import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { ECommonServerError } from '$lib/errors';
import { errResult, okResult, tryResultAsync } from '$lib/result';
import { svelteApiError } from '$lib/server/errors';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type RateLimitPolicyId =
	| 'append-consent-log'
	| 'report-template'
	| 'submit-batch-completion'
	| 'submit-feedback'
	| 'update-payment-intent'
	| 'upload-template'
	| 'wizard-gcs-upload';

type RateLimitPolicy = {
	limit: number;
	name: string;
	window: `${number} ${'d' | 'h' | 'm' | 's'}`;
};

const RATE_LIMIT_POLICIES: Record<RateLimitPolicyId, RateLimitPolicy> = {
	'append-consent-log': {
		limit: 20,
		name: 'Einwilligungsaenderung',
		window: '10 m'
	},
	'report-template': {
		limit: 5,
		name: 'Vorlagen-Meldung',
		window: '1 h'
	},
	/// 250 files per 10 mins
	'submit-batch-completion': {
		limit: 25,
		name: 'KI-Verarbeitung',
		window: '10 m'
	},
	'submit-feedback': {
		limit: 5,
		name: 'Feedback',
		window: '1 h'
	},
	'update-payment-intent': {
		limit: 30,
		name: 'Kaufaktualisierung',
		window: '5 m'
	},
	'upload-template': {
		limit: 10,
		name: 'Vorlagen-Upload',
		window: '10 m'
	},
	'wizard-gcs-upload': {
		limit: 25,
		name: 'Datei-Upload',
		window: '1 m'
	}
};

let redis: null | Redis = null;
const ratelimits = new Map<RateLimitPolicyId, Ratelimit>();

function getRedis(): null | Redis {
	const token = env.UPSTASH_REDIS_REST_TOKEN;
	const url = env.UPSTASH_REDIS_REST_URL;

	if (!token || !url) return null;
	if (redis) return redis;

	redis = new Redis({ token, url });
	return redis;
}

function getRatelimit({
	policyId
}: {
	policyId: RateLimitPolicyId;
}): null | Ratelimit {
	const existing = ratelimits.get(policyId);
	if (existing) return existing;

	const client = getRedis();
	if (!client) return null;

	const policy = RATE_LIMIT_POLICIES[policyId];
	const ratelimit = new Ratelimit({
		analytics: true,
		limiter: Ratelimit.slidingWindow(policy.limit, policy.window),
		prefix: `berichtgen:ratelimit:${policyId}`,
		redis: client
	});
	ratelimits.set(policyId, ratelimit);
	return ratelimit;
}

function buildRateLimitCause({
	policy,
	reset
}: {
	policy: RateLimitPolicy;
	reset: number;
}): string {
	const waitSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
	return `${policy.name} ist voruebergehend begrenzt. Bitte versuche es in ${waitSeconds}s erneut.`;
}

function getRateLimitIdentifier(): string {
	const event = getRequestEvent();
	const forwardedFor = event.request.headers.get('x-forwarded-for');
	const ip =
		forwardedFor?.split(',')[0]?.trim() ||
		event.getClientAddress() ||
		'unknown';
	const userId = event.locals.user?.id;

	return userId ? `user:${userId}:ip:${ip}` : `ip:${ip}`;
}

/**
 * Enforces the configured Upstash rate limit for the current request.
 *
 * If Upstash is not configured, rate limiting is disabled and this returns ok.
 */
async function enforceRateLimit({ policyId }: { policyId: RateLimitPolicyId }) {
	const ratelimit = getRatelimit({ policyId });
	if (!ratelimit) return okResult(undefined);

	const policy = RATE_LIMIT_POLICIES[policyId];
	const limitResult = await tryResultAsync({
		apiError: ECommonServerError.INTERNAL_ERROR,
		promise: ratelimit.limit(getRateLimitIdentifier())
	});
	if (!limitResult.ok) return limitResult;

	if (limitResult.data.success) return okResult(undefined);

	return errResult({
		...ECommonServerError.TOO_MANY_REQUESTS,
		cause: buildRateLimitCause({
			policy,
			reset: limitResult.data.reset
		})
	});
}

/**
 * Wraps a request-scoped mutation in the configured rate limit.
 */
export async function withRateLimit<T>({
	fn,
	policyId
}: {
	fn: () => Promise<T>;
	policyId: RateLimitPolicyId;
}): Promise<T> {
	const rateLimitResult = await enforceRateLimit({ policyId });
	if (!rateLimitResult.ok) {
		throw svelteApiError(rateLimitResult.error.apiError);
	}

	return fn();
}
