export const STUDIO_SHELL_PATH = "/studio";
export const STUDIO_PROXY_PATH = "/_remotion";

export function isAppShellRoute(pathname) {
	return pathname === "/" || pathname === STUDIO_SHELL_PATH || pathname.startsWith(`${STUDIO_SHELL_PATH}/`);
}

export function buildStudioShellUrl(compositionId) {
	return compositionId
		? `${STUDIO_SHELL_PATH}/${encodeURIComponent(compositionId)}`
		: `${STUDIO_SHELL_PATH}/`;
}

export function buildStudioProxyUrl(compositionId) {
	return compositionId
		? `${STUDIO_PROXY_PATH}/${encodeURIComponent(compositionId)}`
		: `${STUDIO_PROXY_PATH}/`;
}

export function parseAppRoute(pathname) {
	if (!pathname || pathname === "/") {
		return {
			compositionId: null,
			view: "spec",
		};
	}

	if (pathname === STUDIO_SHELL_PATH || pathname === `${STUDIO_SHELL_PATH}/`) {
		return {
			compositionId: null,
			view: "studio",
		};
	}

	if (pathname.startsWith(`${STUDIO_SHELL_PATH}/`)) {
		const compositionId = pathname.slice(`${STUDIO_SHELL_PATH}/`.length);
		return {
			compositionId: compositionId ? decodeURIComponent(compositionId) : null,
			view: "studio",
		};
	}

	return {
		compositionId: null,
		view: "spec",
	};
}
