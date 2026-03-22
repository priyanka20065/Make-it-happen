const mapList = document.getElementById("mapList")
const mapSearch = document.getElementById("mapSearch")
const mapCount = document.getElementById("mapCount")
const mapFrame = document.getElementById("mapFrame")
const selectedTitle = document.getElementById("selectedTitle")
const selectedAddress = document.getElementById("selectedAddress")
const selectedRent = document.getElementById("selectedRent")
const openDirections = document.getElementById("openDirections")

let allFlats = []
let filteredFlats = []
let activeFlatId = ""
let stream

function toMapItem(entry, type = "flat") {
  if (type === "roommate") {
    const [lat, lng] = Array.isArray(entry.mapCoordinates)
      ? entry.mapCoordinates
      : Array.isArray(entry.location?.coordinates)
        ? entry.location.coordinates
        : []

    const hasCoordinates = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
    return {
      id: `roommate:${entry.id}`,
      rawId: entry.id,
      type,
      title: `${entry.name} (Roommate)`,
      address: entry.address || entry.location?.address || entry.displayAddress || entry.linkedFlatAddress || "Campus Area",
      prefersAddressQuery: Boolean(entry.address || entry.location?.address),
      rentText: `${window.AppUtils.formatINR(entry.preferredRentMax)} max budget / month`,
      coordinates: hasCoordinates ? [Number(lat), Number(lng)] : null,
    }
  }

  const [lat, lng] = Array.isArray(entry.location?.coordinates) ? entry.location.coordinates : []
  return {
    id: `flat:${entry.id}`,
    rawId: entry.id,
    type,
    title: entry.title,
    address: entry.location?.address || "Address not available",
    prefersAddressQuery: true,
    rentText: `${window.AppUtils.formatINR(entry.rent)} / month`,
    coordinates: Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) ? [Number(lat), Number(lng)] : null,
  }
}

function mapEmbedUrl(item) {
  if (item.prefersAddressQuery && item.address) {
    return `https://www.google.com/maps?q=${encodeURIComponent(item.address)}&z=14&output=embed`
  }

  if (Array.isArray(item.coordinates) && item.coordinates.length === 2) {
    const [lat, lng] = item.coordinates
    return `https://www.google.com/maps?q=${lat},${lng}&z=14&output=embed`
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(item.address)}&z=14&output=embed`
}

function mapDirectionsUrl(item) {
  if (item.prefersAddressQuery && item.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`
  }

  if (Array.isArray(item.coordinates) && item.coordinates.length === 2) {
    const [lat, lng] = item.coordinates
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`
}

function setSelectedFlat(item) {
  if (!item) {
    return
  }

  activeFlatId = item.id
  selectedTitle.textContent = item.title
  selectedAddress.textContent = item.address
  selectedRent.textContent = item.rentText
  mapFrame.src = mapEmbedUrl(item)
  openDirections.href = mapDirectionsUrl(item)

  const items = mapList.querySelectorAll("li")
  items.forEach((item) => {
    item.classList.toggle("active-map-item", item.dataset.id === activeFlatId)
  })
}

function renderList(flats) {
  filteredFlats = flats
  mapCount.textContent = `${flats.length} listing${flats.length === 1 ? "" : "s"}`

  if (!flats.length) {
    mapList.innerHTML = '<li class="muted">No listings found.</li>'
    selectedTitle.textContent = "Select a listing"
    selectedAddress.textContent = "-"
    selectedRent.textContent = "-"
    mapFrame.removeAttribute("src")
    openDirections.setAttribute("href", "#")
    return
  }

  mapList.innerHTML = flats
    .map(
      (flat) => `
      <li data-id="${flat.id}" class="map-item-card">
        <strong>${flat.title}</strong>
        <p class="muted">${flat.address}</p>
        <p>${flat.rentText}</p>
      </li>
    `,
    )
    .join("")

  mapList.querySelectorAll("li[data-id]").forEach((item) => {
    item.addEventListener("click", () => {
      const flat = flats.find((entry) => entry.id === item.dataset.id)
      setSelectedFlat(flat)
    })
  })

  const selectedFromCurrent = flats.find((flat) => flat.id === activeFlatId)
  setSelectedFlat(selectedFromCurrent || flats[0])
}

function applyFilter() {
  const query = mapSearch.value.trim().toLowerCase()
  if (!query) {
    renderList(allFlats)
    return
  }

  const results = allFlats.filter(
    (flat) =>
      flat.title.toLowerCase().includes(query) ||
      flat.address.toLowerCase().includes(query),
  )

  renderList(results)
}

async function loadMapData() {
  const [flatResponse, roommateResponse] = await Promise.all([fetch("/api/flats"), fetch("/api/roommates")])
  if (!flatResponse.ok || !roommateResponse.ok) {
    mapCount.textContent = "Failed to load listings"
    mapList.innerHTML = '<li class="muted">Could not load map data.</li>'
    return
  }

  const [flats, roommates] = await Promise.all([flatResponse.json(), roommateResponse.json()])
  const flatItems = Array.isArray(flats) ? flats.map((entry) => toMapItem(entry, "flat")) : []
  const roommateItems = Array.isArray(roommates) ? roommates.map((entry) => toMapItem(entry, "roommate")) : []
  allFlats = [...flatItems, ...roommateItems]
  applyFilter()
}

window.addEventListener("DOMContentLoaded", () => {
  loadMapData()
  mapSearch.addEventListener("input", applyFilter)

  stream = new EventSource("/api/stream/browse")
  stream.addEventListener("browse-update", () => {
    loadMapData()
  })
})

window.addEventListener("beforeunload", () => {
  if (stream) {
    stream.close()
  }
})
