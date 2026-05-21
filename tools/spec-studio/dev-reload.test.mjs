import test from "node:test";
import assert from "node:assert/strict";

import { createDevReloadBroadcaster } from "./dev-reload.mjs";

test("watching a path sends one reload event to connected clients", async () => {
	const broadcaster = createDevReloadBroadcaster({
		watchPaths: ["/tmp/project/tools/spec-studio/public/app.js"],
	});

	const events = [];
	const client = broadcaster.connect({
		send(eventName) {
			events.push(eventName);
		},
	});

	broadcaster.emitChange("/tmp/project/tools/spec-studio/public/app.js");
	await delay(80);

	assert.deepEqual(events, ["reload"]);

	client.close();
	broadcaster.close();
});

test("changes outside watched paths are ignored", async () => {
	const broadcaster = createDevReloadBroadcaster({
		watchPaths: ["/tmp/project/tools/spec-studio/public/app.js"],
	});

	const events = [];
	const client = broadcaster.connect({
		send(eventName) {
			events.push(eventName);
		},
	});

	broadcaster.emitChange("/tmp/project/src/index.ts");
	await delay(80);

	assert.deepEqual(events, []);

	client.close();
	broadcaster.close();
});

test("irrelevant files inside watched roots are ignored", async () => {
	const broadcaster = createDevReloadBroadcaster({
		watchPaths: ["/tmp/project/tools/spec-studio/public"],
	});

	const events = [];
	const client = broadcaster.connect({
		send(eventName) {
			events.push(eventName);
		},
	});

	broadcaster.emitChange("/tmp/project/tools/spec-studio/public/.DS_Store");
	await delay(80);

	assert.deepEqual(events, []);

	client.close();
	broadcaster.close();
});

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
