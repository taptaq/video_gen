import {
	buildStudioProxyUrl,
	buildStudioShellUrl,
	parseAppRoute,
} from "./app-routes.mjs";
import { buildGeneratePayload as buildGenerateRequestPayload, buildIdeatePayload } from "./request-builder.mjs";

const specRoute = document.getElementById("spec-route");
const studioRoute = document.getElementById("studio-route");
const studioFrame = document.getElementById("studio-frame");
const studioRouteTitle = document.getElementById("studio-route-title");
const studioRouteStatus = document.getElementById("studio-route-status");
const navLinks = Array.from(document.querySelectorAll("[data-nav-link]"));
const envStatus = document.getElementById("env-status");
const specCount = document.getElementById("spec-count");
const actionStatus = document.getElementById("action-status");
const ideateBtn = document.getElementById("ideate-btn");
const generateBtn = document.getElementById("generate-btn");
const saveBtn = document.getElementById("save-btn");
const modeToggle = document.getElementById("mode-toggle");
const modeCopy = document.getElementById("mode-copy");
const directionsView = document.getElementById("directions-view");
const compositionLibrary = document.getElementById("composition-library");
const briefView = document.getElementById("brief-view");
const assumptionsView = document.getElementById("assumptions-view");
const specJsonView = document.getElementById("spec-json");

let latestPackage = null;
let latestDirections = [];
let selectedDirection = null;
let latestStatus = null;
let studioAvailabilityPoll = null;

bindEvents();
boot();

function bindEvents() {
	modeToggle.addEventListener("click", handleModeChange);
	ideateBtn.addEventListener("click", handleIdeate);
	generateBtn.addEventListener("click", handleGenerate);
	saveBtn.addEventListener("click", handleSave);

	window.addEventListener("popstate", () => {
		renderRoute();
	});

	document.addEventListener("click", (event) => {
		const link = event.target.closest("[data-app-link]");
		if (!link) {
			return;
		}

		const href = link.getAttribute("href");
		if (!href) {
			return;
		}

		const nextUrl = new URL(href, window.location.origin);
		if (nextUrl.origin !== window.location.origin) {
			return;
		}

		event.preventDefault();
		navigateTo(nextUrl.pathname);
	});
}

async function boot() {
	setSelectedMode("long-copy");
	renderRoute();
	await loadStatus();
	renderRoute();
}

async function handleIdeate() {
	try {
		setStatus("正在生成 3 个方向...");
		ideateBtn.disabled = true;
		generateBtn.disabled = true;
		saveBtn.disabled = true;

		const response = await fetch("/api/ideate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(buildIdeatePayload(readForm(), getSelectedMode())),
		});

		const payload = await response.json();
		if (!response.ok) {
			throw new Error(payload.error || "方向生成失败");
		}

		latestDirections = payload.directions || [];
		selectedDirection = null;
		renderDirections(latestDirections);
		setStatus("已经生成 3 个方向。你可以先选一个，再继续生成 spec。");
	} catch (error) {
		setStatus(error.message || "方向生成失败", true);
	} finally {
		ideateBtn.disabled = false;
		generateBtn.disabled = false;
	}
}

async function handleGenerate() {
	try {
		setStatus(selectedDirection ? "正在基于所选方向生成预览..." : "正在直接生成预览...");
		ideateBtn.disabled = true;
		generateBtn.disabled = true;
		saveBtn.disabled = true;

		const response = await fetch("/api/generate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(buildGenerateRequestPayload(readForm(), selectedDirection, getSelectedMode())),
		});

		const payload = await response.json();
		if (!response.ok) {
			throw new Error(payload.error || "生成失败");
		}

		latestPackage = payload;
		renderPackage(payload);
		saveBtn.disabled = false;
		setStatus("预览已生成，可以先看 brief，再决定是否保存。");
	} catch (error) {
		setStatus(error.message || "生成失败", true);
	} finally {
		ideateBtn.disabled = false;
		generateBtn.disabled = false;
	}
}

