export function getDocumentTitle(isStudio) {
	return isStudio ? "规格工作台 / 预览" : "规格工作台";
}

export function getModeCopyText(mode) {
	return mode === "structured"
		? "结构化模式会把主题、受众、平台、语气和目标当作主输入，prompt 只作为补充背景。"
		: "长文案模式会把 prompt 当作主输入，结构化字段作为辅助补充。";
}

export function getStudioRouteTitleText({ compositionId, topic }) {
	if (topic) {
		return `${topic} / 预览`;
	}

	if (compositionId) {
		return `${compositionId} / 预览`;
	}

	return "预览";
}

export function getStudioRouteStatusText({ compositionId, selectedTopic, studioReady }) {
	if (!studioReady) {
		return "正在唤起内嵌的预览工作台，通常只需要几秒。";
	}

	if (selectedTopic) {
		return `当前条目：${compositionId}。你仍然在同一个页面壳里，只是切到了预览路由。`;
	}

	return "当前是预览总览页。你仍然在同一个页面壳里，只是切到了预览路由。";
}

export function getCompositionLibraryEmptyText() {
	return "还没有已注册规格条目。";
}

export function getCompositionLibraryStatusText({ studioAvailable, studioBaseUrl }) {
	return studioAvailable
		? `预览工作台已嵌入到同一个页面壳里。切到预览路由即可查看。入口：${studioBaseUrl}`
		: "预览工作台还没准备好。切到预览路由后会自动继续等待。";
}

export function getDirectionSelectionStatus(name) {
	return `已选择方向：${name ?? "未命名方向"}。现在可以直接生成规格。`;
}
