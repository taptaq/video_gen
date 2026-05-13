#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { URL } from "node:url";
import { createRemotionStudioProxy } from "./remotion-studio-proxy.mjs";
import {
	STUDIO_PROXY_PATH,
	STUDIO_SHELL_PATH,
	buildStudioShellUrl,
	isAppShellRoute,
} from "./public/app-routes.mjs";
import {
	generateAiPackage,
	hasUsableInput,
	ideateAiDirections,
	loadProjectEnv,
	parseGeneratorInput,
	saveAiPackage,
} from "../../scripts/ai-spec-lib.mjs";
import { getProjectRoot } from "../../scripts/spec-utils.mjs";

const projectRoot = getProjectRoot();
loadProjectEnv(projectRoot);

const publicDir = path.join(projectRoot, "tools", "spec-studio", "public");
const port = Number(process.env.SPEC_STUDIO_PORT ?? 3210);
const host = process.env.SPEC_STUDIO_HOST ?? "127.0.0.1";
const managedStudioBaseUrl = process.env.REMOTION_STUDIO_URL ?? "http://127.0.0.1:3000";
const publicStudioBaseUrl = `http://${host}:${port}${STUDIO_SHELL_PATH}`;
const shouldManageStudioProcess = !process.env.REMOTION_STUDIO_URL;

const studioProxy = createRemotionStudioProxy({
	upstreamBaseUrl: managedStudioBaseUrl,
	mountPath: STUDIO_PROXY_PATH,
});

let studioProcess = null;
let isShuttingDown = false;

const server = http.createServer(async (req, res) => {
	try {
		const method = req.method ?? "GET";
		const url = new URL(req.url ?? "/", `http://${host}:${port}`);

		if (studioProxy.isStudioRequest(url.pathname)) {
			await studioProxy.proxyHttpRequest(req, res);
			return;
		}

		if (method === "GET" && url.pathname === "/api/status") {
			if (shouldManageStudioProcess) {
				await ensureManagedStudioProcess();
			}

			const compositions = getRegisteredCompositions();
			return sendJson(res, 200, {
				keyConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
				model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
				specCount: compositions.length,
				studioBaseUrl: publicStudioBaseUrl,
				studioProxyBaseUrl: `http://${host}:${port}${STUDIO_PROXY_PATH}`,
				studioAvailable: await isStudioAvailable(),
				compositions,
			});
		}

		if (method === "POST" && url.pathname === "/api/ideate") {
			const payload = await readJsonBody(req);
			const parsedInput = parseGeneratorInput(payload);
			if (!hasUsableInput(parsedInput)) {
				return sendJson(res, 400, { error: "请至少输入一句自然语言，或者补一个主题。" });
			}

			const ideation = await ideateAiDirections({
				parsedInput,
				projectRoot,
			});

			return sendJson(res, 200, {
				provider: ideation.provider,
				model: ideation.model,
				requestContext: ideation.requestContext,
				directions: ideation.directions,
			});
		}

		if (method === "POST" && url.pathname === "/api/generate") {
			const payload = await readJsonBody(req);
			const parsedInput = parseGeneratorInput(payload);
			if (!hasUsableInput(parsedInput)) {
				return sendJson(res, 400, { error: "请至少输入一句自然语言，或者补一个主题。" });
			}

			const aiPackage = await generateAiPackage({
				parsedInput,
				projectRoot,
			});

			return sendJson(res, 200, {
				provider: aiPackage.provider,
				model: aiPackage.model,
				brief: aiPackage.brief,
				assumptions: aiPackage.assumptions,
				spec: aiPackage.spec,
				requestContext: aiPackage.requestContext,
			});
		}

		if (method === "POST" && url.pathname === "/api/save") {
			const payload = await readJsonBody(req);
			if (!payload?.spec) {
				return sendJson(res, 400, { error: "缺少 spec，无法保存。" });
			}

			const saveResult = saveAiPackage({
				projectRoot,
				aiPackage: {
					provider: payload.provider ?? "deepseek",
					model: payload.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
					requestContext: payload.requestContext ?? { rawPrompt: "" },
					brief: payload.brief ?? {},
					assumptions: Array.isArray(payload.assumptions) ? payload.assumptions : [],
					spec: payload.spec,
				},
			});

			return sendJson(res, 200, {
				paths: {
					briefFile: path.relative(projectRoot, saveResult.briefOutputPath),
					jsonFile: path.relative(projectRoot, saveResult.jsonOutputPath),
					specFile: path.relative(projectRoot, saveResult.specResult.outputPath),
				},
				compositionId: payload.spec.compositionId,
				compositions: getRegisteredCompositions(),
			});
		}

		if (method === "GET") {
			if (isAppShellRoute(url.pathname)) {
				return serveAppShell(res);
			}

			return serveStaticFile(url.pathname, res);
		}

		return sendJson(res, 404, { error: "Not found" });
	} catch (error) {
		return sendJson(res, 500, {
			error: error instanceof Error ? error.message : "Unknown server error",
		});
	}
});

server.on("upgrade", (req, socket, head) => {
	if (studioProxy.handleUpgrade(req, socket, head)) {
		return;
	}

	socket.destroy();
});

if (shouldManageStudioProcess) {
	void ensureManagedStudioProcess();
}

server.listen(port, host, () => {
	console.log(`Unified app running at http://${host}:${port}`);
	console.log(`App shell: http://${host}:${port}/`);
});

registerShutdownHandlers();

