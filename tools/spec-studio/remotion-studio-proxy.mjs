import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import WebSocket, { WebSocketServer } from "ws";

const defaultMountPath = "/studio";

export function createRemotionStudioProxy({
	mountPath = defaultMountPath,
	upstreamBaseUrl,
}) {
	const normalizedMountPath = normalizeMountPath(mountPath);
	const upstream = new URL(upstreamBaseUrl);
	const wsServer = new WebSocketServer({ noServer: true });

	return {
		isStudioRequest(pathname) {
			return pathname === normalizedMountPath || pathname.startsWith(`${normalizedMountPath}/`);
		},
		async proxyHttpRequest(req, res) {
			const requestUrl = new URL(req.url ?? "/", "http://localhost");
			const upstreamUrl = buildUpstreamUrl(requestUrl, upstream, normalizedMountPath);
			if (requestUrl.pathname === normalizedMountPath) {
				res.writeHead(302, {
					Location: `${normalizedMountPath}/`,
				});
				res.end();
				return;
			}

			await forwardHttpRequest({
				req,
				res,
				upstreamUrl,
				mountPath: normalizedMountPath,
			});
		},
		handleUpgrade(req, socket, head) {
			const requestUrl = new URL(req.url ?? "/", "http://localhost");
			if (!this.isStudioRequest(requestUrl.pathname)) {
				return false;
			}

			const upstreamUrl = buildUpstreamUrl(requestUrl, upstream, normalizedMountPath);

			wsServer.handleUpgrade(req, socket, head, (browserWs) => {
				const upstreamWs = new WebSocket(upstreamUrl, {
					headers: forwardUpgradeHeaders(req.headers),
				});

				const pendingMessages = [];

				const flushPendingMessages = () => {
					for (const [data, isBinary] of pendingMessages) {
						if (upstreamWs.readyState === WebSocket.OPEN) {
							upstreamWs.send(data, { binary: isBinary });
						}
					}
					pendingMessages.length = 0;
				};

				browserWs.on("message", (data, isBinary) => {
					if (upstreamWs.readyState === WebSocket.OPEN) {
						upstreamWs.send(data, { binary: isBinary });
						return;
					}

					pendingMessages.push([data, isBinary]);
				});

				upstreamWs.on("open", flushPendingMessages);
				upstreamWs.on("message", (data, isBinary) => {
					if (browserWs.readyState === WebSocket.OPEN) {
						browserWs.send(data, { binary: isBinary });
					}
				});

				const closePair = () => {
					if (browserWs.readyState === WebSocket.OPEN) {
						browserWs.close();
					}
					if (upstreamWs.readyState === WebSocket.OPEN) {
						upstreamWs.close();
					}
				};

				browserWs.on("close", closePair);
				upstreamWs.on("close", closePair);
				browserWs.on("error", closePair);
				upstreamWs.on("error", closePair);
			});

			return true;
		},
	};
}

function normalizeMountPath(mountPath) {
	if (!mountPath.startsWith("/")) {
		return `/${mountPath}`;
	}

	return mountPath.endsWith("/") ? mountPath.slice(0, -1) : mountPath;
}

function stripMountPath(pathname, mountPath) {
	if (pathname === mountPath) {
		return "/";
	}

	return pathname.slice(mountPath.length) || "/";
}

function buildUpstreamUrl(requestUrl, upstream, mountPath) {
	const strippedPath = stripMountPath(requestUrl.pathname, mountPath);
	const upstreamUrl = new URL(strippedPath + requestUrl.search, upstream);
	upstreamUrl.hash = "";
	return upstreamUrl;
}

async function forwardHttpRequest({ req, res, upstreamUrl, mountPath }) {
	const isHttps = upstreamUrl.protocol === "https:";
	const requestModule = isHttps ? https : http;
	const headers = { ...req.headers };
	delete headers.host;
	delete headers.connection;
	delete headers["content-length"];

	const proxyReq = requestModule.request(
		upstreamUrl,
		{
			method: req.method,
			headers,
		},
		(proxyRes) => {
			const responseHeaders = { ...proxyRes.headers };
			rewriteRedirectLocation(responseHeaders, mountPath);

			if (isHtmlResponse(responseHeaders["content-type"])) {
				const chunks = [];
				proxyRes.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
				proxyRes.on("end", () => {
					const html = Buffer.concat(chunks).toString("utf8");
					const rewrittenHtml = rewriteStudioHtml(html, mountPath);
					delete responseHeaders["content-length"];
					responseHeaders["content-type"] = "text/html; charset=utf-8";
					res.writeHead(proxyRes.statusCode ?? 200, responseHeaders);
					res.end(rewrittenHtml);
				});
				return;
			}

			res.writeHead(proxyRes.statusCode ?? 200, responseHeaders);
			proxyRes.pipe(res);
		},
	);

	proxyReq.on("error", (error) => {
		if (!res.headersSent) {
			res.writeHead(502, {
				"Content-Type": "application/json; charset=utf-8",
			});
		}

		res.end(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Studio proxy error",
			}),
		);
	});

	req.on("aborted", () => proxyReq.destroy());
	req.pipe(proxyReq);

	await new Promise((resolve) => {
		res.on("close", resolve);
		res.on("finish", resolve);
	});
}

function isHtmlResponse(contentType) {
	return typeof contentType === "string" && contentType.includes("text/html");
}

function rewriteStudioHtml(html, mountPath) {
	const publicPath = `${mountPath}/`;
	return html
		.replaceAll('window.remotion_publicPath = "/"', `window.remotion_publicPath = ${JSON.stringify(publicPath)}`)
		.replaceAll('href="/favicon.ico"', `href="${publicPath}favicon.ico"`)
		.replaceAll('src="/bundle.js"', `src="${publicPath}bundle.js"`);
}

function rewriteRedirectLocation(headers, mountPath) {
	const location = headers.location;
	if (typeof location !== "string") {
		return;
	}

	if (!location.startsWith("/") || location.startsWith(mountPath)) {
		return;
	}

	headers.location = `${mountPath}${location}`;
}

function forwardUpgradeHeaders(headers) {
	const forwardedHeaders = {};

	for (const headerName of [
		"cookie",
		"origin",
		"sec-websocket-protocol",
		"user-agent",
	]) {
		const value = headers[headerName];
		if (typeof value === "string") {
			forwardedHeaders[headerName] = value;
		}
	}

	return forwardedHeaders;
}
