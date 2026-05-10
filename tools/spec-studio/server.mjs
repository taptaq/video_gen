#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";
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
const publicDir = path.join(projectRoot, "tools", "spec-studio", "public");
const port = Number(process.env.SPEC_STUDIO_PORT ?? 3210);
const host = process.env.SPEC_STUDIO_HOST ?? "127.0.0.1";
const studioBaseUrl = process.env.REMOTION_STUDIO_URL ?? "http://127.0.0.1:3000";

loadProjectEnv(projectRoot);

const server = http.createServer(async (req, res) => {
	try {
		const method = req.method ?? "GET";
		const url = new URL(req.url ?? "/", `http://${host}:${port}`);

		if (method === "GET" && url.pathname === "/api/status") {
			const compositions = getRegisteredCompositions();
			return sendJson(res, 200, {
				keyConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
				model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
				specCount: compositions.length,
				studioBaseUrl,
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
			return serveStaticFile(url.pathname, res);
		}

		return sendJson(res, 404, { error: "Not found" });
	} catch (error) {
		return sendJson(res, 500, {
			error: error instanceof Error ? error.message : "Unknown server error",
		});
	}
});

server.listen(port, host, () => {
	console.log(`Spec Studio running at http://${host}:${port}`);
});

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
				studioUrl: compositionId ? `${studioBaseUrl}/${encodeURIComponent(compositionId)}` : null,
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
			: ext === ".js"
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
		const response = await fetch(studioBaseUrl, {
			method: "GET",
			signal: controller.signal,
		});
		clearTimeout(timeout);
		return response.ok;
	} catch {
		return false;
	}
}
