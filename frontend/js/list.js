const ownerTab = document.getElementById("ownerTab")
const roommateTab = document.getElementById("roommateTab")
const ownerForm = document.getElementById("ownerForm")
const roommateForm = document.getElementById("roommateForm")
const listStatus = document.getElementById("listStatus")
const selectLocationBtn = document.getElementById("selectLocationBtn")
const ownerAddressInput = document.getElementById("ownerAddressInput")
const ownerSubmitBtn = document.getElementById("ownerSubmitBtn")
const ownerListingsPanel = document.getElementById("ownerListingsPanel")
const ownerListingsList = document.getElementById("ownerListingsList")
const listHeroTitle = document.querySelector(".list-hero h1")
const listHeroSubtitle = document.querySelector(".list-hero p")
const ownerImagesInput = document.getElementById("ownerImagesInput")
const ownerTourInput = document.getElementById("ownerTourInput")
const ownerImagesCount = document.getElementById("ownerImagesCount")
const ownerTourCount = document.getElementById("ownerTourCount")
const ownerExistingImages = document.getElementById("ownerExistingImages")
const ownerExistingTours = document.getElementById("ownerExistingTours")
const roommateSubmitBtn = document.getElementById("roommateSubmitBtn")
const roommateImagesInput = document.getElementById("roommateImagesInput")
const roommateTourInput = document.getElementById("roommateTourInput")
const roommateImagesCount = document.getElementById("roommateImagesCount")
const roommateTourCount = document.getElementById("roommateTourCount")
const roommateExistingImages = document.getElementById("roommateExistingImages")
const roommateExistingTours = document.getElementById("roommateExistingTours")
const roommateAddressInput = document.getElementById("roommateAddressInput")
const selectRoommateLocationBtn = document.getElementById("selectRoommateLocationBtn")

const currentUser = window.AppUtils.getCurrentUser()
let editingFlatId = ""
let editingImages = []
let editingTourUrls = []
let ownerSelectedImageFiles = []
let ownerSelectedTourFiles = []
let roommateSelectedImageFiles = []
let roommateSelectedTourFiles = []
let editingRoommateId = ""
let editingRoommateImages = []
let editingRoommateTourUrl = null
let editingRoommateTourUrls = []

function todayDateISO() {
  return new Date().toISOString().slice(0, 10)
}

function renderEditableMediaChips(container, items, removeType) {
  if (!container) {
    return
  }

  if (!Array.isArray(items) || !items.length) {
    container.innerHTML = ""
    return
  }

  container.innerHTML = items
    .map(
      (url, index) =>
        `<button class="btn btn-light small-btn" type="button" data-remove-type="${removeType}" data-remove-index="${index}">Remove ${index + 1}</button>`,
    )
    .join("")
}

function renderOwnerEditableMedia() {
  renderEditableMediaChips(ownerExistingImages, editingImages, "owner-image")
  renderEditableMediaChips(ownerExistingTours, editingTourUrls, "owner-tour")
}

function renderRoommateEditableMedia() {
  renderEditableMediaChips(roommateExistingImages, editingRoommateImages, "roommate-image")
  renderEditableMediaChips(roommateExistingTours, editingRoommateTourUrls, "roommate-tour")
}

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function mergeSelectedFiles(existing, incoming, maxCount = 20) {
  const map = new Map(existing.map((file) => [fileKey(file), file]))
  incoming.forEach((file) => {
    map.set(fileKey(file), file)
  })
  return Array.from(map.values()).slice(0, maxCount)
}

function updateOwnerFileCounters() {
  if (ownerImagesCount) {
    const existingCount = editingFlatId ? editingImages.length : 0
    ownerImagesCount.textContent = `${ownerSelectedImageFiles.length} new${editingFlatId ? ` • ${existingCount} existing` : ""}`
  }
  if (ownerTourCount) {
    const existingCount = editingFlatId ? editingTourUrls.length : 0
    ownerTourCount.textContent = `${ownerSelectedTourFiles.length} new${editingFlatId ? ` • ${existingCount} existing` : ""}`
  }
}

function bindOwnerFileInputs() {
  ownerImagesInput?.addEventListener("change", () => {
    const picked = Array.from(ownerImagesInput.files || [])
    ownerSelectedImageFiles = mergeSelectedFiles(ownerSelectedImageFiles, picked, 20)
    if (ownerImagesInput) {
      ownerImagesInput.value = ""
    }
    updateOwnerFileCounters()
  })

  ownerTourInput?.addEventListener("change", () => {
    const picked = Array.from(ownerTourInput.files || [])
    ownerSelectedTourFiles = mergeSelectedFiles(ownerSelectedTourFiles, picked, 20)
    if (ownerTourInput) {
      ownerTourInput.value = ""
    }
    updateOwnerFileCounters()
  })

  updateOwnerFileCounters()
}

