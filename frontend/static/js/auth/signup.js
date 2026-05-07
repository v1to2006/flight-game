import { APP_CONFIG } from "../config.js"
import { getCurrentUser, signupUser } from "../authApi.js"
import { clearMessage, getInputValue, setFormLoading, showMessage } from "../formUtils.js"

const signupForm = document.querySelector("[data-signup-form]")
const statusMessage = document.querySelector("[data-status-message]")

redirectIfAlreadyLoggedIn()

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault()

  clearMessage(statusMessage)

  try {
    const username = getInputValue(signupForm, "username").toLowerCase()
    const password = getInputValue(signupForm, "password")
    const confirmPassword = getInputValue(signupForm, "confirmPassword")

    if (password !== confirmPassword) {
      showMessage(statusMessage, "Passwords do not match")
      return
    }

    setFormLoading(signupForm, true)

    await signupUser({ username, password })

    showMessage(statusMessage, "Account created. Redirecting to login...", "success")

    setTimeout(() => {
      window.location.replace(APP_CONFIG.routes.login)
    }, 900)
  } catch (error) {
    showMessage(statusMessage, error.message || "Sign up failed")
  } finally {
    setFormLoading(signupForm, false)
  }
})

async function redirectIfAlreadyLoggedIn() {
  try {
    await getCurrentUser()
    window.location.replace(APP_CONFIG.routes.mainMenu)
  } catch {
    // User is not logged in. Stay on sign up page.
  }
}