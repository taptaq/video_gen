# Mode Switch Prompt Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit two-mode workflow so the studio can generate either from long-form copy or from structured fields, with different prompt assembly for each path.

**Architecture:** Keep the existing `/api/ideate` and `/api/generate` endpoints, but thread a normalized `mode` through the request context. In `scripts/ai-spec-lib.mjs`, split prompt generation into mode-specific branches so `long-copy` emphasizes extraction from raw prose while `structured` treats the fields as the primary contract. In the spec studio, add a visible mode toggle that controls which inputs are emphasized, and forward the selected mode without changing the Remotion spec shape.

**Tech Stack:** Node.js, `node:test`, browser-native ES modules, vanilla HTML/CSS/JS, Remotion.

---

### Task 1: Make prompt assembly mode-aware in the AI library

**Files:**
- Modify: `scripts/ai-spec-lib.mjs`
- Create: `scripts/ai-spec-lib.test.mjs`

- [ ] **Step 1: Write the failing tests**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import {
	buildIdeationSystemPrompt,
	buildRequestContext,
	buildSpecSystemPrompt,
	buildSpecUserPrompt,
	parseGeneratorInput,
} from "./ai-spec-lib.mjs";

test("defaults to long-copy mode when no mode is provided", () => {
	const parsed = parseGeneratorInput({
		prompt: "这是一段小红书长文案。",
	});
	const context = buildRequestContext(parsed);

	assert.equal(context.mode, "long-copy");
	assert.equal(context.rawPrompt, "这是一段小红书长文案。");
});

test("structured mode prompt says fields take priority", () => {
	assert.match(buildSpecSystemPrompt("structured"), /字段优先/);
	assert.match(buildIdeationSystemPrompt("structured"), /字段优先/);
});

test("long-copy mode prompt tells the model to extract structure from copy first", () => {
	const context = buildRequestContext(
		parseGeneratorInput({
			mode: "long-copy",
			prompt: "这是一段很长的原文，里面已经有完整表达。",
			topic: "冷萃咖啡",
		}),
	);

	const userPrompt = buildSpecUserPrompt(context);

	assert.match(userPrompt, /先从原文中提炼/);
	assert.match(userPrompt, /长文案/);
});
```

- [ ] **Step 2: Run the tests and confirm they fail for the right reason**

Run:

```bash
npx tsx --test scripts/ai-spec-lib.test.mjs
```

Expected: the test file fails because `mode` is not yet parsed and the prompt builders are not yet mode-aware.

- [ ] **Step 3: Implement the minimal mode plumbing and prompt branching**

```javascript
export function normalizeMode(value) {
	return value === "structured" ? "structured" : "long-copy";
}

export function parseGeneratorInput(input) {
	return {
		prompt: typeof input.prompt === "string" ? input.prompt.trim() : "",
		topic: normalizeOptionalString(input.topic),
		audience: normalizeOptionalString(input.audience),
		platform: normalizeOptionalString(input.platform),
		tone: normalizeOptionalString(input.tone),
		goal: normalizeOptionalString(input.goal),
		mode: normalizeMode(input.mode),
		mustInclude: normalizeStringArray(input.mustInclude),
		avoid: normalizeStringArray(input.avoid),
		provider: normalizeOptionalString(input.provider),
		model: normalizeOptionalString(input.model),
	};
}

export function buildRequestContext(parsedInput) {
	const promptText = parsedInput.prompt ?? "";
	const slugSource = (parsedInput.topic ?? promptText)
		.split("\n")
		.find((line) => line.trim().length > 0)
		?.slice(0, 48) ?? "ai-generated-spec";

	return {
		rawPrompt: promptText,
		topic: parsedInput.topic,
		audience: parsedInput.audience,
		platform: parsedInput.platform,
		tone: parsedInput.tone,
		goal: parsedInput.goal,
		mode: normalizeMode(parsedInput.mode),
		mustInclude: parsedInput.mustInclude,
		avoid: parsedInput.avoid,
		defaultId: slugSource,
	};
}

export function buildSpecSystemPrompt(mode) {
	const sharedRules = [
		"You are generating both a creative brief and structured JSON for a Remotion knowledge-video template.",
		"Return valid JSON only.",
		"Do not wrap the JSON in markdown fences.",
		"Generate concise, platform-ready Chinese copy for a 9:16 short-form educational video.",
	];

	const longCopyRules = [
		"Mode: long-copy.",
		"Treat the raw prompt as the source of truth.",
		"先从原文中提炼主题、受众、卖点、语气和节奏，再落到 JSON。",
	];

	const structuredRules = [
		"Mode: structured.",
		"字段优先，用户给出的结构化字段是主要约束。",
		"Only infer the missing pieces, and keep the user's fields stable.",
	];

	return [...sharedRules, mode === "structured" ? structuredRules : longCopyRules].flat().join("\n");
}

