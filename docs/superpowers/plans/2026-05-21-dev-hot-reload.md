# Dev Hot Reload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a development hot-reload flow so changes in the spec studio UI, scripts, and `src` files automatically refresh the browser and keep the local workflow responsive.

**Architecture:** Add a tiny SSE-based reload channel to the existing Node dev server in `tools/spec-studio/server.mjs`, backed by a small file-watcher helper that watches the app shell, scripts, and `src` tree. The browser client in `tools/spec-studio/public/app.js` will open a single `EventSource` connection and reload the page whenever it receives a reload event. This keeps the implementation dependency-free, does not replace Remotion's own watcher, and keeps the feature focused on the unified local app.

**Tech Stack:** Node.js, `fs.watch`, Server-Sent Events, browser `EventSource`, vanilla ES modules, Remotion.

---

### Task 1: Add a reusable file watcher and reload broadcaster

**Files:**
- Create: `tools/spec-studio/dev-reload.mjs`
- Create: `tools/spec-studio/dev-reload.test.mjs`

- [ ] **Step 1: Write the failing tests**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { createDevReloadBroadcaster } from "./dev-reload.mjs";

test("queues a reload notification when a watched path changes", async () => {
	const broadcaster = createDevReloadBroadcaster({
		watchPaths: ["/tmp/project/tools/spec-studio/public/app.js"],
	});

	const messages = [];
	const client = broadcaster.connect({
		send: (event) => messages.push(event),
	});

	broadcaster.emitChange("/tmp/project/tools/spec-studio/public/app.js");
	await new Promise((resolve) => setTimeout(resolve, 20));

	assert.deepEqual(messages, ["reload"]);
	client.close();
	broadcaster.close();
});

