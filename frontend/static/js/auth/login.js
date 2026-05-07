import { APP_CONFIG } from "../config.js"
import { getCurrentUser, loginUser } from "../authApi.js"
import { clearMessage, getInputValue, setFormLoading, showMessage } from "../formUtils.js"

const loginForm = document.querySelector("[data-login-form]")
const statusMessage = document.querySelector("[data-status-message]")

redirectIfAlreadyLoggedIn()

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault()

  clearMessage(statusMessage)
  setFormLoading(loginForm, true)

  try {
    const username = getInputValue(loginForm, "username").toLowerCase()
    const password = getInputValue(loginForm, "password")

    await loginUser({ username, password })

    window.location.replace(APP_CONFIG.routes.mainMenu)
  } catch (error) {
    showMessage(statusMessage, error.message || "Login failed")
  } finally {
    setFormLoading(loginForm, false)
  }
})

async function redirectIfAlreadyLoggedIn() {
  try {
    await getCurrentUser()
    window.location.replace(APP_CONFIG.routes.mainMenu)
  } catch {
    // User is not logged in. Stay on login page.
  }
}