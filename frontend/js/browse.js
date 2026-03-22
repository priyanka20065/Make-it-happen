const flatGrid = document.getElementById("flatGrid")
const resultCount = document.getElementById("resultCount")
const applyFiltersButton = document.getElementById("applyFilters")
const roomsTab = document.getElementById("roomsTab")
const roommatesTab = document.getElementById("roommatesTab")

let activeView = "rooms"
let browseStream

const controls = {
  searchInput: document.getElementById("searchInput"),
  flatType: document.getElementById("flatType"),
  minRent: document.getElementById("minRent"),
  maxRent: document.getElementById("maxRent"),
  cleanliness: document.getElementById("cleanliness"),
  socialLevel: document.getElementById("socialLevel"),
  studyHabits: document.getElementById("studyHabits"),
  interest: document.getElementById("interest"),
}

function applyQueryPreferences() {
  const params = new URLSearchParams(window.location.search)
  const flatType = params.get("flatType")
  const view = String(params.get("view") || "").trim().toLowerCase()
  const query = String(params.get("q") || "").trim()

  if (flatType && controls.flatType) {
    controls.flatType.value = flatType
  }

  if (query && controls.searchInput) {
    controls.searchInput.value = query
  }

  if (view === "roommates") {
    activeView = "roommates"
    roomsTab.classList.remove("active-tab")
    roommatesTab.classList.add("active-tab")
  }

  if (params.get("seeker") === "single") {
    activeView = "rooms"
    roomsTab.classList.add("active-tab")
    roommatesTab.classList.remove("active-tab")
    roommatesTab.classList.add("hidden")
  }
}

function renderRooms(flats) {
  if (!Array.isArray(flats) || !flats.length) {
    flatGrid.innerHTML = '<p class="empty-state">No rooms found. Try different filters.</p>'
    resultCount.textContent = "0 results"
    return
  }

  flatGrid.innerHTML = flats
    .map((flat) => {
      const [flatLat, flatLng] = Array.isArray(flat.location?.coordinates) ? flat.location.coordinates : []
      const flatMapHref =
        Number.isFinite(Number(flatLat)) && Number.isFinite(Number(flatLng))
          ? `https://www.google.com/maps/search/?api=1&query=${flatLat},${flatLng}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(flat.location.address)}`

      const statusBadge = flat.stats?.isSold
        ? `<span class="badge badge-sold">Sold to ${flat.stats?.purchasedByName || "buyer"}</span>`
        : '<span class="badge badge-available">Available</span>'

      return `
      <article class="flat-card">
        <img src="${flat.images?.[0] || "/assets/modern-apartment-living.png"}" alt="${flat.title}" class="flat-image" />
        <div class="flat-content">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
            <h3><a href="/flat/${flat.id}">${flat.title}</a></h3>
            ${statusBadge}
          </div>
          <p class="muted" style="margin-top: -0.25rem;"><small>${flat.location.address}</small></p>
          <p class="text-justify" style="font-size: 0.9rem; line-height: 1.4;">${flat.description}</p>
          
          <div style="margin: 0.5rem 0;">
            <span class="price-tag">${window.AppUtils.formatINR(flat.rent)}</span>
            <span class="muted">/ month</span>
          </div>

          <p class="muted"><small>${flat.flatType === "room-only" ? "Room Only" : "Room with Roommates"}</small></p>
          <p class="muted"><small>Owner: ${flat.ownerName}</small></p>
          
          ${flat.flatType === "room-with-roommates" && flat.roommateProfiles.length
          ? `<span class="trait-label">Roommates</span>
                 <div class="chip-list">${flat.roommateProfiles
            .map((roommate) => `<span class="chip">${roommate.name} (${roommate.course})</span>`)
            .join("")}</div>`
          : ""
        }
          
          <div class="card-footer">
            <a class="btn btn-secondary small-btn" style="flex: 1; text-align: center;" href="${flatMapHref}" target="_blank" rel="noreferrer">Map</a>
            <a class="btn btn-primary small-btn" style="flex: 1.5; text-align: center; margin-left: 0.5rem;" href="/flat/${flat.id}">Details</a>
          </div>
        </div>
      </article>
    `
    })
    .join("")

  resultCount.textContent = `${flats.length} result${flats.length > 1 ? "s" : ""}`
}