export function buildIdeationSystemPrompt(mode) {
	const sharedRules = [
		"You are helping ideate short-form knowledge video directions before final script generation.",
		"Return valid JSON only.",
		"Do not wrap the JSON in markdown fences.",
	];

	const longCopyRules = [
		"Mode: long-copy.",
		"先从原文中提炼出 3 个不同的方向，强调提炼而不是重写。",
	];

	const structuredRules = [
		"Mode: structured.",
		"字段优先，围绕用户给出的主题、受众、平台、语气和目标做收束。",
	];

	return [...sharedRules, mode === "structured" ? structuredRules : longCopyRules].flat().join("\n");
}

export function buildSpecUserPrompt(requestContext) {
	const structuredHints = [
		requestContext.topic ? `- topic: ${requestContext.topic}` : null,
		requestContext.audience ? `- audience: ${requestContext.audience}` : null,
		requestContext.platform ? `- platform: ${requestContext.platform}` : null,
		requestContext.tone ? `- tone: ${requestContext.tone}` : null,
		requestContext.goal ? `- goal: ${requestContext.goal}` : null,
		requestContext.mustInclude?.length
			? `- mustInclude: ${requestContext.mustInclude.join(" / ")}`
			: null,
		requestContext.avoid?.length ? `- avoid: ${requestContext.avoid.join(" / ")}` : null,
	]
		.filter(Boolean)
		.join("\n");

	return [
		"Generate one complete JSON object for the following video request.",
		requestContext.mode === "structured"
			? "字段优先，先把用户给出的结构化信息落进去，再补齐缺失部分。"
			: "先从原文中提炼出创作结构，再把结构映射到 JSON。",
		structuredHints ? "\nStructured hints:\n" + structuredHints : "",
		"",
		"Natural-language request:",
		requestContext.rawPrompt || "(No extra prompt provided. Rely on the structured hints.)",
	].join("\n");
}
```

- [ ] **Step 4: Run the tests again and confirm the new mode behavior passes**

Run:

```bash
npx tsx --test scripts/ai-spec-lib.test.mjs
```

Expected: PASS, with the prompt strings clearly different for `long-copy` and `structured`.

- [ ] **Step 5: Commit the library change**

```bash
git add scripts/ai-spec-lib.mjs scripts/ai-spec-lib.test.mjs
git commit -m "feat: add mode-aware prompt assembly"
```

### Task 2: Add the mode toggle and request builder in the spec studio

**Files:**
- Create: `tools/spec-studio/public/request-builder.mjs`
- Create: `tools/spec-studio/public/request-builder.test.mjs`
- Modify: `tools/spec-studio/public/index.html`
- Modify: `tools/spec-studio/public/app.js`
- Modify: `tools/spec-studio/public/styles.css`

- [ ] **Step 1: Write the failing tests for the pure request builder**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import {
	buildGeneratePayload,
	normalizeMode,
} from "./request-builder.mjs";

test("normalizeMode defaults unknown values to long-copy", () => {
	assert.equal(normalizeMode(), "long-copy");
	assert.equal(normalizeMode("anything-else"), "long-copy");
	assert.equal(normalizeMode("structured"), "structured");
});

test("buildGeneratePayload forwards mode and selected-direction overrides", () => {
	const form = {
		prompt: "原始长文案",
		topic: "原主题",
		audience: "原受众",
		platform: "小红书",
		tone: "轻松",
		goal: "让人理解",
		mustInclude: ["A"],
		avoid: ["B"],
	};

	const selectedDirection = {
		seedPrompt: "补充 seed",
		topic: "新主题",
		audience: "新受众",
		platform: "",
		tone: "",
		goal: "",
		mustInclude: ["C"],
		avoid: [],
	};

	const payload = buildGeneratePayload(form, selectedDirection, "structured");

	assert.equal(payload.mode, "structured");
	assert.equal(payload.prompt, "原始长文案\n\n补充 seed");
	assert.equal(payload.topic, "新主题");
	assert.equal(payload.audience, "新受众");
	assert.deepEqual(payload.mustInclude, ["C"]);
	assert.deepEqual(payload.avoid, ["B"]);
});
```

- [ ] **Step 2: Run the tests and confirm they fail before the helper exists**

Run:

```bash
npx tsx --test tools/spec-studio/public/request-builder.test.mjs
```

Expected: fail because `request-builder.mjs` has not been added yet.

- [ ] **Step 3: Implement the helper and wire the UI to use it**

```javascript
export function normalizeMode(value) {
	return value === "structured" ? "structured" : "long-copy";
}

export function buildGeneratePayload(form, selectedDirection, mode) {
	const normalizedMode = normalizeMode(mode);

	if (!selectedDirection) {
		return {
			...form,
			mode: normalizedMode,
		};
	}

	return {
		...form,
		mode: normalizedMode,
		prompt: [form.prompt, selectedDirection.seedPrompt].filter(Boolean).join("\n\n"),
		topic: selectedDirection.topic || form.topic,
		audience: selectedDirection.audience || form.audience,
		platform: selectedDirection.platform || form.platform,
		tone: selectedDirection.tone || form.tone,
		goal: selectedDirection.goal || form.goal,
		mustInclude: selectedDirection.mustInclude?.length ? selectedDirection.mustInclude : form.mustInclude,
		avoid: selectedDirection.avoid?.length ? selectedDirection.avoid : form.avoid,
	};
}
```