async function handleSave() {
	if (!latestPackage) {
		return;
	}

	try {
		setStatus("正在保存到项目...");
		saveBtn.disabled = true;

		const response = await fetch("/api/save", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(latestPackage),
		});

		const payload = await response.json();
		if (!response.ok) {
			throw new Error(payload.error || "保存失败");
		}

		setStatus(`已保存：${payload.paths.specFile}，并更新了 specs 注册表。`);
		await loadStatus();
	} catch (error) {
		setStatus(error.message || "保存失败", true);
	} finally {
		saveBtn.disabled = false;
	}
}

async function loadStatus() {
	const response = await fetch("/api/status");
	const payload = await response.json();
	latestStatus = payload;
	envStatus.textContent = payload.keyConfigured
		? `DeepSeek 已配置，本地模型入口可用。默认模型：${payload.model}`
		: "DeepSeek key 未配置，当前只能看界面，无法真正生成。";
	specCount.textContent = `当前已注册 ${payload.specCount} 个 composition`;
	renderCompositionLibrary(payload.compositions || [], payload.studioAvailable, payload.studioBaseUrl);
	renderRoute();
}

function renderRoute() {
	const route = parseAppRoute(window.location.pathname);
	const isStudio = route.view === "studio";

	specRoute.hidden = isStudio;
	studioRoute.hidden = !isStudio;

	for (const link of navLinks) {
		link.classList.toggle("is-active", link.dataset.navLink === route.view);
	}

	document.title = isStudio ? "Spec Studio / Remotion Preview" : "Spec Studio";

	if (isStudio) {
		renderStudioRoute(route.compositionId);
		return;
	}

	clearStudioPoll();
}

function renderStudioRoute(compositionId) {
	const compositions = latestStatus?.compositions ?? [];
	const selectedComposition = compositions.find((item) => item.compositionId === compositionId) ?? null;
	const studioReady = latestStatus?.studioAvailable ?? false;

	studioRouteTitle.textContent = selectedComposition
		? `${selectedComposition.topic} / Remotion 预览`
		: compositionId
			? `${compositionId} / Remotion 预览`
			: "Remotion 预览";

	if (!latestStatus) {
		studioRouteStatus.textContent = "正在读取本地状态...";
		studioFrame.removeAttribute("src");
		return;
	}

	if (!studioReady) {
		studioRouteStatus.textContent = "正在唤起内嵌的 Remotion Studio，通常只需要几秒。";
		studioFrame.removeAttribute("src");
		scheduleStudioPoll();
		return;
	}

	clearStudioPoll();

	studioRouteStatus.textContent = selectedComposition
		? `当前 composition：${selectedComposition.compositionId}。你仍然在同一个页面壳里，只是切到了 Studio 路由。`
		: "当前是 Studio 总览页。你仍然在同一个页面壳里，只是切到了 Studio 路由。";

	const nextSrc = buildStudioProxyUrl(compositionId);
	if (studioFrame.getAttribute("src") !== nextSrc) {
		studioFrame.setAttribute("src", nextSrc);
	}
}

function scheduleStudioPoll() {
	if (studioAvailabilityPoll) {
		return;
	}

	studioAvailabilityPoll = window.setTimeout(async () => {
		studioAvailabilityPoll = null;
		await loadStatus();
		const route = parseAppRoute(window.location.pathname);
		if (route.view === "studio" && !latestStatus?.studioAvailable) {
			scheduleStudioPoll();
		}
	}, 1500);
}

function clearStudioPoll() {
	if (!studioAvailabilityPoll) {
		return;
	}

	window.clearTimeout(studioAvailabilityPoll);
	studioAvailabilityPoll = null;
}

function navigateTo(pathname) {
	if (pathname === window.location.pathname) {
		renderRoute();
		return;
	}

	window.history.pushState({}, "", pathname);
	renderRoute();
}

function readForm() {
	return {
		prompt: document.getElementById("prompt").value.trim(),
		topic: document.getElementById("topic").value.trim(),
		audience: document.getElementById("audience").value.trim(),
		platform: document.getElementById("platform").value.trim(),
		tone: document.getElementById("tone").value.trim(),
		goal: document.getElementById("goal").value.trim(),
		mustInclude: splitLines(document.getElementById("must-include").value),
		avoid: splitLines(document.getElementById("avoid").value),
	};
}

