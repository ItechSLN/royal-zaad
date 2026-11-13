import axios from "axios";

/**
 * What a signed-in account may do. Role names are editable rows; the kind is
 * what the API authorizes on: CUSTOMER, VENDOR (shop owner) or STAFF (back office).
 */
export type RoleKind = "CUSTOMER" | "VENDOR" | "STAFF";
export const isStaffKind = (kind?: string | null) => kind === "STAFF";
export const isVendorKind = (kind?: string | null) => kind === "VENDOR";

/** Endpoints where a 401 is an expected answer, not an expired session. */
const AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/admin/signin",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/vendor/signin",
  "/auth/register-vendor",
  "/auth/verify-email",
];

/** Vendor pages that work without a session. */
const VENDOR_PUBLIC_PATHS = ["/vendor/login", "/vendor/register", "/vendor/verify-email"];

const clearSession = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("authToken");
};

/**
 * Sends the browser to the login screen that matches the area being used, so
 * an expired admin session doesn't dump the user on the storefront.
 */
const redirectToLogin = () => {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (pathname === "/vendor" || pathname.startsWith("/vendor/")) {
    if (!VENDOR_PUBLIC_PATHS.includes(pathname)) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- hard reload drops the stale session
      window.location.assign("/vendor/login");
    }
    return;
  }
  if (pathname.startsWith("/admin")) {
    if (pathname !== "/admin/login") {
      window.location.assign("/admin/login");
    }
    return;
  }
  if (pathname.startsWith("/account") || pathname.startsWith("/checkout")) {
    const next = encodeURIComponent(`${pathname}${search}`);
    window.location.assign(`/auth/login?next=${next}`);
  }
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;

  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASEURL || "http://localhost:8080/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(new ApiError(0, "Unable to connect to the server."));
    }

    const { status, data } = error.response;
    const url: string = error.config?.url ?? "";
    const isAuthCall = AUTH_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));

    // An expired/invalid token, or a session without the required role, should
    // end the session rather than leaving the UI to render empty error states.
    // Exception: a 403 on an action (anything but a read) answers that action —
    // e.g. "only Admins can approve vendors", or a product the marketplace
    // removed — so the screen shows the message instead of leaving the page.
    const method = (error.config?.method ?? "get").toLowerCase();
    const isActionRefusal = status === 403 && method !== "get";
    if ((status === 401 || status === 403) && !isAuthCall && !isActionRefusal) {
      if (status === 401) clearSession();
      redirectToLogin();
    }

    switch (status) {
      case 400:
        return Promise.reject(new ApiError(status, data.message, data.errors ?? {}));

      case 401:
        return Promise.reject(new ApiError(status, data.message || "Unauthorized"));

      case 403:
        return Promise.reject(new ApiError(status, data.message || "Forbidden"));

      case 404:
        return Promise.reject(new ApiError(status, data.message || "Resource not found"));

      case 429:
        return Promise.reject(
          new ApiError(status, "Too many attempts. Please wait a minute and try again.")
        );

      case 500:
        return Promise.reject(new ApiError(status, "Internal server error"));

      default:
        return Promise.reject(new ApiError(status, data.message || "Something went wrong"));
    }
  }
);

