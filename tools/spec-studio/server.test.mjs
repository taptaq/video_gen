import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

test("serves a live reload SSE endpoint", async () => {
	const server = spawn(process.execPath, ["tools/spec-studio/server.mjs"], {
		cwd: process.cwd(),
		env: {
			...process.env,
			SPEC_STUDIO_PORT: "0",
			REMOTION_STUDIO_URL: "http://127.0.0.1:3000",
		},
		stdio: ["ignore", "pipe", "pipe"],
	});

	try {
		const port = await waitForServerReady(server);

		const response = await fetch(`http://127.0.0.1:${port}/api/live-reload`);

		assert.equal(response.ok, true);
		assert.match(response.headers.get("content-type") ?? "", /text\/event-stream/);
		await response.body?.cancel();
	} finally {
		server.kill("SIGTERM");
		await onceExited(server);
	}
});

function waitForServerReady(server) {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error("server did not start in time"));
		}, 5000);

		const onData = (chunk) => {
			const match = String(chunk).match(/Unified app running at http:\/\/127\.0\.0\.1:(\d+)/);
			if (match) {
				clearTimeout(timeout);
				server.stdout.off("data", onData);
				resolve(Number(match[1]));
			}
		};

		const onError = (chunk) => {
			clearTimeout(timeout);
			server.stderr.off("data", onError);
			reject(new Error(String(chunk)));
		};

		server.stdout.on("data", onData);
		server.stderr.on("data", onError);
	});
}

function onceExited(server) {
	return new Promise((resolve) => {
		server.once("exit", () => resolve());
	});
}