function splitLines(value) {
	return value
		.split(/\r?\n/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function renderDirections(directions) {
	if (!directions.length) {
		directionsView.classList.add("empty-state");
		directionsView.textContent = "还没有方向提案。";
		return;
	}

	directionsView.classList.remove("empty-state");
	directionsView.innerHTML = `
		<div class="directions-grid">
			${directions
				.map((direction) => {
					const isActive = selectedDirection?.id === direction.id;
					return `
						<div class="direction-card ${isActive ? "active" : ""}">
							<div class="section-kicker">${escapeHtml(direction.name || "方向")}</div>
							<div class="direction-name">${escapeHtml(direction.tagline || "-")}</div>
							<div class="direction-tagline">${escapeHtml(direction.hookAngle || "-")}</div>
							<div class="direction-meta">
								${renderMetaRow("受众", direction.audience)}
								${renderMetaRow("平台", direction.platform)}
								${renderMetaRow("语气", direction.tone)}
								${renderMetaRow("核心结论", direction.coreMessage)}
							</div>
							<div class="direction-points">
								<ul>
									${(direction.mustInclude || [])
										.slice(0, 3)
										.map((item) => `<li>${escapeHtml(item)}</li>`)
										.join("")}
								</ul>
							</div>
							<div class="direction-actions">
								<button class="chip-btn primary-choice" data-direction-id="${escapeHtml(direction.id)}">选这个方向</button>
								<button class="chip-btn" data-fill-direction-id="${escapeHtml(direction.id)}">填回输入区</button>
							</div>
						</div>
					`;
				})
				.join("")}
		</div>
	`;

	for (const button of directionsView.querySelectorAll("[data-direction-id]")) {
		button.addEventListener("click", () => {
			const directionId = button.getAttribute("data-direction-id");
			selectedDirection = directions.find((item) => item.id === directionId) || null;
			renderDirections(directions);
			setStatus(`已选择方向：${selectedDirection?.name ?? "未命名方向"}。现在可以直接生成 spec。`);
		});
	}

	for (const button of directionsView.querySelectorAll("[data-fill-direction-id]")) {
		button.addEventListener("click", () => {
			const directionId = button.getAttribute("data-fill-direction-id");
			const direction = directions.find((item) => item.id === directionId);
			if (!direction) {
				return;
			}
			fillFormFromDirection(direction);
			selectedDirection = direction;
			renderDirections(directions);
			setStatus(`已把方向 "${direction.name}" 填回输入区。`);
		});
	}
}

function renderCompositionLibrary(compositions, studioAvailable, studioBaseUrl) {
	if (!compositions.length) {
		compositionLibrary.classList.add("empty-state");
		compositionLibrary.textContent = "还没有已注册 composition。";
		return;
	}

	compositionLibrary.classList.remove("empty-state");
	compositionLibrary.innerHTML = `
		<div class="studio-state">
			${studioAvailable
				? `Remotion Studio 已坐进同一个页面壳里。切到 Studio 路由即可预览。入口：${escapeHtml(studioBaseUrl)}`
				: "Remotion Studio 还没准备好。切到 Studio 路由后会自动继续等待。"}
		</div>
		<div class="library-grid">
			${compositions
				.map(
					(item) => `
						<div class="library-card">
							<div class="section-kicker">${escapeHtml(item.compositionId || "Unknown")}</div>
							<div class="library-topic">${escapeHtml(item.topic || "-")}</div>
							<div class="library-summary">${escapeHtml(item.hookTitle || item.summary || "-")}</div>
							<div class="library-code">${escapeHtml(item.filePath || item.fileName || "")}</div>
							<div class="library-actions">
								<a
									class="library-link"
									href="${escapeHtml(buildStudioShellUrl(item.compositionId))}"
									data-app-link
								>
									去 Studio 预览
								</a>
								<button class="chip-btn" data-copy-composition-id="${escapeHtml(item.compositionId)}">复制 ID</button>
							</div>
						</div>
					`,
				)
				.join("")}
		</div>
	`;

	for (const button of compositionLibrary.querySelectorAll("[data-copy-composition-id]")) {
		button.addEventListener("click", async () => {
			const compositionId = button.getAttribute("data-copy-composition-id");
			if (!compositionId) {
				return;
			}

			try {
				await navigator.clipboard.writeText(compositionId);
				setStatus(`已复制 composition ID：${compositionId}`);
			} catch {
				setStatus(`复制失败，你也可以手动使用：${compositionId}`, true);
			}
		});
	}
}

function fillFormFromDirection(direction) {
	document.getElementById("topic").value = direction.topic || "";
	document.getElementById("audience").value = direction.audience || "";
	document.getElementById("platform").value = direction.platform || "";
	document.getElementById("tone").value = direction.tone || "";
	document.getElementById("goal").value = direction.goal || "";
	document.getElementById("must-include").value = (direction.mustInclude || []).join("\n");
	document.getElementById("avoid").value = (direction.avoid || []).join("\n");
}

function handleModeChange(event) {
	const button = event.target.closest("[data-mode]");
	if (!button) {
		return;
	}

	setSelectedMode(button.getAttribute("data-mode"));
}

function getSelectedMode() {
	return modeToggle.querySelector(".is-active")?.getAttribute("data-mode") || "long-copy";
}

function setSelectedMode(mode) {
	for (const button of modeToggle.querySelectorAll("[data-mode]")) {
		button.classList.toggle("is-active", button.getAttribute("data-mode") === mode);
		button.setAttribute("aria-selected", button.getAttribute("data-mode") === mode ? "true" : "false");
	}

	const isStructured = mode === "structured";
	modeToggle.dataset.mode = mode;
	modeCopy.textContent = isStructured
		? "structured 模式会把主题、受众、平台、语气和目标当作主输入，prompt 只作为补充背景。"
		: "long-copy 模式会把 prompt 当作主输入，结构化字段作为辅助补充。";
	document.querySelector(".input-panel")?.classList.toggle("structured-mode", isStructured);
}

function renderPackage(payload) {
	const brief = payload.brief || {};
	const assumptions = payload.assumptions || [];

	briefView.classList.remove("empty-state");
	assumptionsView.classList.remove("empty-state");
	specJsonView.classList.remove("empty-state");

	briefView.innerHTML = `
		<div class="brief-grid">
			${renderBriefItem("主题", brief.topic)}
			${renderBriefItem("受众", brief.audience)}
			${renderBriefItem("平台", brief.platform)}
			${renderBriefItem("语气", brief.tone)}
			${renderBriefItem("开场角度", brief.hookAngle)}
			${renderBriefItem("核心结论", brief.coreMessage)}
			${renderBriefItem("视觉方向", brief.visualDirection)}
			${renderBriefList("必须包含", brief.mustInclude)}
			${renderBriefList("避免表达", brief.avoid)}
		</div>
	`;

	assumptionsView.innerHTML = assumptions.length
		? `<ul class="assumption-list">${assumptions
				.map((item) => `<li>${escapeHtml(item)}</li>`)
				.join("")}</ul>`
		: `<div class="empty-inline">这次没有显式假设。</div>`;

	specJsonView.textContent = JSON.stringify(payload.spec, null, 2);
}

function renderBriefItem(label, value) {
	return `
		<div class="brief-item">
			<div class="brief-label">${escapeHtml(label)}</div>
			<div class="brief-value">${escapeHtml(value || "-")}</div>
		</div>
	`;
}

function renderBriefList(label, values) {
	const list = Array.isArray(values) && values.length
		? `<ul>${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
		: '<div class="brief-value">-</div>';

	return `
		<div class="brief-item brief-item-wide">
			<div class="brief-label">${escapeHtml(label)}</div>
			<div class="brief-value">${list}</div>
		</div>
	`;
}

function renderMetaRow(label, value) {
	return `
		<div class="direction-meta-row">
			<span>${escapeHtml(label)}</span>
			<span>${escapeHtml(value || "-")}</span>
		</div>
	`;
}

function setStatus(message, isError = false) {
	actionStatus.textContent = message;
	actionStatus.classList.toggle("is-error", isError);
}

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}
