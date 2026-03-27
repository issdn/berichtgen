import z from 'zod';

export const emailSchema = z.object({
	mail: z.email('Bitte eine gültige Email-Adresse eingeben')
});

export const debugLoginSchema = z.object({
	email: z.email('Bitte eine gültige E-Mail-Adresse eingeben'),
	password: z.string().min(1, 'Passwort darf nicht leer sein')
});
