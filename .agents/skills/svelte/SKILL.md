---
name: svelte
description: A skill for working with svelte or sveltekit on this project.
---

Rules:
- Comment your code well with JSDoc comments.
- Use clean typescript (no any, only use unknown if you have to).
- Use newest sveltekit features and best practices.
- Try to unit test all of your code with vitest.
- Try to write declarative code using SOLID principles.
- If you need to make a change to the database, make sure to also update the types in src/lib/db/schema.ts and run the migration generator to create a new migration file.
- This app is in development so don't create new migrations and just update the initial one.
- Breaking changes are also allowed.
- Use shadcn-svelte components ONLY.
- All client-facing text should be in German.

Repo-specific info:
- There are global files for types - src\lib\types.ts, form schemas - src\lib\schemas.ts, enums - src\lib\enums.ts and errors - src\lib\errors.ts. Use these files to avoid duplication and keep things consistent. 