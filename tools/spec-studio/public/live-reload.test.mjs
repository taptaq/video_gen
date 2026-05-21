import test from "node:test";
import assert from "node:assert/strict";

import { shouldReloadOnEvent } from "./live-reload.mjs";

test("only the reload event should trigger a refresh", () => {
	assert.equal(shouldReloadOnEvent("reload"), true);
	assert.equal(shouldReloadOnEvent("ping"), false);
});
