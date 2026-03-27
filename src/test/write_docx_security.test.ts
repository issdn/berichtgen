/**
 * Security tests for write_docx.ts / QuickJS sandbox.
 *
 * Each describe block targets one vulnerability from the security analysis.
 * "vuln" tests reproduce the dangerous behaviour; "fix" tests verify the mitigation.
 */

import { describe, test, expect } from 'vitest';
import { getQuickJS } from 'quickjs-emscripten';
import { buildRunJs, type SandBox } from '$wizard/write/write_docx';

/** Build a minimal valid SandBox for tests. */
function box(code: string, extra: Record<string, unknown> = {}): SandBox {
	return { __code__: code, __result__: undefined, ...extra };
}

// ---------------------------------------------------------------------------
// Vulnerability 1: vm.dispose() called inside runJs callback
// ---------------------------------------------------------------------------
// The original code placed vm.dispose() inside the `finally` of the runJs
// callback.  docx-templates calls runJs once per {{ }} expression, so the VM
// is freed after the very first expression.  Every subsequent call operates on
// a freed WASM object → use-after-free / crash.
// ---------------------------------------------------------------------------
describe('Vuln-1: VM disposed inside runJs callback (use-after-free)', () => {
	test('buggy pattern: second call throws after VM is disposed', async () => {
		const QuickJS = await getQuickJS();
		const vm = QuickJS.newContext();

		// Simulate the original buggy inline runJs (vm.dispose in finally)
		const buggyRunJs = ({ sandbox }: { sandbox: SandBox }) => {
			try {
				const handle = vm.evalCode(sandbox.__code__ as string);
				if (handle.error) {
					const err = vm.dump(handle.error);
					handle.error.dispose();
					throw new Error(String(err));
				}
				const result = vm.dump(handle.value);
				handle.value.dispose();
				return { modifiedSandbox: sandbox, result };
			} finally {
				vm.dispose(); // ← the bug
			}
		};

		// First call: VM is alive → succeeds
		const first = buggyRunJs({ sandbox: box('1 + 1') });
		expect(first.result).toBe(2);

		// Second call: VM already disposed → must throw
		expect(() => buggyRunJs({ sandbox: box('2 + 2') })).toThrow();
	});

	test('fix: buildRunJs supports multiple consecutive calls on the same VM', async () => {
		const QuickJS = await getQuickJS();
		const vm = QuickJS.newContext();
		const injected = new Map<string, string>();
		const runJs = buildRunJs(vm, injected);

		try {
			const first = runJs({ sandbox: box('1 + 1') });
			expect(first.result).toBe(2);

			const second = runJs({ sandbox: box('2 + 2') });
			expect(second.result).toBe(4);

			// Three expressions — same as a template with three {{ }} blocks
			const third = runJs({ sandbox: box('"hello".toUpperCase()') });
			expect(third.result).toBe('HELLO');
		} finally {
			vm.dispose(); // disposed exactly once, after all calls
		}
	});

	test('fix: data injected in call 1 is available in call 2', async () => {
		const QuickJS = await getQuickJS();
		const vm = QuickJS.newContext();
		const injected = new Map<string, string>();
		const runJs = buildRunJs(vm, injected);

		try {
			// Inject `items` in the first call
			runJs({ sandbox: box('items.length', { items: [10, 20, 30] }) });

			// Second call can still read the injected global
			const r = runJs({ sandbox: box('items[0]', { items: [10, 20, 30] }) });
			expect(r.result).toBe(10);
		} finally {
			vm.dispose();
		}
	});
});

// ---------------------------------------------------------------------------
// Vulnerability 2: DoS via infinite loop in a template expression
// ---------------------------------------------------------------------------
// Because noSandbox: true is set, any {{ while(true){} }} expression in a
// DOCX template blocks the WASM thread forever — there is no built-in timeout.
// ---------------------------------------------------------------------------
describe('Vuln-2: DoS via infinite loop in template expression', () => {
	// NOTE: we intentionally do NOT run `while(true){}` without an interrupt
	// handler — it would hang the test runner indefinitely because QuickJS WASM
	// executes synchronously and cannot be interrupted by a JS timer.
	test('vulnerability documented: infinite loop without interrupt handler blocks forever (not executed)', () => {
		// Executing vm.evalCode('while(true){}') on an unguarded VM would freeze
		// the process. The fix is the interrupt handler added in handleDOCXDownload.
		expect(true).toBe(true); // placeholder — do not remove the comment above
	});

	test('fix: interrupt handler terminates infinite loop and throws', async () => {
		const QuickJS = await getQuickJS();
		const vm = QuickJS.newContext();
		const injected = new Map<string, string>();

		// Short deadline for tests (200 ms is plenty)
		const deadline = Date.now() + 200;
		vm.runtime.setInterruptHandler(() => Date.now() > deadline);

		const runJs = buildRunJs(vm, injected);

		try {
			expect(() => runJs({ sandbox: box('while(true){}') })).toThrow();
		} finally {
			vm.dispose();
		}
	});

	test('fix: interrupt handler does not affect normal expressions', async () => {
		const QuickJS = await getQuickJS();
		const vm = QuickJS.newContext();
		const injected = new Map<string, string>();

		const deadline = Date.now() + 5_000; // 5 s — normal budget
		vm.runtime.setInterruptHandler(() => Date.now() > deadline);

		const runJs = buildRunJs(vm, injected);

		try {
			const r = runJs({ sandbox: box('[1,2,3].reduce((a,b)=>a+b,0)') });
			expect(r.result).toBe(6);
		} finally {
			vm.dispose();
		}
	});
});