Update `index.html` so the prompt area includes an explicit mode switch:

```html
<div class="mode-switch" role="tablist" aria-label="生成模式">
  <button id="mode-long-copy" class="mode-chip is-active" type="button" data-mode="long-copy">长文案直投</button>
  <button id="mode-structured" class="mode-chip" type="button" data-mode="structured">结构化精修</button>
</div>
<div id="mode-hint" class="mode-hint">适合直接粘贴一段完整文案，模型会先抽取结构再生成。</div>
```

Update `app.js` so `readForm()` includes `mode`, `handleIdeate()` and `handleGenerate()` pass that mode, and the structured fields collapse or expand according to the selected mode. Add a small state block near the top:

```javascript
import {
	buildGeneratePayload,
	normalizeMode,
} from "./request-builder.mjs";

let selectedMode = "long-copy";

function setMode(nextMode) {
	selectedMode = normalizeMode(nextMode);
	renderModeState();
}
```

Update `styles.css` so the active mode chip is visibly selected and the structured fields can collapse cleanly on narrow screens:

```css
.mode-switch {
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.mode-chip.is-active {
  border-color: rgba(105, 239, 244, 0.6);
  background: rgba(105, 239, 244, 0.14);
  color: #d9fdff;
}

.structured-section.is-collapsed {
  display: none;
}
```

- [ ] **Step 4: Run the request-builder tests and then smoke the UI in the browser**

Run:

```bash
npx tsx --test tools/spec-studio/public/request-builder.test.mjs
```

Expected: PASS.

Then run the app and verify these two flows in the browser:

```bash
npm run dev
```

Expected:
- `长文案直投` keeps the prompt-centric workflow and still generates directions and spec JSON.
- `结构化精修` exposes the field-centric workflow and forwards the selected mode to generation.

- [ ] **Step 5: Commit the studio change**

```bash
git add tools/spec-studio/public/request-builder.mjs tools/spec-studio/public/request-builder.test.mjs tools/spec-studio/public/index.html tools/spec-studio/public/app.js tools/spec-studio/public/styles.css
git commit -m "feat: add mode toggle to spec studio"
```

### Task 3: Add CLI parity and update the docs

**Files:**
- Modify: `scripts/generate-spec-with-ai.mjs`
- Modify: `README.md`

- [ ] **Step 1: Update the CLI parser and usage text**

```javascript
case "--mode":
	parsedArgs.mode = takeNextValue();
	break;
```

Update the usage block to show both entry styles:

```text
Usage:
  npm run generate:spec:ai -- --mode long-copy "<topic or requirements>"
  npm run generate:spec:ai -- --mode structured --topic "鱼油误区" --audience "新手" --tone "专业但不板" --must-include "保健品不是药"
```

- [ ] **Step 2: Update the README so the two modes are discoverable**

```markdown
## Prompt Modes

- `long-copy`: paste a full draft, caption, or long requirement block and let the model extract the structure first.
- `structured`: fill in the fields when you already know the audience, platform, tone, or must-include points.
```

Add a short note that both modes still produce the same Remotion spec shape, so the render pipeline does not change.

- [ ] **Step 3: Run a quick CLI smoke check**

Run:

```bash
npm run generate:spec:ai -- --help
```

Expected: the help text shows the new `--mode` examples and still documents the existing `--topic`, `--audience`, `--tone`, `--goal`, `--must-include`, and `--avoid` flags.

- [ ] **Step 4: Commit the CLI/docs update**

```bash
git add scripts/generate-spec-with-ai.mjs README.md
git commit -m "docs: describe mode-aware generation"
```

### Task 4: Verify the full flow end to end

**Files:**
- No new files; verify the changes already made in Tasks 1 to 3

- [ ] **Step 1: Run the focused test suite**

Run:

```bash
npx tsx --test scripts/ai-spec-lib.test.mjs tools/spec-studio/public/request-builder.test.mjs tools/spec-studio/public/app-routes.test.mjs
```

Expected: all tests pass.

- [ ] **Step 2: Run TypeScript and lint checks**

Run:

```bash
npm run lint
```

Expected: ESLint and TypeScript complete without new errors.

- [ ] **Step 3: Smoke the app paths one more time**

Run:

```bash
npm run dev
```

Expected:
- The spec workspace loads.
- The mode toggle changes the visible workflow.
- `先出 3 个方向` still returns directions.
- `直接生成预览` still returns brief, assumptions, and spec JSON.
- Saving still writes the spec into `src/specs` and updates the registry.

