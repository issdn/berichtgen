import { db } from '$lib/server/db';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [Google],
	pages: {
		signIn: '/signin',
		signOut: '/signout'
	},
	adapter: DrizzleAdapter(db),
	callbacks: {
		async session({ session, user }) {
			session.userId = user.id;
			return session;
		}
	}
});
