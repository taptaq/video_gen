export function shouldReloadOnEvent(eventName) {
	return eventName === "reload";
}

export function connectDevReload(onReload) {
	if (typeof window === "undefined" || !window.EventSource) {
		return () => {};
	}

	let currentSource = null;
	let retryTimer = null;
	let closed = false;

	const open = () => {
		if (closed) {
			return;
		}

		currentSource = new EventSource("/api/live-reload");
		currentSource.addEventListener("reload", () => {
			if (shouldReloadOnEvent("reload")) {
				onReload();
			}
		});
		currentSource.onerror = () => {
			currentSource?.close();
			currentSource = null;
			if (closed) {
				return;
			}

			if (retryTimer) {
				window.clearTimeout(retryTimer);
			}

			retryTimer = window.setTimeout(() => {
				retryTimer = null;
				open();
			}, 1000);
		};
	};

	open();

	return () => {
		closed = true;
		if (retryTimer) {
			window.clearTimeout(retryTimer);
			retryTimer = null;
		}
		currentSource?.close();
		currentSource = null;
	};
}
