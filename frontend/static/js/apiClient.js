import { APP_CONFIG } from "./config.js";

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error(data?.error || "Request failed.");
  }

  return data;
}

const parseJson = async (response) => {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return null;
  }

  return response.json();
}