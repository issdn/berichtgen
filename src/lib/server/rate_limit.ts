import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';
import { throwSvelteError, ECompletionException } from '$lib/errors';

/** Null when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set — rate limiting is skipped. */
const redis =
	env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
		? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
		: null;

const rateLimiters: Record<string, Ratelimit> | null = redis
	? {
			'/board/user/completion': new Ratelimit({
				redis,
				limiter: Ratelimit.slidingWindow(5, '30 s'),
				prefix: 'rl:completion'
			}),
			'/board/user/kauf/create-payment-intent': new Ratelimit({
				redis,
				limiter: Ratelimit.slidingWindow(5, '60 s'),
				prefix: 'rl:payment'
			})
		}
	: null;

export async function checkRateLimit(userId: string, pathname: string) {
	if (!rateLimiters) return; // rate limiting disabled — Upstash env vars not set
	const limiter = rateLimiters[pathname];
	if (!limiter) return;
	const { success } = await limiter.limit(userId);
	if (!success) throwSvelteError(ECompletionException.TOO_MANY_REQUESTS);
}
