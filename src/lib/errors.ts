import {
	CompletionExceptionType,
	GenAIErrorCode,
	***REMOVED***ErrorType,
	OpenaAIErrorCode
} from '$src/lib/enums';
import * as genai from '@google/genai';
import { error } from '@sveltejs/kit';
import OpenAI from 'openai';
import { ZodError } from 'zod';

export class CompletionException extends Error {
	constructor(
		message: string,
		public type: CompletionExceptionType
	) {
		super(message);
	}

	public toResponse() {
		return error(500, { type: this.type, message: this.message });
	}

	static fromUnknown(error: unknown) {
		if (error instanceof genai.ApiError) {
			const code = genAIErrorCodeToCompletionExceptionType(error.status);
			const message = errorCodeToMessage(code);
			return new CompletionException(message, code);
		} else if (error instanceof OpenAI.APIError) {
			const code = openAIErrorCodeToCompletionExceptionType(error.status ?? 0);
			const message = errorCodeToMessage(code);
			return new CompletionException(message, code);
		} else if (error instanceof Error) {
			return new CompletionException(
				errorCodeToMessage(CompletionExceptionType.UNKNOWN_THIRD_PARTY_ERROR),
				CompletionExceptionType.UNKNOWN_THIRD_PARTY_ERROR
			);
		} else {
			return new CompletionException(
				'Ein unbekannter Fehler ist aufgetreten.',
				CompletionExceptionType.INTERNAL
			);
		}
	}
}

export class ***REMOVED***Error extends Error {
	public type: ***REMOVED***ErrorType;

	constructor(type: ***REMOVED***ErrorType, message: string) {
		super(message);
		this.type = type;
	}

	static fromUnknown(
		e: unknown,
		message: string,
		type: ***REMOVED***ErrorType = ***REMOVED***ErrorType.DEVELOPERS_FAULT
	) {
		if (e instanceof ZodError) {
			return new ***REMOVED***Error(type, `Validierungsfehler: ${e.errors[0].message}`);
		} else if (e instanceof Error) {
			return new ***REMOVED***Error(type, e.message);
		}
		return new ***REMOVED***Error(type, message);
	}
}

function errorCodeToMessage(code: CompletionExceptionType) {
	switch (code) {
		case CompletionExceptionType.INVALID_TOKEN:
			return 'Dein API-Key ist falsch.';
		case CompletionExceptionType.UNKNOWN_THIRD_PARTY_ERROR:
			return 'Ein unbekannter Fehler beim LLM-Anbieter ist aufgetreten.';
		case CompletionExceptionType.INTERNAL:
			return 'Ein interner Serverfehler beim LLM-Anbieter ist aufgetreten.';
		case CompletionExceptionType.TOO_MANY_REQUESTS:
			return 'Sie sind nicht autorisiert, diese Anfrage zu stellen. Bitte überprüfen Sie Ihre Berechtigungen.';
		case CompletionExceptionType.TOKEN_EXPIRED:
			return 'Dein API-Key ist abgelaufen.';
		default:
			return 'Ein unbekannter Fehler beim LLM-Anbieter ist aufgetreten.';
	}
}

function openAIErrorCodeToCompletionExceptionType(code: number) {
	switch (code) {
		case OpenaAIErrorCode.BadRequestError:
			return CompletionExceptionType.INVALID_TOKEN;
		case OpenaAIErrorCode.PermissionDeniedError:
			return CompletionExceptionType.INVALID_TOKEN;
		case OpenaAIErrorCode.RateLimitError:
			return CompletionExceptionType.TOO_MANY_REQUESTS;
		default:
			return CompletionExceptionType.UNKNOWN_THIRD_PARTY_ERROR;
	}
}

function genAIErrorCodeToCompletionExceptionType(code: number) {
	switch (code) {
		case GenAIErrorCode.INVALID_ARGUMENT:
			return CompletionExceptionType.INVALID_TOKEN;
		case GenAIErrorCode.PERMISSION_DENIED:
			return CompletionExceptionType.TOKEN_EXPIRED;
		case GenAIErrorCode.RESOURCE_EXHAUSTED:
			return CompletionExceptionType.TOO_MANY_REQUESTS;
		default:
			return CompletionExceptionType.UNKNOWN_THIRD_PARTY_ERROR;
	}
}
