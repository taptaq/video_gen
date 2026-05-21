import test from "node:test";
import assert from "node:assert/strict";

import { buildGeneratePayload, buildIdeatePayload } from "./request-builder.mjs";

test("buildGeneratePayload 会带上 mode 并合并所选方向的覆盖字段", () => {
	const form = {
		prompt: "Base prompt",
		topic: "Base topic",
		audience: "Base audience",
		platform: "Base platform",
		tone: "Base tone",
		goal: "Base goal",
		mustInclude: ["form fact"],
		avoid: ["form avoid"],
	};
	const selectedDirection = {
		seedPrompt: "Direction seed",
		topic: "Direction topic",
		audience: "",
		platform: "Direction platform",
		tone: "Direction tone",
		goal: "Direction goal",
		mustInclude: ["direction fact"],
		avoid: [],
	};

	assert.deepEqual(buildGeneratePayload(form, selectedDirection, "structured"), {
		prompt: "Base prompt\n\nDirection seed",
		topic: "Direction topic",
		audience: "Base audience",
		platform: "Direction platform",
		tone: "Direction tone",
		goal: "Direction goal",
		mustInclude: ["direction fact"],
		avoid: ["form avoid"],
		mode: "structured",
	});
});

test("buildIdeatePayload 会带上 mode 且不改变表单原值", () => {
	const form = {
		prompt: "Base prompt",
		topic: "Base topic",
		audience: "Base audience",
		platform: "Base platform",
		tone: "Base tone",
		goal: "Base goal",
		mustInclude: ["form fact"],
		avoid: ["form avoid"],
	};

	assert.deepEqual(buildIdeatePayload(form, "long-copy"), {
		...form,
		mode: "long-copy",
	});
});