function updateRoommateFileCounters() {
  if (roommateImagesCount) {
    const existingCount = editingRoommateId ? editingRoommateImages.length : 0
    roommateImagesCount.textContent = `${roommateSelectedImageFiles.length} new${editingRoommateId ? ` • ${existingCount} existing` : ""}`
  }
  if (roommateTourCount) {
    const existingCount = editingRoommateId ? editingRoommateTourUrls.length : 0
    roommateTourCount.textContent = `${roommateSelectedTourFiles.length} new${editingRoommateId ? ` • ${existingCount} existing` : ""}`
  }
}

function bindRoommateFileInputs() {
  roommateImagesInput?.addEventListener("change", () => {
    const picked = Array.from(roommateImagesInput.files || [])
    roommateSelectedImageFiles = mergeSelectedFiles(roommateSelectedImageFiles, picked, 20)
    if (roommateImagesInput) {
      roommateImagesInput.value = ""
    }
    updateRoommateFileCounters()
  })

  roommateTourInput?.addEventListener("change", () => {
    const picked = Array.from(roommateTourInput.files || [])
    roommateSelectedTourFiles = mergeSelectedFiles(roommateSelectedTourFiles, picked, 20)
    if (roommateTourInput) {
      roommateTourInput.value = ""
    }
    updateRoommateFileCounters()
  })

  updateRoommateFileCounters()
}

function resolveListingMode() {
  const role = String(currentUser?.role || "").toLowerCase()
  const intent = String(currentUser?.intent || "").toLowerCase()
  const preferredRoomType = String(currentUser?.preferredRoomType || "").toLowerCase()

  if (role === "owner" || intent === "owner") {
    return "owner"
  }

  if (role === "student" || (intent === "seeker" && preferredRoomType === "room-only")) {
    return "student"
  }

  if (role === "roommate" || preferredRoomType === "room-with-roommates") {
    return "roommate"
  }

  return "student"
}

function lockTabsForMode(mode) {
  if (mode === "owner") {
    ownerTab.classList.remove("hidden")
    roommateTab.classList.add("hidden")
    ownerForm.classList.remove("hidden")
    roommateForm.classList.add("hidden")
    listHeroTitle.textContent = "List Your Property"
    listHeroSubtitle.textContent = "Owner listing form"
    return
  }

  if (mode === "roommate") {
    ownerTab.classList.add("hidden")
    roommateTab.classList.remove("hidden")
    ownerForm.classList.add("hidden")
    roommateForm.classList.remove("hidden")
    ownerListingsPanel?.classList.add("hidden")
    listHeroTitle.textContent = "Create Roommate Profile"
    listHeroSubtitle.textContent = "Roommate listing form"
    prefillRoommateFormFromProfile()
    loadMyRoommateListing()
  }
}

function applyRoommateListingToForm(listing) {
  if (!roommateForm || !listing) {
    return
  }

  editingRoommateId = listing.id
  editingRoommateImages = Array.isArray(listing.images) ? listing.images : []
  editingRoommateTourUrl = listing.virtualTourUrl || null
  editingRoommateTourUrls = Array.isArray(listing.virtualTourUrls)
    ? listing.virtualTourUrls
    : listing.virtualTourUrl
      ? [listing.virtualTourUrl]
      : []
  roommateSelectedImageFiles = []
  roommateSelectedTourFiles = []
  updateRoommateFileCounters()

  const setValue = (name, value) => {
    const node = roommateForm.querySelector(`[name="${name}"]`)
    if (!node) {
      return
    }
    node.value = value ?? ""
  }

  setValue("name", listing.name)
  setValue("age", listing.age)
  setValue("course", listing.course)
  setValue("bio", listing.bio)
  setValue("preferredRentMax", listing.preferredRentMax)
  setValue("maxOccupants", listing.maxOccupants ?? 1)
  setValue("cleanliness", listing.personality?.cleanliness ?? 5)
  setValue("socialLevel", listing.personality?.socialLevel ?? 5)
  setValue("studyHabits", listing.personality?.studyHabits ?? 5)
  setValue("address", listing.location?.address || listing.address || "")
  setValue("moveInDate", listing.moveInDate || todayDateISO())

  const [lat, lng] = listing.location?.coordinates || []
  setValue("lat", lat ?? "")
  setValue("lng", lng ?? "")

  const interests = Array.isArray(listing.interests) ? listing.interests : []
  roommateForm.querySelectorAll('input[name="interest"]').forEach((checkbox) => {
    checkbox.checked = interests.includes(checkbox.value)
  })

  if (roommateSubmitBtn) {
    roommateSubmitBtn.textContent = "Update Profile"
  }

  renderRoommateEditableMedia()
}

