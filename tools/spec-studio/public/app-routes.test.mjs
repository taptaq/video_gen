import test from "node:test";
import assert from "node:assert/strict";
import {
	STUDIO_PROXY_PATH,
	STUDIO_SHELL_PATH,
	buildStudioProxyUrl,
	buildStudioShellUrl,
	isAppShellRoute,
	parseAppRoute,
} from "./app-routes.mjs";

test("treats the spec home and studio shell routes as app-shell routes", () => {
	assert.equal(isAppShellRoute("/"), true);
	assert.equal(isAppShellRoute(STUDIO_SHELL_PATH), true);
	assert.equal(isAppShellRoute(`${STUDIO_SHELL_PATH}/`), true);
	assert.equal(isAppShellRoute(`${STUDIO_SHELL_PATH}/LubricantScienceDouyin`), true);
	assert.equal(isAppShellRoute("/styles.css"), false);
	assert.equal(isAppShellRoute(STUDIO_PROXY_PATH), false);
});

test("builds shell and proxy URLs for a selected composition", () => {
	assert.equal(buildStudioShellUrl(), "/studio/");
	assert.equal(buildStudioShellUrl("LubricantScienceDouyin"), "/studio/LubricantScienceDouyin");
	assert.equal(buildStudioProxyUrl(), "/_remotion/");
	assert.equal(
		buildStudioProxyUrl("LubricantScienceDouyin"),
		"/_remotion/LubricantScienceDouyin",
	);
});

test("parses the current route and extracts the composition id", () => {
	assert.deepEqual(parseAppRoute("/"), {
		compositionId: null,
		view: "spec",
	});
	assert.deepEqual(parseAppRoute("/studio"), {
		compositionId: null,
		view: "studio",
	});
	assert.deepEqual(parseAppRoute("/studio/LubricantScienceDouyin"), {
		compositionId: "LubricantScienceDouyin",
		view: "studio",
	});
});
