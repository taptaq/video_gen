import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const htmlPath = path.join(process.cwd(), "tools", "spec-studio", "public", "index.html");

test("public page copy keeps only approved English terms", () => {
	const html = fs.readFileSync(htmlPath, "utf8");
	const visibleText = html.replace(/<[^>]+>/g, " ");

	assert.doesNotMatch(visibleText, /\bJSON\b/);
	assert.doesNotMatch(visibleText, /\bStudio\b/);
	assert.doesNotMatch(visibleText, /\bRemotion\b/);
	assert.match(visibleText, /\bprompt\b/);
});
