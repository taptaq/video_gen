import test from "node:test";
import assert from "node:assert/strict";

import {
	getCompositionLibraryEmptyText,
	getCompositionLibraryStatusText,
	getDocumentTitle,
	getDirectionSelectionStatus,
	getModeCopyText,
	getStudioRouteStatusText,
	getStudioRouteTitleText,
} from "./ui-copy.mjs";

test("returns Chinese document titles", () => {
	assert.equal(getDocumentTitle(false), "规格工作台");
	assert.equal(getDocumentTitle(true), "规格工作台 / 预览");
});

test("returns Chinese mode copy text while keeping prompt as a named term", () => {
	assert.match(getModeCopyText("long-copy"), /prompt/);
	assert.match(getModeCopyText("structured"), /prompt/);
	assert.doesNotMatch(getModeCopyText("long-copy"), /spec|brief|JSON/i);
});

test("returns Chinese studio text without English labels", () => {
	assert.equal(getStudioRouteTitleText({ compositionId: null, topic: null }), "预览");
	assert.equal(getStudioRouteTitleText({ compositionId: "abc", topic: null }), "abc / 预览");
	assert.equal(getStudioRouteTitleText({ compositionId: "abc", topic: "鱼油误区" }), "鱼油误区 / 预览");
	assert.match(getStudioRouteStatusText({ compositionId: "abc", selectedTopic: "鱼油误区", studioReady: true }), /当前条目/);
	assert.match(getCompositionLibraryStatusText({ studioAvailable: true, studioBaseUrl: "http://127.0.0.1:3210" }), /预览工作台/);
	assert.equal(getCompositionLibraryEmptyText(), "还没有已注册规格条目。");
	assert.equal(getDirectionSelectionStatus("鱼油误区"), "已选择方向：鱼油误区。现在可以直接生成规格。");
});
