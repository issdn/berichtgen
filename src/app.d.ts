// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: import('./auth').SessionValidationResult['user'];
			session: import('./auth').SessionValidationResult['session'];
		}
	}
}

export {};
