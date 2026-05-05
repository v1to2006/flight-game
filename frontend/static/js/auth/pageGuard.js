import { APP_CONFIG } from "../config.js"
import { getCurrentUser } from "../authApi.js"

const PUBLIC_PAGES = new Set([
	"",
	"index.html",
	"login.html",
	"signup.html",
])

const currentPage = window.location.pathname.split("/").pop()

if (!PUBLIC_PAGES.has(currentPage)) {
	try {
		await getCurrentUser()
	} catch {
		window.location.href = APP_CONFIG.routes.login
	}
}