async function loadMyRoommateListing() {
  if (!currentUser?.id) {
    return
  }

  try {
    const listings = await window.AppUtils.api(`/api/list/roommate/${encodeURIComponent(currentUser.id)}`)
    if (!Array.isArray(listings) || !listings.length) {
      editingRoommateId = ""
      editingRoommateImages = []
      editingRoommateTourUrl = null
      editingRoommateTourUrls = []
      roommateSelectedImageFiles = []
      roommateSelectedTourFiles = []
      updateRoommateFileCounters()
      if (roommateSubmitBtn) {
        roommateSubmitBtn.textContent = "Create Profile"
      }
      renderRoommateEditableMedia()
      return
    }

    applyRoommateListingToForm(listings[0])
    listStatus.textContent = "You already have one roommate listing. You can update it below."
  } catch {
    // Keep form usable if listing lookup fails
  }
}

async function prefillRoommateFormFromProfile() {
  if (!currentUser?.id || !roommateForm) {
    return
  }

  try {
    const profile = await window.AppUtils.api(`/api/profile/${currentUser.id}`)

    const setValue = (name, value) => {
      const node = roommateForm.querySelector(`[name="${name}"]`)
      if (!node || value === undefined || value === null) {
        return
      }
      node.value = value
    }

    setValue("name", profile.name || "")
    setValue("course", profile.course || "")
    setValue("bio", profile.bio || "")
    setValue("cleanliness", profile.personality?.cleanliness ?? 5)
    setValue("socialLevel", profile.personality?.socialLevel ?? 5)
    setValue("studyHabits", profile.personality?.studyHabits ?? 5)

    const profileInterests = Array.isArray(profile.interests) ? profile.interests.map((item) => String(item)) : []
    if (profileInterests.length) {
      roommateForm.querySelectorAll('input[name="interest"]').forEach((checkbox) => {
        checkbox.checked = profileInterests.includes(checkbox.value)
      })
    }
  } catch {
    // Keep form editable even if profile prefill fails
  }
}

function switchTab(type) {
  ownerTab.classList.toggle("active-tab", type === "owner")
  roommateTab.classList.toggle("active-tab", type === "roommate")
  ownerForm.classList.toggle("hidden", type !== "owner")
  roommateForm.classList.toggle("hidden", type !== "roommate")
  listStatus.textContent = ""
}

function applyUserFlow() {
  if (!currentUser?.id) {
    window.location.href = "/login"
    return
  }

  const listingMode = resolveListingMode()

  if (listingMode === "student") {
    listStatus.textContent = "Students cannot create listings. Redirecting to browse..."
    ownerForm.classList.add("hidden")
    roommateForm.classList.add("hidden")
    ownerTab.classList.add("hidden")
    roommateTab.classList.add("hidden")
    ownerListingsPanel?.classList.add("hidden")
    setTimeout(() => {
      window.location.href = "/browse"
    }, 400)
    return
  }

  const params = new URLSearchParams(window.location.search)
  const mode = params.get("mode")

  if (mode === "owner" && listingMode === "owner") {
    lockTabsForMode("owner")
    switchTab("owner")
    loadOwnerListings()
    return
  }

  if (mode === "roommate" && listingMode === "roommate") {
    lockTabsForMode("roommate")
    switchTab("roommate")
    return
  }

  if (listingMode === "owner") {
    lockTabsForMode("owner")
    switchTab("owner")
    loadOwnerListings()
    return
  }

  if (listingMode === "roommate") {
    lockTabsForMode("roommate")
    switchTab("roommate")
  }
}

