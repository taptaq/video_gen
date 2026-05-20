import test from "node:test";
import assert from "node:assert/strict";

import { buildGeneratePayload, buildIdeatePayload } from "./request-builder.mjs";

test("buildGeneratePayload includes mode and merges selected direction overrides", () => {
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

test("buildIdeatePayload includes mode without altering the form", () => {
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
