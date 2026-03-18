import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { throwSvelteError, ECompletionException } from '$lib/errors';

const redis = Redis.fromEnv();

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
