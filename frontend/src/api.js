const FAVORITES_KEY = "sff_favorite_flats"
const USER_KEY = "sff_user"

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setCurrentUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_KEY)
}

export async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  }

  const response = await fetch(path, {
    ...options,
    headers,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message || "Request failed")
  }

  return payload
}

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body: body instanceof FormData ? body : JSON.stringify(body) }),
  del: (path, body, options) => request(path, { ...options, method: "DELETE", body: body instanceof FormData ? body : JSON.stringify(body) }),
}

export function formatINR(value) {
  const number = Number(value || 0)
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(number)
}

export function buildMapHref(address, coordinates) {
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const [lat, lng] = coordinates
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    }
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "Campus Area")}`
}

export function getRoleFlags(user) {
  const role = String(user?.role || "").toLowerCase()
  const intent = String(user?.intent || "").toLowerCase()
  const preferredRoomType = String(user?.preferredRoomType || "").toLowerCase()
  const isOwner = role === "owner" || intent === "owner"
  const isStudent = Boolean(user) && !isOwner && (role === "student" || (intent === "seeker" && preferredRoomType === "room-only"))
  const isRoommate = Boolean(user) && !isOwner && !isStudent && (role === "roommate" || preferredRoomType === "room-with-roommates")
  return { isOwner, isStudent, isRoommate }
}

export function redirectAfterAuth(user) {
  const intent = String(user?.intent || "").toLowerCase()
  const preferredRoomType = String(user?.preferredRoomType || "").toLowerCase()

  if (intent !== "owner" && preferredRoomType === "room-only") {
    return "/personality-quiz?onboarding=1"
  }

  return "/dashboard"
}

export function getFavoriteIds() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")
  } catch {
    return []
  }
}

export function setFavoriteIds(ids) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...new Set(ids)]))
}

export function toggleFavoriteId(id) {
  const normalizedId = String(id || "").trim()
  if (!normalizedId) {
    return []
  }

  const ids = new Set(getFavoriteIds())
  if (ids.has(normalizedId)) {
    ids.delete(normalizedId)
  } else {
    ids.add(normalizedId)
  }

  const nextIds = [...ids]
  setFavoriteIds(nextIds)
  return nextIds
}

function appendFiles(formData, fieldName, files) {
  Array.from(files || []).forEach((file) => {
    formData.append(fieldName, file)
  })
}

export async function uploadListingMedia({ images = [], tour360 = [] }) {
  const formData = new FormData()
  appendFiles(formData, "images", images)
  appendFiles(formData, "tour360", tour360)
  return request("/api/upload/images", { method: "POST", body: formData })
}