async function loadOwnerListings() {
  if (!currentUser?.id || currentUser.intent !== "owner") {
    ownerListingsPanel?.classList.add("hidden")
    return
  }

  ownerListingsPanel?.classList.remove("hidden")

  try {
    const listings = await window.AppUtils.api(`/api/list/owner/${currentUser.id}`)
    if (!Array.isArray(listings) || !listings.length) {
      ownerListingsList.innerHTML = '<p class="muted">No flats listed yet.</p>'
      return
    }

    ownerListingsList.innerHTML = listings
      .map(
        (flat) => `
          <article class="conversation-card" data-flat-id="${flat.id}">
            <div class="conversation-content">
              <h3>${flat.title}</h3>
              <p class="muted">${flat.location.address}</p>
              <p><strong>${window.AppUtils.formatINR(flat.rent)}</strong> / month</p>
            </div>
            <div class="chip-list">
              <button class="btn btn-light small-btn" type="button" data-edit-flat="${flat.id}">Update</button>
              <button class="btn btn-dark small-btn" type="button" data-delete-flat="${flat.id}">Delete</button>
            </div>
          </article>
        `,
      )
      .join("")

    ownerListingsList.querySelectorAll("[data-edit-flat]").forEach((button) => {
      button.addEventListener("click", () => {
        const flat = listings.find((item) => item.id === button.dataset.editFlat)
        if (!flat) {
          return
        }

        editingFlatId = flat.id
        editingImages = Array.isArray(flat.images) ? flat.images : []
        editingTourUrls = Array.isArray(flat.virtualTourUrls)
          ? flat.virtualTourUrls
          : flat.virtualTourUrl
            ? [flat.virtualTourUrl]
            : []

        ownerForm.querySelector('input[name="title"]').value = flat.title || ""
        ownerForm.querySelector('textarea[name="description"]').value = flat.description || ""
        ownerForm.querySelector('input[name="address"]').value = flat.location?.address || ""
        ownerForm.querySelector('input[name="rent"]').value = flat.rent || ""
        const flatTypeInput = ownerForm.querySelector('input[name="flatType"]')
        if (flatTypeInput) {
          flatTypeInput.value = "room-only"
        }
        ownerForm.querySelector('input[name="availableFrom"]').value = flat.availableFrom || ""

        const [lat, lng] = flat.location?.coordinates || []
        ownerForm.querySelector('input[name="lat"]').value = lat ?? ""
        ownerForm.querySelector('input[name="lng"]').value = lng ?? ""

        ownerForm.querySelectorAll('input[name="amenities"]').forEach((checkbox) => {
          checkbox.checked = (flat.amenities || []).includes(checkbox.value)
        })

        if (ownerSubmitBtn) {
          ownerSubmitBtn.textContent = "Update Property"
        }

        ownerSelectedImageFiles = []
        ownerSelectedTourFiles = []
        updateOwnerFileCounters()
        renderOwnerEditableMedia()

        listStatus.textContent = "Editing listing. Keep minimum 2 normal photos and 2 panoramic photos."
        switchTab("owner")
        window.scrollTo({ top: 0, behavior: "smooth" })
      })
    })

    ownerListingsList.querySelectorAll("[data-delete-flat]").forEach((button) => {
      button.addEventListener("click", async () => {
        const flatId = button.dataset.deleteFlat
        if (!flatId) {
          return
        }

        if (!window.confirm("Delete this listing? This will also remove related chats.")) {
          return
        }

        try {
          await window.AppUtils.api(`/api/list/owner/${flatId}?ownerId=${encodeURIComponent(currentUser.id)}`, {
            method: "DELETE",
          })

          if (editingFlatId === flatId) {
            editingFlatId = ""
            editingImages = []
            editingTourUrls = []
            ownerSelectedImageFiles = []
            ownerSelectedTourFiles = []
            ownerForm.reset()
            updateOwnerFileCounters()
            renderOwnerEditableMedia()
            if (ownerSubmitBtn) {
              ownerSubmitBtn.textContent = "List Property"
            }
          }

          listStatus.textContent = "Listing deleted successfully."
          loadOwnerListings()
        } catch (error) {
          listStatus.textContent = error.message
        }
      })
    })
  } catch (error) {
    ownerListingsList.innerHTML = `<p class="muted">${error.message}</p>`
  }
}

ownerTab.addEventListener("click", () => switchTab("owner"))
roommateTab.addEventListener("click", () => switchTab("roommate"))