// ---------------------------------------------------------------------------
// Vulnerability 4: JSON injection via custom toJSON on injected values
// ---------------------------------------------------------------------------
// Data from user-controlled sources is serialised with JSON.stringify and then
// evaluated as `(${json})`.  An object with a toJSON() method that returns a
// code-breaking string could theoretically escape the wrapping parentheses.
// ---------------------------------------------------------------------------
describe('Vuln-4: JSON injection via custom toJSON', () => {
	test('toJSON returning a code-breaking string is neutralised by JSON.stringify quoting', async () => {
		const QuickJS = await getQuickJS();
		const vm = QuickJS.newContext();
		const injected = new Map<string, string>();
		const runJs = buildRunJs(vm, injected);

		// Attempt: toJSON returns a string that would escape `(${json})` wrapping.
		// JSON.stringify wraps the return value of toJSON in quotes, so the eval
		// becomes: (");\nglobalThis.__pwned = true;\n(") — a plain string literal.
		const maliciousValue = {
			toJSON: () => ');\nglobalThis.__pwned = true;\n('
		};

		try {
			const r = runJs({
				sandbox: box('typeof globalThis.__pwned', { evil: maliciousValue })
			});
			// __pwned was never executed — injection was neutralised
			expect(r.result).toBe('undefined');
		} finally {
			vm.dispose();
		}
	});

	test('Object.prototype.toJSON pollution cannot inject code via JSON.stringify', async () => {
		const QuickJS = await getQuickJS();
		const vm = QuickJS.newContext();
		const injected = new Map<string, string>();
		const runJs = buildRunJs(vm, injected);

		// Temporarily pollute Object.prototype.toJSON
		(Object.prototype as Record<string, unknown>).toJSON = () =>
			');\nglobalThis.__polluted = true;\n(';

		try {
			// { value: 42 } will use the polluted toJSON — but the returned string
			// gets JSON-quoted, so it becomes a benign string literal in the VM.
			const r = runJs({
				sandbox: box('typeof globalThis.__polluted', { data: { value: 42 } })
			});
			expect(r.result).toBe('undefined');
		} finally {
			delete (Object.prototype as Record<string, unknown>).toJSON;
			vm.dispose();
		}
	});
});

// ---------------------------------------------------------------------------
// Vulnerability 5: Shared mutable VM state between template expressions
// ---------------------------------------------------------------------------
// All runJs calls share one VM instance.  If a template expression mutates an
// injected global (e.g. berichte.push(...)), the mutation persists in the VM
// for every subsequent expression — because the injected Map skips re-injection
// when the serialised value is unchanged.
// ---------------------------------------------------------------------------
describe('Vuln-5: Shared mutable VM state between template expressions', () => {
	test('mutation of a global in call 1 leaks into call 2 (known behaviour)', async () => {
		const QuickJS = await getQuickJS();
		const vm = QuickJS.newContext();
		const injected = new Map<string, string>();
		const runJs = buildRunJs(vm, injected);

		const data = [1, 2, 3];

		try {
			// Expression 1 mutates the array inside the VM
			runJs({ sandbox: box('data.push(999); data.length', { data }) });

			// Expression 2: the JS-side `data` reference is unchanged, so the
			// injected map skips re-injection.  The VM still holds [1,2,3,999].
			const r = runJs({ sandbox: box('data[data.length - 1]', { data }) });

			// The mutated state leaks: last element is 999, not 3.
			// This test documents the vulnerability; it is expected to pass as-is
			// because the behaviour is inherent to the single-VM-per-report design.
			expect(r.result).toBe(999);
		} finally {
			vm.dispose();
		}
	});

	test('re-injecting changed data resets the VM global', async () => {
		const QuickJS = await getQuickJS();
		const vm = QuickJS.newContext();
		const injected = new Map<string, string>();
		const runJs = buildRunJs(vm, injected);

		const original = [1, 2, 3];
		const updated = [1, 2, 3]; // different reference, same JSON — still skipped!
		const fresh = [7, 8, 9]; // different JSON → will be re-injected

		try {
			runJs({
				sandbox: box('data.push(999); data.length', { data: original })
			});

			// Same JSON as original → NOT re-injected → VM still has [1,2,3,999]
			const r1 = runJs({
				sandbox: box('data[data.length-1]', { data: updated })
			});
			expect(r1.result).toBe(999); // mutation persists

			// Different JSON → IS re-injected → VM global is reset
			const r2 = runJs({ sandbox: box('data[0]', { data: fresh }) });
			expect(r2.result).toBe(7); // clean state after re-injection
		} finally {
			vm.dispose();
		}
	});
});
