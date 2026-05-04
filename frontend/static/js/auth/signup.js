import { APP_CONFIG } from "../config.js"
import { signupUser } from "../authApi.js"
import { clearMessage, getInputValue, setFormLoading, showMessage } from "../formUtils.js"

const signupForm = document.querySelector("[data-signup-form]")
const statusMessage = document.querySelector("[data-status-message]")

signupForm.addEventListener("submit", async (event) => {
	event.preventDefault()

	clearMessage(statusMessage)
	setFormLoading(signupForm, true)

	const username = getInputValue(signupForm, "username").toLowerCase()
	const password = getInputValue(signupForm, "password")
	const confirmPassword = getInputValue(signupForm, "confirmPassword")

	if (password !== confirmPassword) {
		throw new Error("Passwords do not match.")
	}

	try {
		await signupUser({ username, password })

		showMessage(statusMessage, "Account created. Redirecting to login...", "success")

		setTimeout(() => {
			window.location.href = APP_CONFIG.routes.login
		}, 900)
	} catch (error) {
		showMessage(statusMessage, error.message)
	} finally {
		setFormLoading(signupForm, false)
	}
})