test("ignores changes outside watched paths", async () => {
	const broadcaster = createDevReloadBroadcaster({
		watchPaths: ["/tmp/project/tools/spec-studio/public/app.js"],
	});

	const messages = [];
	const client = broadcaster.connect({
		send: (event) => messages.push(event),
	});

	broadcaster.emitChange("/tmp/project/src/index.ts");
	await new Promise((resolve) => setTimeout(resolve, 20));

	assert.deepEqual(messages, []);
	client.close();
	broadcaster.close();
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```bash
npx tsx --test tools/spec-studio/dev-reload.test.mjs
```

Expected: fail because the broadcaster module does not exist yet.

- [ ] **Step 3: Implement the minimal broadcaster**

```javascript
import path from "node:path";

export function createDevReloadBroadcaster({ watchPaths }) {
	const clients = new Set();
	let debounceTimer = null;
	const normalizedWatchPaths = watchPaths.map((watchPath) => path.resolve(watchPath));

	return {
		connect(client) {
			clients.add(client);
			return {
				close() {
					clients.delete(client);
				},
			};
		},
		emitChange(changedPath) {
			if (!normalizedWatchPaths.some((watchPath) => pathMatches(watchPath, changedPath))) {
				return;
			}

			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}

			debounceTimer = setTimeout(() => {
				for (const client of clients) {
					client.send("reload");
				}
			}, 50);
		},
		close() {
			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}
			clients.clear();
		},
	};
}

function pathMatches(watchPath, changedPath) {
	const normalizedWatch = path.resolve(watchPath);
	const normalizedChanged = path.resolve(changedPath);
	return normalizedChanged === normalizedWatch || normalizedChanged.startsWith(`${normalizedWatch}${path.sep}`);
}
```

- [ ] **Step 4: Run the tests again and confirm they pass**

Run:

```bash
npx tsx --test tools/spec-studio/dev-reload.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit the watcher helper**

```bash
git add tools/spec-studio/dev-reload.mjs tools/spec-studio/dev-reload.test.mjs
git commit -m "feat: add dev reload broadcaster"
```

### Task 2: Wire the dev server to SSE reload events

**Files:**
- Modify: `tools/spec-studio/server.mjs`
- Create: `tools/spec-studio/server.test.mjs`

- [ ] **Step 1: Write the failing server test**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";

test("serves the live reload SSE endpoint", async () => {
	const proc = spawn("node", ["tools/spec-studio/server.mjs"], {
		env: {
			...process.env,
			SPEC_STUDIO_PORT: "3219",
			REMOTION_STUDIO_URL: "http://127.0.0.1:3000",
		},
	});

	await once(proc.stdout, "data");
	const response = await fetch("http://127.0.0.1:3219/api/live-reload");

	assert.equal(response.headers.get("content-type")?.includes("text/event-stream"), true);

	proc.kill("SIGTERM");
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
npx tsx --test tools/spec-studio/server.test.mjs
```

Expected: fail because `/api/live-reload` does not exist yet.

- [ ] **Step 3: Implement the SSE endpoint and watcher hookup**

```javascript
import { createDevReloadBroadcaster } from "./dev-reload.mjs";

const devReload = createDevReloadBroadcaster({
	watchPaths: [
		path.join(projectRoot, "tools", "spec-studio", "public"),
		path.join(projectRoot, "scripts"),
		path.join(projectRoot, "src"),
		path.join(projectRoot, "package.json"),
	],
});

if (method === "GET" && url.pathname === "/api/live-reload") {
	res.writeHead(200, {
		"Content-Type": "text/event-stream; charset=utf-8",
		"Cache-Control": "no-cache, no-transform",
		Connection: "keep-alive",
	});
	res.write("retry: 1000\n\n");
	const client = devReload.connect({
		send(event) {
			res.write(`event: ${event}\n`);
			res.write(`data: ${Date.now()}\n\n`);
		},
	});
	req.on("close", () => client.close());
	return;
}
```

Also add a small helper in `server.mjs` that starts `fs.watch` on the configured paths, normalizes path events, and forwards them to `devReload.emitChange(...)`.

- [ ] **Step 4: Run the server test and a manual smoke check**

Run:

```bash
npx tsx --test tools/spec-studio/server.test.mjs
```

Expected: PASS.

Then manually confirm:

```bash
npm run dev
```

Expected: opening `/api/live-reload` keeps the connection open and the server starts the watcher without crashing.

- [ ] **Step 5: Commit the server integration**

```bash
git add tools/spec-studio/server.mjs tools/spec-studio/server.test.mjs
git commit -m "feat: wire dev server live reload"
```

### Task 3: Make the browser auto-reload on change

**Files:**
- Create: `tools/spec-studio/public/live-reload.mjs`
- Create: `tools/spec-studio/public/live-reload.test.mjs`
- Modify: `tools/spec-studio/public/app.js`
- Modify: `tools/spec-studio/public/index.html`
- Modify: `tools/spec-studio/public/styles.css`

- [ ] **Step 1: Write the failing helper test**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { shouldReloadOnEvent } from "./live-reload.mjs";

test("reloads only on the reload event", () => {
	assert.equal(shouldReloadOnEvent("reload"), true);
	assert.equal(shouldReloadOnEvent("ping"), false);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
npx tsx --test tools/spec-studio/public/live-reload.test.mjs
```

Expected: fail because the helper does not exist yet.

- [ ] **Step 3: Implement the browser helper and wire EventSource**

```javascript
export function shouldReloadOnEvent(eventName) {
	return eventName === "reload";
}

export function connectDevReload(onReload) {
	if (!window.EventSource) {
		return () => {};
	}

	const source = new EventSource("/api/live-reload");
	source.addEventListener("reload", () => onReload());
	source.onerror = () => {
		source.close();
		window.setTimeout(() => connectDevReload(onReload), 1000);
	};

	return () => source.close();
}
```

Call it from `app.js` during boot so the current page auto-reloads when the server announces a change. Keep the reload logic disabled if `window.EventSource` is not available.

- [ ] **Step 4: Verify in browser**

Run:

```bash
npm run dev
```

Expected:
- Editing `tools/spec-studio/public/*.mjs` or `public/*.css` reloads the page automatically.
- Editing `scripts/*.mjs` or `src/*.ts` also triggers a browser refresh.
- Remotion preview comes back after refresh without manual reload.

- [ ] **Step 5: Commit the client change**

```bash
git add tools/spec-studio/public/app.js tools/spec-studio/public/index.html tools/spec-studio/public/styles.css tools/spec-studio/public/live-reload.mjs tools/spec-studio/public/live-reload.test.mjs
git commit -m "feat: add browser live reload"
```

### Task 4: Update docs and verify end-to-end

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the README development section**

```markdown
## 开发热更新

运行 `npm run dev` 时，统一工作台会自动监听 `public/`、`scripts/` 和 `src/` 的改动，并在浏览器里自动刷新。
```

- [ ] **Step 2: Run the full verification suite**

Run:

```bash
npm run lint
npx tsx --test tools/spec-studio/dev-reload.test.mjs tools/spec-studio/server.test.mjs tools/spec-studio/public/live-reload.test.mjs scripts/ai-spec-lib.test.mjs tools/spec-studio/public/request-builder.test.mjs tools/spec-studio/public/app-routes.test.mjs
```

Expected: all tests pass and lint stays clean.

- [ ] **Step 3: Smoke test the workflow**

Run:

```bash
npm run dev
```

Expected:
- The browser refreshes after a `public/`, `scripts/`, or `src/` edit.
- The spec studio still loads and the Remotion preview still works.

- [ ] **Step 4: Commit the docs update**

```bash
git add README.md
git commit -m "docs: describe dev hot reload"
```