document.addEventListener("click", (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) {
    return
  }

  const removeType = target.dataset.removeType
  const removeIndex = Number(target.dataset.removeIndex)
  if (!removeType || Number.isNaN(removeIndex)) {
    return
  }

  if (removeType === "owner-image") {
    editingImages = editingImages.filter((_item, index) => index !== removeIndex)
    updateOwnerFileCounters()
    renderOwnerEditableMedia()
    return
  }

  if (removeType === "owner-tour") {
    editingTourUrls = editingTourUrls.filter((_item, index) => index !== removeIndex)
    updateOwnerFileCounters()
    renderOwnerEditableMedia()
    return
  }

  if (removeType === "roommate-image") {
    editingRoommateImages = editingRoommateImages.filter((_item, index) => index !== removeIndex)
    updateRoommateFileCounters()
    renderRoommateEditableMedia()
    return
  }

  if (removeType === "roommate-tour") {
    editingRoommateTourUrls = editingRoommateTourUrls.filter((_item, index) => index !== removeIndex)
    editingRoommateTourUrl = editingRoommateTourUrls[0] || null
    updateRoommateFileCounters()
    renderRoommateEditableMedia()
  }
})

async function uploadImages(files, tourFiles) {
  const formData = new FormData()
  files.slice(0, 20).forEach((file) => {
    formData.append("images", file)
  })

  tourFiles.slice(0, 20).forEach((file) => {
    formData.append("tour360", file)
  })

  const response = await fetch("/api/upload/images", {
    method: "POST",
    body: formData,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message || "Image upload failed")
  }

  return payload
}

