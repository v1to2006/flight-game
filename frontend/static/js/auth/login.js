import { APP_CONFIG } from "../config.js";
import { loginUser } from "../authApi.js";
import { clearMessage, getInputValue, setFormLoading, showMessage } from "../formUtils.js";

const loginForm = document.querySelector("[data-login-form]");
const statusMessage = document.querySelector("[data-status-message]");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearMessage(statusMessage);
  setFormLoading(loginForm, true);

	const username = getInputValue(loginForm, "username").toLowerCase();
	const password = getInputValue(loginForm, "password");

  try {
    await loginUser({ username, password });

    window.location.href = APP_CONFIG.routes.home;
  } catch (error) {
    showMessage(statusMessage, error.message);
  } finally {
    setFormLoading(loginForm, false);
  }
});