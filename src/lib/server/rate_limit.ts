import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } from '$env/static/private';
import { throwSvelteError, ECompletionException } from '$lib/errors';

const redis = new Redis({
	url: UPSTASH_REDIS_REST_URL,
	token: UPSTASH_REDIS_REST_TOKEN
});

const rateLimiters: Record<string, Ratelimit> = {
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
};

export async function checkRateLimit(userId: string, pathname: string) {
	const limiter = rateLimiters[pathname];
	if (!limiter) return;
	const { success } = await limiter.limit(userId);
	if (!success) throwSvelteError(ECompletionException.TOO_MANY_REQUESTS);
}