function getRegisteredCompositions() {
	const specsDir = path.join(projectRoot, "src", "specs");
	if (!fs.existsSync(specsDir)) {
		return [];
	}

	return fs
		.readdirSync(specsDir)
		.filter((fileName) => fileName.endsWith(".ts") && fileName !== "index.ts")
		.sort()
		.map((fileName) => {
			const filePath = path.join(specsDir, fileName);
			const source = fs.readFileSync(filePath, "utf8");
			const compositionId = matchField(source, /compositionId:\s*"([^"]+)"/);
			const topic = matchField(source, /topic:\s*"([^"]+)"/);
			const hookTitle = matchField(source, /hook:\s*{[\s\S]*?title:\s*"([^"]+)"/);
			const summary = matchField(source, /summary:\s*"([^"]+)"/);

			return {
				fileName,
				filePath: path.relative(projectRoot, filePath),
				compositionId,
				topic,
				hookTitle,
				summary,
				studioUrl: `http://${host}:${port}${buildStudioShellUrl(compositionId)}`,
			};
		});
}

function matchField(source, pattern) {
	return source.match(pattern)?.[1] ?? "";
}

async function readJsonBody(req) {
	const chunks = [];
	for await (const chunk of req) {
		chunks.push(chunk);
	}

	const raw = Buffer.concat(chunks).toString("utf8");
	return raw ? JSON.parse(raw) : {};
}

function serveAppShell(res) {
	const filePath = path.join(publicDir, "index.html");
	res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
	res.end(fs.readFileSync(filePath));
}

function serveStaticFile(requestPath, res) {
	const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
	const filePath = path.join(publicDir, normalizedPath);

	if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath)) {
		return sendJson(res, 404, { error: "Static file not found" });
	}

	const ext = path.extname(filePath);
		const contentType =
		ext === ".html"
			? "text/html; charset=utf-8"
			: ext === ".js" || ext === ".mjs"
				? "application/javascript; charset=utf-8"
				: ext === ".css"
					? "text/css; charset=utf-8"
					: "application/octet-stream";

	res.writeHead(200, { "Content-Type": contentType });
	res.end(fs.readFileSync(filePath));
}

function sendJson(res, statusCode, payload) {
	res.writeHead(statusCode, {
		"Content-Type": "application/json; charset=utf-8",
	});
	res.end(JSON.stringify(payload));
}

async function isStudioAvailable() {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 1200);
		const response = await fetch(managedStudioBaseUrl, {
			method: "GET",
			signal: controller.signal,
		});
		clearTimeout(timeout);
		return response.ok;
	} catch {
		return false;
	}
}

async function ensureManagedStudioProcess() {
	if (studioProcess) {
		return;
	}

	if (await isStudioAvailable()) {
		console.log(`Reusing existing Remotion Studio at ${managedStudioBaseUrl}`);
		return;
	}

	const remotionCliPath = path.join(
		projectRoot,
		"node_modules",
		"@remotion",
		"cli",
		"remotion-cli.js",
	);
	const studioPort = getManagedStudioPort();

	console.log("Starting embedded Remotion runtime...");

	studioProcess = spawn(
		process.execPath,
		[remotionCliPath, "studio", "src/index.ts", "--port", studioPort, "--no-open"],
		{
			cwd: projectRoot,
			env: {
				...process.env,
			},
			stdio: ["ignore", "pipe", "pipe"],
		},
	);

	pipeStudioLogs(studioProcess.stdout, "log");
	pipeStudioLogs(studioProcess.stderr, "warn");

	studioProcess.on("error", (error) => {
		console.error(
			`Failed to launch Remotion Studio: ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
		);
		studioProcess = null;
	});

	studioProcess.on("exit", (code, signal) => {
		if (!isShuttingDown) {
			console.warn(
				`Remotion Studio process stopped (${signal ?? code ?? "unknown"}). /studio will be unavailable until it is restarted.`,
			);
		}

		studioProcess = null;
	});
}

function getManagedStudioPort() {
	const studioUrl = new URL(managedStudioBaseUrl);
	if (studioUrl.port) {
		return studioUrl.port;
	}

	return studioUrl.protocol === "https:" ? "443" : "80";
}

function registerShutdownHandlers() {
	for (const signal of ["SIGINT", "SIGTERM"]) {
		process.on(signal, () => {
			void shutdown();
		});
	}
}

async function shutdown() {
	if (isShuttingDown) {
		return;
	}

	isShuttingDown = true;

	await new Promise((resolve) => {
		server.close(() => resolve());
	});

	if (studioProcess) {
		studioProcess.kill("SIGTERM");
	}

	process.exit(0);
}

function pipeStudioLogs(stream, level) {
	if (!stream) {
		return;
	}

	let buffer = "";

	stream.setEncoding("utf8");
	stream.on("data", (chunk) => {
		buffer += chunk;
		const lines = buffer.split(/\r?\n/);
		buffer = lines.pop() ?? "";

		for (const line of lines) {
			const message = line.trim();
			if (!message) {
				continue;
			}

			if (message.startsWith("Server ready - Local:")) {
				console.log("Embedded Remotion runtime ready.");
				continue;
			}

			if (message.startsWith("Building...")) {
				console.log("Embedded Remotion runtime building...");
				continue;
			}

			if (message.startsWith("Built in ")) {
				console.log(message);
				continue;
			}

			const logger = level === "warn" ? console.warn : console.log;
			logger(`[remotion] ${message}`);
		}
	});
}