function parseOptionalNumber(value) {
  const normalized = String(value || "").trim()
  if (!normalized) {
    return undefined
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

selectLocationBtn?.addEventListener("click", () => {
  const address = String(ownerAddressInput?.value || "").trim()
  const target = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "https://www.google.com/maps"

  window.open(target, "_blank", "noopener,noreferrer")
  listStatus.textContent = "Map opened. Copy coordinates and paste in Latitude/Longitude if needed."
})

selectRoommateLocationBtn?.addEventListener("click", () => {
  const address = String(roommateAddressInput?.value || "").trim()
  const target = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "https://www.google.com/maps"

  window.open(target, "_blank", "noopener,noreferrer")
  listStatus.textContent = "Map opened. Copy coordinates and paste in Latitude/Longitude if needed."
})

ownerForm.addEventListener("submit", async (event) => {
  event.preventDefault()
  const formData = new FormData(ownerForm)
  const ownerImageInputForSubmit = ownerForm.querySelector('input[name="images"]')
  const ownerTourInputForSubmit = ownerForm.querySelector('input[name="tour360"]')
  const imageFiles = ownerSelectedImageFiles.length
    ? ownerSelectedImageFiles
    : Array.from(ownerImageInputForSubmit?.files || [])
  const tourFiles = ownerSelectedTourFiles.length
    ? ownerSelectedTourFiles
    : Array.from(ownerTourInputForSubmit?.files || [])
  const selectedAmenities = Array.from(ownerForm.querySelectorAll('input[name="amenities"]:checked')).map(
    (checkbox) => checkbox.value,
  )

  const payload = {
    ownerId: String(currentUser?.id || "").trim() || undefined,
    ownerEmail: String(currentUser?.email || "").trim() || undefined,
    ownerName: String(formData.get("ownerName") || currentUser?.name || "Owner").trim(),
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    lat: parseOptionalNumber(formData.get("lat")),
    lng: parseOptionalNumber(formData.get("lng")),
    rent: Number(formData.get("rent") || 0),
    flatType: "room-only",
    availableFrom: String(formData.get("availableFrom") || ""),
    amenities: selectedAmenities,
    images: [],
    virtualTourUrls: [],
    virtualTourUrl: null,
  }

  try {
    let upload = null
    if (imageFiles.length || tourFiles.length) {
      upload = await uploadImages(imageFiles, tourFiles)
    }

    payload.images = imageFiles.length ? upload?.images || [] : editingFlatId ? editingImages : []
    payload.virtualTourUrls = tourFiles.length
      ? upload?.tour360Urls || []
      : editingFlatId
        ? editingTourUrls
        : []
    payload.virtualTourUrl = payload.virtualTourUrls[0] || null

    if (payload.images.length < 2) {
      listStatus.textContent = "Please keep at least 2 normal property photos."
      return
    }

    if (payload.virtualTourUrls.length < 2) {
      listStatus.textContent = "Please keep at least 2 panoramic 360 photos."
      return
    }

    if (editingFlatId) {
      await window.AppUtils.api(`/api/list/owner/${editingFlatId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
      listStatus.textContent = "Listing updated successfully."
      editingFlatId = ""
      editingImages = []
      editingTourUrls = []
      if (ownerSubmitBtn) {
        ownerSubmitBtn.textContent = "List Property"
      }
      renderOwnerEditableMedia()
    } else {
      await window.AppUtils.api("/api/list/owner", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      listStatus.textContent = "Owner listing submitted. It is now visible in Browse → Rooms."
    }

    ownerForm.reset()
    ownerSelectedImageFiles = []
    ownerSelectedTourFiles = []
    if (!editingFlatId) {
      editingImages = []
      editingTourUrls = []
    }
    updateOwnerFileCounters()
    renderOwnerEditableMedia()
    switchTab("owner")
    loadOwnerListings()
  } catch (error) {
    listStatus.textContent = error.message
  }
})

roommateForm.addEventListener("submit", async (event) => {
  event.preventDefault()
  const formData = new FormData(roommateForm)
  const roommateImageInputForSubmit = roommateForm.querySelector('input[name="images"]')
  const roommateTourInputForSubmit = roommateForm.querySelector('input[name="tour360"]')
  const imageFiles = roommateSelectedImageFiles.length
    ? roommateSelectedImageFiles
    : Array.from(roommateImageInputForSubmit?.files || [])
  const tourFiles = roommateSelectedTourFiles.length
    ? roommateSelectedTourFiles
    : Array.from(roommateTourInputForSubmit?.files || [])
  const interests = Array.from(roommateForm.querySelectorAll('input[name="interest"]:checked')).map(
    (checkbox) => checkbox.value,
  )

  const payload = {
    userId: String(currentUser?.id || "").trim() || undefined,
    name: String(formData.get("name") || "").trim(),
    age: Number(formData.get("age") || 20),
    course: String(formData.get("course") || "").trim(),
    bio: String(formData.get("bio") || "").trim(),
    preferredRentMax: Number(formData.get("preferredRentMax") || 0),
    maxOccupants: Number(formData.get("maxOccupants") || 1),
    address: String(formData.get("address") || "").trim(),
    lat: parseOptionalNumber(formData.get("lat")),
    lng: parseOptionalNumber(formData.get("lng")),
    interests: interests.join(", "),
    cleanliness: Number(formData.get("cleanliness") || 5),
    socialLevel: Number(formData.get("socialLevel") || 5),
    studyHabits: Number(formData.get("studyHabits") || 5),
    images: [],
    virtualTourUrls: [],
    virtualTourUrl: null,
  }

  try {
    if (!payload.address) {
      listStatus.textContent = "Please add roommate listing address so it can be visible on map."
      return
    }

    let upload = null
    if (imageFiles.length || tourFiles.length) {
      upload = await uploadImages(imageFiles, tourFiles)
    }

    payload.images = imageFiles.length ? upload?.images || [] : editingRoommateId ? editingRoommateImages : []
    payload.virtualTourUrls = tourFiles.length
      ? upload?.tour360Urls || []
      : editingRoommateId
        ? editingRoommateTourUrls
        : []
    payload.virtualTourUrl = tourFiles.length
      ? upload?.tour360Url || null
      : editingRoommateId
        ? editingRoommateTourUrl
        : null

    if (payload.images.length < 2) {
      listStatus.textContent = "Please upload at least 2 profile photos."
      return
    }

    if (!payload.virtualTourUrl || payload.virtualTourUrls.length < 2) {
      listStatus.textContent = "Please upload at least 2 panoramic 360 photos."
      return
    }

    if (editingRoommateId) {
      await window.AppUtils.api(`/api/list/roommate/${editingRoommateId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
      listStatus.textContent = "Roommate profile updated successfully."
    } else {
      await window.AppUtils.api("/api/list/roommate", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      listStatus.textContent = "Roommate profile submitted. It is now visible in Browse → Roommates."
    }

    roommateForm.reset()
    roommateSelectedImageFiles = []
    roommateSelectedTourFiles = []
    updateRoommateFileCounters()
    editingRoommateId = ""
    editingRoommateImages = []
    editingRoommateTourUrl = null
    editingRoommateTourUrls = []
    if (roommateSubmitBtn) {
      roommateSubmitBtn.textContent = "Create Profile"
    }
    renderRoommateEditableMedia()
    prefillRoommateFormFromProfile()
    loadMyRoommateListing()
    switchTab("roommate")
  } catch (error) {
    listStatus.textContent = error.message
  }
})

applyUserFlow()
bindOwnerFileInputs()
bindRoommateFileInputs()
renderOwnerEditableMedia()
renderRoommateEditableMedia()
