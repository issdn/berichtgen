---
name: svelte-new
description: This documents how to use the new Svelte 5 features.
---


Asynchronous Primitives and Native Await
The await keyword is now valid at the top level of the <script> block, inside $derived runes, and directly within markup.

Synchronized Updates: To prevent "UI tearing," Svelte buffers state updates until associated await expressions resolve, ensuring the entire UI updates atomically.

Concurrency Models: await expressions in markup execute in parallel by default to optimize performance, whereas those in script blocks follow standard sequential JavaScript semantics.

Settled State: The settled() utility returns a promise that resolves only after all pending state changes, subsequent asynchronous work, and DOM updates have finalized.

SvelteKit Remote Functions
Remote functions (.remote files) provide a type-safe server-client communication protocol using the devalue library to serialize complex types like Date, Map, and Set.

Functional Flavors: Developers utilize query for reading dynamic data, form for progressively enhanced mutations, command for JavaScript-only side effects, and prerender for build-time static data.

Batching (N+1 Solution): The query.batch API collects individual calls within a single macrotask into a single server request, requiring a server-side handler that returns a mapping function for result distribution.

Validation: Strict input validation via "Standard Schema" libraries (Zod, Valibot) is mandatory to secure the generated public HTTP endpoints.

Error Isolation and SSR Resilience
The <svelte:boundary> component isolates rendering and effect errors, replacing failed content with a failed snippet that provides a reset function for recovery.

Lifecycle Snippets: The pending snippet displays only during initial boundary creation; subsequent asynchronous updates are tracked via the $effect.pending() rune.

SSR Serialization: The transformError function enables error boundaries during server-side rendering by redacting sensitive data and returning a JSON-stringifiable object for client hydration.

Hydratable Data: The hydratable() API prevents redundant client-side re-fetching of SSR'd data by stashing serialized results in the document head.