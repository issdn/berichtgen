import { IncuriaError } from '$lib/types';
import { IncuriaErrorType } from '$lib/types';

export function parseUnknownError(
	e: unknown,
	message: string,
	type: IncuriaErrorType = IncuriaErrorType.DEVELOPERS_FAULT
) {
	if (e instanceof Error) {
		return new IncuriaError(type, e.message);
	}
	return new IncuriaError(type, message);
}
