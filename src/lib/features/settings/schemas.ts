import z from 'zod';

export const profileNameSchema = z.object({
	fullName: z
		.string()
		.max(256, { message: 'Max 256 Zeichen' })
		.nullable()
		.optional()
});

export type ProfileNameSchema = typeof profileNameSchema;

export const userMetadataSchema = z.object({
	fullName: z
		.string()
		.max(256, { message: 'Max 256 Zeichen' })
		.nullable()
		.optional(),
	ausbildungsberuf: z
		.string()
		.max(256, { message: 'Max 256 Zeichen' })
		.nullable()
		.optional(),
	abteilung: z
		.string()
		.max(256, { message: 'Max 256 Zeichen' })
		.nullable()
		.optional()
});

export type UserMetadataSchema = typeof userMetadataSchema;
