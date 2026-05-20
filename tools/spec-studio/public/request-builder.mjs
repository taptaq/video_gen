export function buildIdeatePayload(form, mode) {
	return {
		...form,
		mode,
	};
}

export function buildGeneratePayload(form, selectedDirection, mode) {
	if (!selectedDirection) {
		return {
			...form,
			mode,
		};
	}

	return {
		...form,
		prompt: [form.prompt, selectedDirection.seedPrompt].filter(Boolean).join("\n\n"),
		topic: selectedDirection.topic || form.topic,
		audience: selectedDirection.audience || form.audience,
		platform: selectedDirection.platform || form.platform,
		tone: selectedDirection.tone || form.tone,
		goal: selectedDirection.goal || form.goal,
		mustInclude: selectedDirection.mustInclude?.length ? selectedDirection.mustInclude : form.mustInclude,
		avoid: selectedDirection.avoid?.length ? selectedDirection.avoid : form.avoid,
		mode,
	};
}
