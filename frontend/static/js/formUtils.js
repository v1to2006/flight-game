export const getInputValue = (form, name) => {
	const input = form.elements.namedItem(name)

	if (!input) {
		throw new Error(`Input "${name}" was not found.`)
	}

	return input.value.trim()
}

export const setFormLoading = (form, isLoading) => {
	const submitButton = form.querySelector("[data-submit-button]")

	if (!submitButton) {
		return
	}

	submitButton.disabled = isLoading
	submitButton.dataset.originalText ??= submitButton.textContent
	submitButton.textContent = isLoading ? "Processing..." : submitButton.dataset.originalText
}

export const showMessage = (element, message, type = "error") => {
	element.textContent = message
	element.className = `status-message status-message--${type} is-visible`
}

export const clearMessage = (element) => {
	element.textContent = ""
	element.className = "status-message"
}
