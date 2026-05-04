import { apiRequest } from "./apiClient.js"

export const signupUser = ({ username, password }) => {
	return apiRequest("/auth/register", {
		method: "POST",
		body: JSON.stringify({ username, password }),
	})
}

export const loginUser = ({ username, password }) => {
	return apiRequest("/auth/login", {
		method: "POST",
		body: JSON.stringify({ username, password }),
	})
}

export const getCurrentUser = () => {
	return apiRequest("/auth/me")
}

export const logoutUser = () => {
	return apiRequest("/auth/logout", {
		method: "POST",
	})
}