function renderRoommates(roommates) {
  if (!Array.isArray(roommates) || !roommates.length) {
    flatGrid.innerHTML = '<p class="empty-state">No roommates found. Try different filters.</p>'
    resultCount.textContent = "0 results"
    return
  }

  flatGrid.innerHTML = roommates
    .map(
      (roommate) => {
        const [roommateLat, roommateLng] = Array.isArray(roommate.mapCoordinates)
          ? roommate.mapCoordinates
          : Array.isArray(roommate.location?.coordinates)
            ? roommate.location.coordinates
            : []
        const mapQuery =
          roommate.address ||
          roommate.location?.address ||
          roommate.displayAddress ||
          roommate.linkedFlatAddress ||
          roommate.institutionAddress ||
          "Campus Area"
        const hasPreciseAddress = Boolean(mapQuery && mapQuery !== "Campus Area")
        const roommateMapHref = hasPreciseAddress
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
          : Number.isFinite(Number(roommateLat)) && Number.isFinite(Number(roommateLng))
            ? `https://www.google.com/maps/search/?api=1&query=${roommateLat},${roommateLng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
        const distanceLine =
          typeof roommate.distanceToInstitutionKm === "number"
            ? `${roommate.distanceToInstitutionKm} km from ${roommate.institutionAddress || roommate.institution?.address || "your institution"}`
            : "Distance info unavailable"

        return `
      <article class="flat-card">
        <img src="${roommate.images?.[0] || "/assets/modern-apartment-living.png"}" alt="${roommate.name}" class="flat-image" />
        <div class="flat-content">
          <h3>${roommate.name}</h3>
          <p class="muted" style="margin-top: -0.25rem;"><small>${mapQuery}</small></p>
          <p class="text-justify" style="font-size: 0.9rem; line-height: 1.4;">${roommate.bio}</p>
          
          <div style="margin: 0.5rem 0;">
            <span class="muted" style="font-size: 0.8rem;">Max Budget:</span>
            <span class="price-tag">${window.AppUtils.formatINR(roommate.preferredRentMax)}</span>
          </div>

          <span class="trait-label">Traits & Distances</span>
          <p class="muted" style="margin: 0;"><small>${distanceLine}</small></p>
          <div class="chip-list" style="margin-top: 0.4rem;">
            <span class="chip">Cleanliness: ${roommate.personality.cleanliness}/10</span>
            <span class="chip">Social: ${roommate.personality.socialLevel}/10</span>
          </div>

          <span class="trait-label">Interests</span>
          <div class="chip-list">${roommate.interests.map((interest) => `<span class="chip">${interest}</span>`).join("")}</div>
          
          <div class="card-footer">
            <a class="btn btn-secondary small-btn" style="flex: 1; text-align: center;" href="${roommateMapHref}" target="_blank" rel="noreferrer">Map</a>
            <a class="btn btn-primary small-btn" style="flex: 1.5; text-align: center; margin-left: 0.5rem;" href="/roommate/${encodeURIComponent(roommate.id)}">Details</a>
          </div>
        </div>
      </article>
    `
      },
    )
    .join("")

  resultCount.textContent = `${roommates.length} result${roommates.length > 1 ? "s" : ""}`
}

function setActiveTab(view) {
  activeView = view
  roomsTab.classList.toggle("active-tab", view === "rooms")
  roommatesTab.classList.toggle("active-tab", view === "roommates")
  loadData()
}

async function loadData() {
  const params = new URLSearchParams({
    q: controls.searchInput.value.trim(),
    minRent: controls.minRent.value || "0",
    maxRent: controls.maxRent.value || "999999",
    cleanliness: controls.cleanliness.value || "1",
    socialLevel: controls.socialLevel.value || "1",
    studyHabits: controls.studyHabits.value || "1",
    interest: controls.interest.value.trim(),
    interests: controls.interest.value.trim(),
  })

  if (activeView === "rooms") {
    params.set("flatType", controls.flatType.value)
    const response = await fetch(`/api/flats?${params.toString()}`)
    if (!response.ok) {
      flatGrid.innerHTML = '<p class="empty-state">Failed to load rooms.</p>'
      resultCount.textContent = "Error"
      return
    }

    const flats = await response.json()
    renderRooms(flats)
    return
  }

  const response = await fetch(`/api/roommates?${params.toString()}`)
  if (!response.ok) {
    flatGrid.innerHTML = '<p class="empty-state">Failed to load roommates.</p>'
    resultCount.textContent = "Error"
    return
  }

  const roommates = await response.json()
  renderRoommates(roommates)
}

roomsTab.addEventListener("click", () => setActiveTab("rooms"))
roommatesTab.addEventListener("click", () => setActiveTab("roommates"))
applyFiltersButton.addEventListener("click", loadData)
window.addEventListener("DOMContentLoaded", () => {
  applyQueryPreferences()
  loadData()

  browseStream = new EventSource("/api/stream/browse")
  browseStream.addEventListener("browse-update", () => {
    loadData()
  })
})

window.addEventListener("beforeunload", () => {
  if (browseStream) {
    browseStream.close()
  }
})
