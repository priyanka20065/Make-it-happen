
module.exports = function (app, ctx) {
  const {
    state,
    dbCollections,
    FREE_CHAT_LIMIT,
    mongoUri,
    mongoEnabled,
    imageUpload,
    razorpayEnabled,
    razorpay,
    mailEnabled,
    sendEmail,
    crypto,
    CAMPUS,
    sanitizeUser,
    makeId,
    toNumber,
    normalizeSubscriptionPlan,
    getSubscriptionDurationDays,
    getSubscriptionExpiry,
    getSubscriptionLockState,
    activateSubscription,
    toOptionalCoordinatePair,
    normalizeCoordinatePair,
    normalizeTourUrl,
    normalizeTourUrls,
    normalizeImageUrls,
    stripMongoId,
    normalizeFlat,
    normalizeRoommate,
    normalizeFlatMetrics,
    haversineDistanceKm,
    getFlatMetrics,
    getUniqueUserMessageCount,
    getOwnerFlatStats,
    getPurchasedFlatIdByUser,
    getRoommateJoinedUserIds,
    hasUserBookedAnyRoommate,
    isEligibleStudentBuyer,
    hasAnyRoomBookedByUser,
    hasRoommateSeatAvailable,
    getUserActivityCounts,
    enrichFlat,
    enrichRoommate,
    isAppGeneratedListingId,
    isActiveOwnerListing,
    isActiveRoommateListing,
    pruneUnsupportedListingsFromState,
    profileToScore,
    pushSseEvent,
    broadcastBrowseUpdate,
    broadcastChatUpdate,
    persistUser,
    persistFlat,
    deleteFlat,
    deleteChat,
    persistRoommate,
    persistChatMessages,
    persistFlatMetrics,
    deleteFlatMetrics,
    browseSubscribers,
    chatSubscribers
  } = ctx;

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      mongo: {
        configured: Boolean(mongoUri),
        connected: mongoEnabled,
      },
    })
  })

  app.get("/api/stream/browse", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders()

    browseSubscribers.add(res)
    pushSseEvent(res, "connected", { ok: true })

    req.on("close", () => {
      browseSubscribers.delete(res)
    })
  })

  app.post(
    "/api/upload/images",
    imageUpload.fields([
      { name: "images", maxCount: 20 },
      { name: "tour360", maxCount: 20 },
    ]),
    (req, res) => {
      const files = req.files || {}
      const imageFiles = Array.isArray(files.images) ? files.images : []
      const tourFiles = Array.isArray(files.tour360) ? files.tour360 : []

      const images = imageFiles.map((file) => `/uploads/${file.filename}`)
      const tour360Urls = tourFiles.map((file) => `/uploads/${file.filename}`)
      const tour360Url = tour360Urls[0] || null

      res.status(201).json({ images, tour360Urls, tour360Url })
    },
  )

  app.post("/api/auth/signup", async (req, res) => {
    const { name, email, password, intent, preferredRoomType, university, course, bio, interests, personality } = req.body || {}
    if (!name || !email || !password || !intent) {
      res.status(400).json({ message: "name, email, password and intent are required" })
      return
    }

    if (intent === "seeker" && !preferredRoomType) {
      res.status(400).json({ message: "preferredRoomType is required for seekers" })
      return
    }

    if (intent === "seeker" && String(preferredRoomType || "") === "room-only" && !String(university || "").trim()) {
      res.status(400).json({ message: "University / College name is required for normal students" })
      return
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const existingUser = Array.from(state.users.values()).find((item) => item.email === normalizedEmail)

    if (existingUser) {
      res.status(409).json({ message: "Account already exists. Please login." })
      return
    }

    const user = {
      id: makeId("usr"),
      name: String(name).trim(),
      email: normalizedEmail,
      password: String(password),
      role: intent === "owner" ? "owner" : "roommate",
      intent,
      preferredRoomType: preferredRoomType || null,
      university: String(university || "").trim(),
      interests: Array.isArray(interests)
        ? interests.map((item) => String(item).trim()).filter(Boolean)
        : String(interests || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      course: String(course || "").trim(),
      bio: String(bio || "").trim(),
      personality: {
        cleanliness: toNumber(personality?.cleanliness, 5),
        socialLevel: toNumber(personality?.socialLevel, 5),
        studyHabits: toNumber(personality?.studyHabits, 5),
      },
      subscription: {
        plan: "Free",
        active: false,
        activatedAt: null,
      },
    }

    state.users.set(user.id, user)

    try {
      await persistUser(user)
    } catch (error) {
      console.error("Failed to persist user:", error.message)
    }

    const normalizedIntent = String(intent || "").trim().toLowerCase()
    const normalizedPreferredRoomType = String(preferredRoomType || "").trim().toLowerCase()
    const welcomeUserType =
      normalizedIntent === "owner"
        ? "flat listing owner"
        : normalizedPreferredRoomType === "room-with-roommates"
          ? "roommate listing student"
          : "student seeker"

    const emailSent = await sendEmail({
      to: user.email,
      subject: "Welcome to Student Flat Finder 🎉",
      text: `Hi ${user.name},\n\nWelcome to Student Flat Finder. Your account is ready as ${welcomeUserType}. You can now continue with your selected flow.\n\n- Team Student Flat Finder`,
      html: `<p>Hi <strong>${user.name}</strong>,</p><p>Welcome to <strong>Student Flat Finder</strong>. Your account is ready as <strong>${welcomeUserType}</strong>. You can now continue with your selected flow.</p><p>— Team Student Flat Finder</p>`,
    })

    res.status(201).json({
      ...sanitizeUser(user),
      emailNotification: !mailEnabled ? "email-disabled" : emailSent ? "welcome-email-sent" : "welcome-email-failed",
    })
  })

  app.post("/api/auth/login", async (req, res) => {
    const { email, password, intent, preferredRoomType } = req.body || {}
    if (!email || !password) {
      res.status(400).json({ message: "email and password are required" })
      return
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const user = Array.from(state.users.values()).find((item) => item.email === normalizedEmail)

    if (!user) {
      res.status(401).json({ message: "Account not found. Please sign up first." })
      return
    }

    if (user.password !== String(password)) {
      res.status(401).json({ message: "Invalid password" })
      return
    }

    if (intent) {
      user.intent = intent
      user.role = intent === "owner" ? "owner" : "roommate"
    }

    if (preferredRoomType) {
      user.preferredRoomType = preferredRoomType
    }

    if (intent || preferredRoomType) {
      try {
        await persistUser(user)
      } catch (error) {
        console.error("Failed to persist user login updates:", error.message)
      }
    }

    res.json(sanitizeUser(user))
  })

  app.get("/api/profile/:userId", (req, res) => {
    const user = state.users.get(req.params.userId)
    if (!user) {
      res.status(404).json({ message: "User not found" })
      return
    }
    res.json(sanitizeUser(user))
  })

  app.get("/api/dashboard/activity/:userId", (req, res) => {
    const user = state.users.get(req.params.userId)
    if (!user) {
      res.status(404).json({ message: "User not found" })
      return
    }

    res.json(getUserActivityCounts(req.params.userId))
  })

  app.put("/api/profile/:userId", async (req, res) => {
    const user = state.users.get(req.params.userId)
    if (!user) {
      res.status(404).json({ message: "User not found" })
      return
    }

    const payload = req.body || {}
    const isOwner = String(user.role || user.intent || "").toLowerCase() === "owner"
    const preferredRoomType = String(user.preferredRoomType || payload.preferredRoomType || "").toLowerCase()
    const isNormalStudent = !isOwner && preferredRoomType === "room-only"

    const nextUniversity = payload.university ?? user.university ?? ""
    if (isNormalStudent && !String(nextUniversity || "").trim()) {
      res.status(400).json({ message: "University / College name is required for normal students" })
      return
    }

    user.name = payload.name ?? user.name
    user.phone = payload.phone ?? user.phone ?? ""
    user.university = payload.university ?? user.university ?? ""
    user.course = payload.course ?? user.course
    user.year = payload.year ?? user.year ?? ""
    user.bio = payload.bio ?? user.bio
    user.interests = Array.isArray(payload.interests) ? payload.interests : user.interests

    const normalizedRole = String(user.role || user.intent || "").toLowerCase()
    if (normalizedRole === "owner" && payload.ownerProfile) {
      user.ownerProfile = {
        businessName: String(payload.ownerProfile.businessName ?? user.ownerProfile?.businessName ?? "").trim(),
        experienceYears: toNumber(payload.ownerProfile.experienceYears, toNumber(user.ownerProfile?.experienceYears, 0)),
        preferredContact: String(payload.ownerProfile.preferredContact ?? user.ownerProfile?.preferredContact ?? "").trim(),
        officeAddress: String(payload.ownerProfile.officeAddress ?? user.ownerProfile?.officeAddress ?? "").trim(),
      }
    }

    if (payload.personality) {
      user.personality = {
        cleanliness: toNumber(payload.personality.cleanliness, user.personality.cleanliness),
        socialLevel: toNumber(payload.personality.socialLevel, user.personality.socialLevel),
        studyHabits: toNumber(payload.personality.studyHabits, user.personality.studyHabits),
      }
    }

    try {
      await persistUser(user)
    } catch (error) {
      console.error("Failed to persist profile update:", error.message)
    }

    res.json(sanitizeUser(user))
  })

  app.post("/api/subscription/activate", async (req, res) => {
    const payload = req.body || {}
    const userId = String(payload.userId || "")
    const plan = String(payload.plan || "Premium")

    if (!userId) {
      res.status(400).json({ message: "userId is required" })
      return
    }

    const user = state.users.get(userId)
    if (!user) {
      res.status(404).json({ message: "User not found" })
      return
    }

    const lockState = getSubscriptionLockState(user)
    if (lockState.active) {
      res.status(409).json({
        message: `Subscription already active until ${new Date(lockState.expiresAt).toLocaleDateString("en-IN")}`,
      })
      return
    }

    activateSubscription(user, plan)

    try {
      await persistUser(user)
    } catch (error) {
      console.error("Failed to persist subscription:", error.message)
    }

    res.json(sanitizeUser(user))
  })

  app.get("/api/flats", (req, res) => {
    const query = String(req.query.q || "").trim().toLowerCase()
    const flatType = String(req.query.flatType || "all")
    const minRent = toNumber(req.query.minRent, 0)
    const maxRent = toNumber(req.query.maxRent, Number.MAX_SAFE_INTEGER)
    const maxDistance = toNumber(req.query.maxDistance, Number.MAX_SAFE_INTEGER)
    const cleanliness = toNumber(req.query.cleanliness, 0)
    const socialLevel = toNumber(req.query.socialLevel, 0)
    const studyHabits = toNumber(req.query.studyHabits, 0)
    const interests = String(req.query.interests || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)

    const results = state.flats
      .filter((flat) => isActiveOwnerListing(flat))
      .map(enrichFlat)
      .filter((flat) => {
        const queryMatch =
          !query || flat.title.toLowerCase().includes(query) || flat.location.address.toLowerCase().includes(query)
        const typeMatch = flatType === "all" || flat.flatType === flatType
        const rentMatch = flat.rent >= minRent && flat.rent <= maxRent
        const distanceMatch = flat.distanceFromCampusKm <= maxDistance

        const roommateProfiles = flat.roommateProfiles || []
        const personalityMatch =
          cleanliness === 0 && socialLevel === 0 && studyHabits === 0
            ? true
            : roommateProfiles.length === 0
              ? true
              : roommateProfiles.some(
                (roommate) =>
                  roommate.personality.cleanliness >= cleanliness &&
                  roommate.personality.socialLevel >= socialLevel &&
                  roommate.personality.studyHabits >= studyHabits,
              )

        const interestMatch =
          interests.length === 0 ||
          roommateProfiles.length === 0 ||
          roommateProfiles.some((roommate) =>
            roommate.interests.some((interest) => interests.includes(String(interest).toLowerCase())),
          )

        return queryMatch && typeMatch && rentMatch && distanceMatch && personalityMatch && interestMatch
      })

    res.json(results)
  })

  app.get("/api/flats/:id", (req, res) => {
    const flat = state.flats.find((item) => item.id === req.params.id)
    if (!flat || !isActiveOwnerListing(flat)) {
      res.status(404).json({ message: "Flat not found" })
      return
    }
    res.json(enrichFlat(flat))
  })

  app.post("/api/flats/:id/view", async (req, res) => {
    const flat = state.flats.find((item) => item.id === req.params.id)
    if (!flat || !isActiveOwnerListing(flat)) {
      res.status(404).json({ message: "Flat not found" })
      return
    }

    const viewerUserId = String(req.body?.viewerUserId || "").trim()
    if (!viewerUserId || viewerUserId === String(flat.ownerId || "").trim()) {
      res.json(enrichFlat(flat))
      return
    }

    const metrics = getFlatMetrics(flat.id)
    if (!metrics.viewedBy.includes(viewerUserId)) {
      metrics.viewedBy.push(viewerUserId)
      state.flatMetrics[flat.id] = metrics

      try {
        await persistFlatMetrics(flat.id)
      } catch (error) {
        console.error("Failed to persist flat view metrics:", error.message)
      }
    }

    res.json(enrichFlat(flat))
  })

  app.post("/api/flats/:id/like", async (req, res) => {
    const flat = state.flats.find((item) => item.id === req.params.id)
    if (!flat || !isActiveOwnerListing(flat)) {
      res.status(404).json({ message: "Flat not found" })
      return
    }

    const userId = String(req.body?.userId || "").trim()
    if (!userId || userId === String(flat.ownerId || "").trim()) {
      res.status(400).json({ message: "Valid non-owner userId is required" })
      return
    }

    const metrics = getFlatMetrics(flat.id)
    const likedIndex = metrics.likedBy.indexOf(userId)
    const liked = likedIndex === -1

    if (liked) {
      metrics.likedBy.push(userId)
    } else {
      metrics.likedBy.splice(likedIndex, 1)
    }

    state.flatMetrics[flat.id] = metrics

    try {
      await persistFlatMetrics(flat.id)
    } catch (error) {
      console.error("Failed to persist flat like metrics:", error.message)
    }

    res.json({
      liked,
      flat: enrichFlat(flat),
    })
  })

  app.get("/api/roommates", (req, res) => {
    const query = String(req.query.q || "").trim().toLowerCase()
    const maxRent = toNumber(req.query.maxRent, Number.MAX_SAFE_INTEGER)
    const cleanliness = toNumber(req.query.cleanliness, 0)
    const socialLevel = toNumber(req.query.socialLevel, 0)
    const studyHabits = toNumber(req.query.studyHabits, 0)
    const interest = String(req.query.interest || "").trim().toLowerCase()

    const results = state.roommates.filter((roommate) => {
      if (!isActiveRoommateListing(roommate)) {
        return false
      }

      const queryMatch =
        !query ||
        roommate.name.toLowerCase().includes(query) ||
        roommate.course.toLowerCase().includes(query) ||
        roommate.bio.toLowerCase().includes(query)

      const rentMatch = roommate.preferredRentMax <= maxRent
      const personalityMatch =
        roommate.personality.cleanliness >= cleanliness &&
        roommate.personality.socialLevel >= socialLevel &&
        roommate.personality.studyHabits >= studyHabits

      const interestMatch =
        !interest || roommate.interests.some((item) => String(item).toLowerCase().includes(interest))

      return queryMatch && rentMatch && personalityMatch && interestMatch
    })

    res.json(results.map(enrichRoommate))
  })

  app.get("/api/roommates/:id", (req, res) => {
    const roommateId = String(req.params.id || "").trim()
    if (!roommateId) {
      res.status(400).json({ message: "Roommate id is required" })
      return
    }

    const roommate = state.roommates.find((item) => item.id === roommateId)
    if (!roommate || !isActiveRoommateListing(roommate)) {
      res.status(404).json({ message: "Roommate not found" })
      return
    }

    res.json(enrichRoommate(roommate))
  })

  app.get("/api/list/roommate/:userId", (req, res) => {
    const userId = String(req.params.userId || "").trim()
    if (!userId) {
      res.status(400).json({ message: "userId is required" })
      return
    }

    const listings = state.roommates.filter(
      (item) => String(item.createdByUserId || "") === userId && isActiveRoommateListing(item),
    )
    res.json(listings.map(enrichRoommate))
  })

  app.post("/api/list/owner", async (req, res) => {
    const payload = req.body || {}
    if (!payload.title || !payload.address || !payload.rent || !payload.ownerName) {
      res.status(400).json({ message: "title, address, rent and ownerName are required" })
      return
    }

    const listingVirtualTours = normalizeTourUrls(payload.virtualTourUrls || payload.virtualTourUrl)

    const listing = {
      id: makeId("flat"),
      title: String(payload.title),
      description: String(payload.description || "Listed by owner"),
      rent: toNumber(payload.rent, 0),
      location: {
        address: String(payload.address),
        coordinates: [toNumber(payload.lat, CAMPUS.lat), toNumber(payload.lng, CAMPUS.lng)],
      },
      amenities: Array.isArray(payload.amenities)
        ? payload.amenities
        : String(payload.amenities || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      images: normalizeImageUrls(payload.images),
      ownerId: String(payload.ownerId || makeId("owner")),
      ownerName: String(payload.ownerName),
      ownerEmail: String(payload.ownerEmail || "").trim().toLowerCase() || null,
      roommates: [],
      availableFrom: String(payload.availableFrom || new Date().toISOString().slice(0, 10)),
      flatType: "room-only",
      virtualTourUrls: listingVirtualTours,
      virtualTourUrl: listingVirtualTours[0] || null,
    }

    const ownerUser = listing.ownerId ? state.users.get(listing.ownerId) : null
    const ownerRole = String(ownerUser?.role || ownerUser?.intent || "").toLowerCase()
    if (!ownerUser || ownerRole !== "owner") {
      res.status(403).json({ message: "Only owners can create flat listings" })
      return
    }

    if (ownerUser) {
      listing.ownerName = ownerUser.name || listing.ownerName
      listing.ownerEmail = ownerUser.email || listing.ownerEmail
    }

    if (!listing.images.length) {
      listing.images = ["/assets/modern-apartment-living.png"]
    }

    if (listing.images.length < 2) {
      res.status(400).json({ message: "At least 2 normal property images are required" })
      return
    }

    if (listing.virtualTourUrls.length < 2) {
      res.status(400).json({ message: "At least 2 panoramic 360 images are required" })
      return
    }

    state.flats.unshift(listing)

    try {
      await persistFlat(listing)
    } catch (error) {
      console.error("Failed to persist owner listing:", error.message)
    }

    broadcastBrowseUpdate("owner-listing-added")
    res.status(201).json(enrichFlat(listing))
  })

  app.get("/api/list/owner/:ownerId", (req, res) => {
    const ownerId = String(req.params.ownerId || "").trim()
    if (!ownerId) {
      res.status(400).json({ message: "ownerId is required" })
      return
    }

    const listings = state.flats
      .filter((item) => String(item.ownerId || "") === ownerId && isActiveOwnerListing(item))
      .map(enrichFlat)
    res.json(listings)
  })

  app.put("/api/list/owner/:flatId", async (req, res) => {
    const flatId = String(req.params.flatId || "").trim()
    const payload = req.body || {}
    const ownerId = String(payload.ownerId || "").trim()

    if (!flatId || !ownerId) {
      res.status(400).json({ message: "flatId and ownerId are required" })
      return
    }

    const listing = state.flats.find((item) => item.id === flatId)
    if (!listing) {
      res.status(404).json({ message: "Listing not found" })
      return
    }

    if (String(listing.ownerId || "") !== ownerId) {
      res.status(403).json({ message: "You can edit only your own listing" })
      return
    }

    listing.title = String(payload.title || listing.title)
    listing.description = String(payload.description || listing.description)
    listing.rent = toNumber(payload.rent, listing.rent)
    listing.flatType = "room-only"
    listing.availableFrom = String(payload.availableFrom || listing.availableFrom)
    listing.amenities = Array.isArray(payload.amenities)
      ? payload.amenities
      : String(payload.amenities || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    listing.images = normalizeImageUrls(payload.images)
    const listingVirtualTours = normalizeTourUrls(payload.virtualTourUrls || payload.virtualTourUrl)
    listing.virtualTourUrls = listingVirtualTours
    listing.virtualTourUrl = listingVirtualTours[0] || null

    if (listing.images.length < 2) {
      res.status(400).json({ message: "At least 2 normal property images are required" })
      return
    }

    if (listing.virtualTourUrls.length < 2) {
      res.status(400).json({ message: "At least 2 panoramic 360 images are required" })
      return
    }

    if (payload.address) {
      listing.location.address = String(payload.address)
    }

    if (payload.lat !== undefined || payload.lng !== undefined) {
      listing.location.coordinates = [
        toNumber(payload.lat, listing.location.coordinates[0]),
        toNumber(payload.lng, listing.location.coordinates[1]),
      ]
    }

    try {
      await persistFlat(listing)
    } catch (error) {
      console.error("Failed to persist owner listing update:", error.message)
    }

    broadcastBrowseUpdate("owner-listing-updated")
    res.json(enrichFlat(listing))
  })

  app.delete("/api/list/owner/:flatId", async (req, res) => {
    const flatId = String(req.params.flatId || "").trim()
    const ownerId = String(req.query.ownerId || "").trim()

    if (!flatId || !ownerId) {
      res.status(400).json({ message: "flatId and ownerId are required" })
      return
    }

    const listingIndex = state.flats.findIndex((item) => item.id === flatId)
    if (listingIndex === -1) {
      res.status(404).json({ message: "Listing not found" })
      return
    }

    const listing = state.flats[listingIndex]
    if (String(listing.ownerId || "") !== ownerId) {
      res.status(403).json({ message: "You can delete only your own listing" })
      return
    }

    state.flats.splice(listingIndex, 1)
    delete state.chats[flatId]
    delete state.flatMetrics[flatId]

    try {
      await deleteFlat(flatId)
      await deleteChat(flatId)
      await deleteFlatMetrics(flatId)
    } catch (error) {
      console.error("Failed to delete owner listing:", error.message)
    }

    broadcastBrowseUpdate("owner-listing-deleted")
    res.json({ ok: true, deletedId: flatId })
  })

  app.post("/api/list/roommate", async (req, res) => {
    const payload = req.body || {}
    if (!payload.name || !payload.course || !payload.preferredRentMax) {
      res.status(400).json({ message: "name, course and preferredRentMax are required" })
      return
    }

    const listingAddress = String(payload.address || "").trim()
    if (!listingAddress) {
      res.status(400).json({ message: "address is required for roommate listing" })
      return
    }

    const createdByUserId = String(payload.userId || "").trim()
    if (!createdByUserId) {
      res.status(400).json({ message: "userId is required" })
      return
    }

    const existingListing = state.roommates.find((item) => String(item.createdByUserId || "") === createdByUserId)
    if (existingListing) {
      res.status(409).json({ message: "Student can list only one roommate profile" })
      return
    }

    const listingUser = state.users.get(createdByUserId)
    const listingUserRole = String(listingUser?.role || listingUser?.intent || "").toLowerCase()
    if (!listingUser || listingUserRole === "owner") {
      res.status(403).json({ message: "Only student roommate users can create this listing" })
      return
    }

    const normalizedImages = normalizeImageUrls(payload.images)
    const normalizedTourUrls = normalizeTourUrls(payload.virtualTourUrls || payload.virtualTourUrl)
    const normalizedTourUrl = normalizedTourUrls[0] || null
    const maxOccupants = Math.max(1, toNumber(payload.maxOccupants, 1))
    const listingCoordinates = toOptionalCoordinatePair(payload.lat, payload.lng)
    const institutionCoordinates = toOptionalCoordinatePair(payload.institutionLat, payload.institutionLng)
    const institutionAddress = String(payload.institutionAddress || listingUser?.university || "").trim()

    if (normalizedImages.length < 2) {
      res.status(400).json({ message: "At least 2 normal images are required" })
      return
    }

    const hasAtLeastTwoPanoramic = normalizedTourUrls.length >= 2
    if (!hasAtLeastTwoPanoramic) {
      res.status(400).json({ message: "At least 2 panoramic 360 images are required" })
      return
    }

    const roommate = {
      id: makeId("rm"),
      name: String(payload.name),
      age: toNumber(payload.age, 20),
      course: String(payload.course),
      bio: String(payload.bio || ""),
      preferredRentMax: toNumber(payload.preferredRentMax, 10000),
      maxOccupants,
      moveInDate: String(payload.moveInDate || new Date().toISOString().slice(0, 10)).trim(),
      interests: String(payload.interests || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      personality: {
        cleanliness: toNumber(payload.cleanliness, 5),
        socialLevel: toNumber(payload.socialLevel, 5),
        studyHabits: toNumber(payload.studyHabits, 5),
      },
      address: listingAddress,
      location: {
        address: listingAddress,
        coordinates: listingCoordinates,
      },
      institution: {
        address: institutionAddress,
        coordinates: institutionCoordinates,
      },
      images: normalizedImages,
      virtualTourUrls: normalizedTourUrls,
      virtualTourUrl: normalizedTourUrl,
      createdByUserId,
    }

    state.roommates.unshift(roommate)

    try {
      await persistRoommate(roommate)
    } catch (error) {
      console.error("Failed to persist roommate profile:", error.message)
    }

    if (payload.preferredFlatId) {
      const flat = state.flats.find((item) => item.id === payload.preferredFlatId)
      if (flat && flat.flatType === "room-with-roommates") {
        flat.roommates.push(roommate.id)

        try {
          await persistFlat(flat)
        } catch (error) {
          console.error("Failed to persist updated flat roommates:", error.message)
        }
      }
    }

    broadcastBrowseUpdate("roommate-added")

    res.status(201).json(roommate)
  })

  app.put("/api/list/roommate/:roommateId", async (req, res) => {
    const roommateId = String(req.params.roommateId || "").trim()
    const payload = req.body || {}
    const userId = String(payload.userId || "").trim()

    if (!roommateId || !userId) {
      res.status(400).json({ message: "roommateId and userId are required" })
      return
    }

    const roommate = state.roommates.find((item) => item.id === roommateId)
    if (!roommate) {
      res.status(404).json({ message: "Roommate listing not found" })
      return
    }

    if (String(roommate.createdByUserId || "") !== userId) {
      res.status(403).json({ message: "You can update only your own roommate listing" })
      return
    }

    const normalizedImages = normalizeImageUrls(payload.images)
    const normalizedTourUrls = normalizeTourUrls(payload.virtualTourUrls || payload.virtualTourUrl)
    const normalizedTourUrl = normalizedTourUrls[0] || null
    const nextAddress = String(payload.address || roommate.location?.address || "").trim()
    if (!nextAddress) {
      res.status(400).json({ message: "address is required for roommate listing" })
      return
    }

    const listingCoordinates = toOptionalCoordinatePair(payload.lat, payload.lng)
    const institutionCoordinates = toOptionalCoordinatePair(payload.institutionLat, payload.institutionLng)

    if (normalizedImages.length < 2) {
      res.status(400).json({ message: "At least 2 normal images are required" })
      return
    }

    const hasAtLeastTwoPanoramic = normalizedTourUrls.length >= 2
    if (!hasAtLeastTwoPanoramic) {
      res.status(400).json({ message: "At least 2 panoramic 360 images are required" })
      return
    }

    roommate.name = String(payload.name || roommate.name)
    roommate.age = toNumber(payload.age, roommate.age)
    roommate.course = String(payload.course || roommate.course)
    roommate.bio = String(payload.bio || roommate.bio)
    roommate.preferredRentMax = toNumber(payload.preferredRentMax, roommate.preferredRentMax)
    roommate.maxOccupants = Math.max(1, toNumber(payload.maxOccupants, roommate.maxOccupants || 1))
    roommate.moveInDate = String(payload.moveInDate || roommate.moveInDate || new Date().toISOString().slice(0, 10)).trim()
    roommate.interests = String(payload.interests || roommate.interests.join(","))
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    roommate.personality = {
      cleanliness: toNumber(payload.cleanliness, roommate.personality?.cleanliness || 5),
      socialLevel: toNumber(payload.socialLevel, roommate.personality?.socialLevel || 5),
      studyHabits: toNumber(payload.studyHabits, roommate.personality?.studyHabits || 5),
    }
    roommate.address = nextAddress
    roommate.location = {
      address: nextAddress,
      coordinates: listingCoordinates || normalizeCoordinatePair(roommate.location?.coordinates),
    }
    roommate.institution = {
      address: String(payload.institutionAddress || roommate.institution?.address || "").trim(),
      coordinates: institutionCoordinates || normalizeCoordinatePair(roommate.institution?.coordinates),
    }
    roommate.images = normalizedImages
    roommate.virtualTourUrls = normalizedTourUrls
    roommate.virtualTourUrl = normalizedTourUrl

    try {
      await persistRoommate(roommate)
    } catch (error) {
      console.error("Failed to persist roommate update:", error.message)
    }

    broadcastBrowseUpdate("roommate-updated")
    res.json(roommate)
  })

  app.post("/api/quiz/match", (req, res) => {
    const payload = req.body || {}
    const hasExplicitMinimumScore = payload.minimumScore !== undefined && payload.minimumScore !== null && payload.minimumScore !== ""
    const minimumScore = hasExplicitMinimumScore ? Math.max(0, Math.min(40, toNumber(payload.minimumScore, 0))) : 0
    const requestedUniversity = String(payload.university || payload.college || "").trim()

    const normalizeCollegeText = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/university|college|institute|campus|school/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()

    const normalizedRequestedUniversity = normalizeCollegeText(requestedUniversity)
    const preferences = {
      cleanliness: toNumber(payload.cleanliness, 5),
      socialLevel: toNumber(payload.socialLevel, 5),
      studyHabits: toNumber(payload.studyHabits, 5),
      interests: Array.isArray(payload.interests) ? payload.interests.map((item) => String(item).toLowerCase()) : [],
    }

    const ranked = state.flats
      .filter((flat) => isActiveOwnerListing(flat))
      .map(enrichFlat)
      .map((flat) => {
        const roommateScores = flat.roommateProfiles.map((roommate) => {
          const personalityScore = profileToScore(roommate.personality, preferences)
          const sharedInterests = roommate.interests.filter((interest) =>
            preferences.interests.includes(String(interest).toLowerCase()),
          ).length
          return personalityScore + sharedInterests * 2
        })

        const basePersonalityScore = roommateScores.length
          ? Math.max(...roommateScores)
          : profileToScore(
            {
              cleanliness: 5,
              socialLevel: 5,
              studyHabits: 5,
            },
            preferences,
          )

        const roommateInterestText = (flat.roommateProfiles || [])
          .flatMap((roommate) => (Array.isArray(roommate.interests) ? roommate.interests : []))
          .map((item) => String(item || "").toLowerCase())
          .join(" ")

        const searchableFlatText = [flat.title, flat.description, ...(flat.amenities || [])]
          .map((item) => String(item || "").toLowerCase())
          .join(" ")

        const searchableText = `${searchableFlatText} ${roommateInterestText}`

        const sharedFlatInterests = preferences.interests.filter((interest) => searchableText.includes(interest))
        const uniqueSharedFlatInterests = [...new Set(sharedFlatInterests)]

        const roommateCollegeValues = (flat.roommateProfiles || []).flatMap((roommate) => {
          const user = state.users.get(String(roommate.createdByUserId || ""))
          return [roommate.institution?.address, roommate.institutionAddress, user?.university, user?.officeAddress]
        })

        const collegeMatches = normalizedRequestedUniversity
          ? roommateCollegeValues.filter((collegeValue) => {
            const normalizedCollegeValue = normalizeCollegeText(collegeValue)
            if (!normalizedCollegeValue) {
              return false
            }
            return (
              normalizedCollegeValue.includes(normalizedRequestedUniversity) ||
              normalizedRequestedUniversity.includes(normalizedCollegeValue)
            )
          }).length
          : 0

        const sameCollegeMatch = collegeMatches > 0
        const collegeBoost = sameCollegeMatch ? 100 : 0
        const score = collegeBoost + basePersonalityScore + uniqueSharedFlatInterests.length * 2

        return {
          ...flat,
          matchScore: score,
          sameCollegeMatch,
          collegeMatchCount: collegeMatches,
          sharedInterests: uniqueSharedFlatInterests,
        }
      })
      .filter((flat) => {
        const hasInterestPreferences = preferences.interests.length > 0
        const hasRoommateProfiles = Array.isArray(flat.roommateProfiles) && flat.roommateProfiles.length > 0
        const hasSharedInterest = (flat.sharedInterests || []).length > 0
        const passesInterestRule =
          !hasInterestPreferences || hasSharedInterest || !hasRoommateProfiles || Boolean(flat.sameCollegeMatch)
        const passesScoreRule = !hasExplicitMinimumScore || flat.matchScore >= minimumScore
        return passesScoreRule && passesInterestRule
      })
      .sort((a, b) => {
        if (Boolean(b.sameCollegeMatch) !== Boolean(a.sameCollegeMatch)) {
          return Number(Boolean(b.sameCollegeMatch)) - Number(Boolean(a.sameCollegeMatch))
        }
        return b.matchScore - a.matchScore
      })

    res.json({
      preferences,
      minimumScore,
      recommendations: ranked,
    })
  })

  app.get("/api/chat/:flatId", (req, res) => {
    const flatId = req.params.flatId
    const messages = state.chats[flatId] || []
    res.json(messages)
  })

  app.get("/api/roommate-chat/:roommateId", (req, res) => {
    const roommateId = String(req.params.roommateId || "").trim()
    const viewerUserId = String(req.query.userId || "").trim()

    if (!roommateId) {
      res.status(400).json({ message: "roommateId is required" })
      return
    }

    if (!viewerUserId) {
      res.status(400).json({ message: "userId is required" })
      return
    }

    const roommate = state.roommates.find((item) => item.id === roommateId)
    if (!roommate) {
      res.status(404).json({ message: "Roommate listing not found" })
      return
    }

    const chatKey = `roommate:${roommateId}`
    const messages = state.chats[chatKey] || []
    const isListingOwner = String(roommate.createdByUserId || "") === viewerUserId

    if (isListingOwner) {
      res.json(messages)
      return
    }

    const visibleMessages = messages.filter(
      (message) =>
        String(message.senderUserId || "") === viewerUserId || String(message.recipientUserId || "") === viewerUserId,
    )
    res.json(visibleMessages)
  })

  app.post("/api/roommate-chat/:roommateId", async (req, res) => {
    const payload = req.body || {}
    const roommateId = String(req.params.roommateId || "").trim()
    const senderUserId = String(payload.senderUserId || "").trim()

    if (!roommateId || !payload.senderName || !payload.senderEmail || !payload.message || !senderUserId) {
      res.status(400).json({ message: "roommateId, senderName, senderEmail, senderUserId and message are required" })
      return
    }

    const roommate = state.roommates.find((item) => item.id === roommateId)
    if (!roommate) {
      res.status(404).json({ message: "Roommate listing not found" })
      return
    }

    const senderUser = state.users.get(senderUserId)
    if (!senderUser) {
      res.status(401).json({ message: "Please login to send messages." })
      return
    }

    const chatKey = `roommate:${roommateId}`
    const existingMessages = state.chats[chatKey] || []
    const previousMessage = existingMessages[existingMessages.length - 1]
    const hasPremium = Boolean(senderUser.subscription?.active)
    const senderMessageCount = existingMessages.filter((item) => item.senderUserId === senderUserId).length

    if (!hasPremium && senderMessageCount >= FREE_CHAT_LIMIT) {
      res.status(402).json({
        message: "Free chat limit reached. Upgrade subscription to continue chatting.",
        remaining: 0,
        requiresSubscription: true,
      })
      return
    }

    const isListingOwner = String(roommate.createdByUserId || "") === senderUserId
    let recipientUserId = String(payload.recipientUserId || "").trim()
    let recipientEmail = String(payload.recipientEmail || "")
      .trim()
      .toLowerCase()

    if (!isListingOwner) {
      const ownerUser = state.users.get(String(roommate.createdByUserId || ""))
      if (!ownerUser) {
        res.status(404).json({ message: "Listing owner not found" })
        return
      }

      recipientUserId = ownerUser.id
      recipientEmail = String(ownerUser.email || "")
        .trim()
        .toLowerCase()
    }

    if (isListingOwner && !recipientEmail) {
      const latestInbound = [...existingMessages]
        .reverse()
        .find((item) => item.senderUserId && item.senderUserId !== senderUserId)

      if (latestInbound) {
        recipientUserId = String(latestInbound.senderUserId || recipientUserId || "").trim()
        recipientEmail = String(latestInbound.senderEmail || recipientEmail || "").trim().toLowerCase()
      }
    }

    if (
      (recipientUserId && recipientUserId === senderUserId) ||
      (recipientEmail && recipientEmail === String(senderUser.email || "").trim().toLowerCase())
    ) {
      res.status(400).json({ message: "You cannot message yourself." })
      return
    }

    if (isListingOwner && !recipientUserId && !recipientEmail) {
      res.status(403).json({ message: "You can only reply when a student has messaged first." })
      return
    }

    const message = {
      id: makeId("msg"),
      senderName: String(payload.senderName),
      senderEmail: String(payload.senderEmail).trim().toLowerCase(),
      senderUserId,
      recipientUserId: recipientUserId || null,
      recipientEmail: recipientEmail || null,
      target: "roommate-owner",
      message: String(payload.message),
      createdAt: new Date().toISOString(),
    }

    if (!state.chats[chatKey]) {
      state.chats[chatKey] = []
    }

    state.chats[chatKey].push(message)

    try {
      await persistChatMessages(chatKey, state.chats[chatKey])
    } catch (error) {
      console.error("Failed to persist roommate chat message:", error.message)
    }

    const emailRecipient = message.recipientEmail || previousMessage?.senderEmail || null

    if (emailRecipient && emailRecipient !== message.senderEmail) {
      sendEmail({
        to: emailRecipient,
        subject: "You have a new roommate inquiry on Student Flat Finder",
        text: `Hi, ${message.senderName} sent a message: "${message.message}"`,
        html: `<p>Hi,</p><p><strong>${message.senderName}</strong> sent a message:</p><blockquote>${message.message}</blockquote>`,
      })
    }

    const sentCount = senderMessageCount + 1
    const remaining = !hasPremium ? Math.max(FREE_CHAT_LIMIT - sentCount, 0) : null
    res.status(201).json({ ...message, remaining, requiresSubscription: !hasPremium })
  })

  app.get("/api/chat/:flatId/stream", (req, res) => {
    const flatId = req.params.flatId

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders()

    if (!chatSubscribers[flatId]) {
      chatSubscribers[flatId] = new Set()
    }

    chatSubscribers[flatId].add(res)
    pushSseEvent(res, "connected", { ok: true, flatId })

    req.on("close", () => {
      chatSubscribers[flatId].delete(res)
    })
  })

  app.get("/api/payment/config", (_req, res) => {
    res.json({
      enabled: razorpayEnabled,
      keyId: process.env.RAZORPAY_KEY_ID || null,
    })
  })

  app.post("/api/payment/create-order", async (req, res) => {
    if (!razorpay) {
      res.status(503).json({ message: "Payment service is not configured" })
      return
    }

    const payload = req.body || {}
    const amount = toNumber(payload.amount, 0)
    const currency = String(payload.currency || "INR")
    const receipt = String(payload.receipt || makeId("receipt"))
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 40)
    const normalizedReceipt = receipt || makeId("receipt").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)
    const notes = payload.notes || {}
    const orderType = String(notes.type || "").trim()
    const subscriptionPlan = String(notes.plan || "").trim()
    const subscriptionUserId = String(notes.userId || "").trim()

    if (!orderType && subscriptionPlan) {
      const user = state.users.get(subscriptionUserId)
      if (!subscriptionUserId || !user) {
        res.status(400).json({ message: "Valid user is required for subscription payment" })
        return
      }

      const lockState = getSubscriptionLockState(user)
      if (lockState.active) {
        res.status(409).json({
          message: `You already have an active subscription until ${new Date(lockState.expiresAt).toLocaleDateString("en-IN")}`,
        })
        return
      }
    }

    if (orderType === "flat-purchase" || orderType === "room-booking") {
      const buyerUserId = String(notes.userId || "").trim()
      const flatId = String(notes.flatId || "").trim()
      const flat = state.flats.find((item) => item.id === flatId)

      if (!buyerUserId || !flatId || !flat || !isActiveOwnerListing(flat)) {
        res.status(400).json({ message: "Valid buyer and flat are required for purchase" })
        return
      }

      if (String(flat.ownerId || "") === buyerUserId) {
        res.status(400).json({ message: "You cannot buy your own listing" })
        return
      }

      if (!isEligibleStudentBuyer(buyerUserId)) {
        res.status(403).json({ message: "Only normal students can buy/book rooms" })
        return
      }

      const metrics = getFlatMetrics(flatId)
      if (metrics.purchasedByUserId) {
        res.status(409).json({ message: "This flat is already sold/booked" })
        return
      }

      const purchasedFlatId = getPurchasedFlatIdByUser(buyerUserId)
      if ((purchasedFlatId && purchasedFlatId !== flatId) || (!purchasedFlatId && hasUserBookedAnyRoommate(buyerUserId))) {
        res.status(409).json({ message: "One normal student can buy only one room" })
        return
      }
    }

    if (orderType === "roommate-booking") {
      const buyerUserId = String(notes.userId || "").trim()
      const roommateId = String(notes.roommateId || "").trim()
      const roommate = state.roommates.find((item) => item.id === roommateId)

      if (!buyerUserId || !roommateId || !roommate || !isActiveRoommateListing(roommate)) {
        res.status(400).json({ message: "Valid buyer and roommate listing are required for booking" })
        return
      }

      if (String(roommate.createdByUserId || "") === buyerUserId) {
        res.status(400).json({ message: "You cannot book your own listing" })
        return
      }

      if (!isEligibleStudentBuyer(buyerUserId)) {
        res.status(403).json({ message: "Only normal students can buy/book rooms" })
        return
      }

      const joinedUserIds = getRoommateJoinedUserIds(roommate)
      if (joinedUserIds.includes(buyerUserId)) {
        res.status(409).json({ message: "You have already joined this roommate listing" })
        return
      }

      if (!hasRoommateSeatAvailable(roommate)) {
        res.status(409).json({ message: "This roommate listing is full" })
        return
      }

      if (hasAnyRoomBookedByUser(buyerUserId)) {
        res.status(409).json({ message: "One normal student can buy only one room" })
        return
      }
    }

    if (!amount || amount <= 0) {
      res.status(400).json({ message: "Valid amount is required" })
      return
    }

    try {
      const order = await razorpay.orders.create({
        amount,
        currency,
        receipt: normalizedReceipt,
        notes,
      })
      res.status(201).json(order)
    } catch (error) {
      const reason =
        String(error?.error?.description || "").trim() ||
        String(error?.description || "").trim() ||
        String(error?.message || "").trim() ||
        "Unknown payment error"
      res.status(500).json({ message: `Failed to create payment order: ${reason}` })
    }
  })

  app.post("/api/payment/verify", async (req, res) => {
    if (!razorpayEnabled) {
      res.status(503).json({ message: "Payment service is not configured" })
      return
    }

    const payload = req.body || {}
    const orderId = String(payload.razorpay_order_id || "")
    const paymentId = String(payload.razorpay_payment_id || "")
    const signature = String(payload.razorpay_signature || "")
    const userId = String(payload.userId || "").trim()
    const plan = String(payload.plan || "").trim()

    if (!orderId || !paymentId || !signature) {
      res.status(400).json({ message: "Invalid payment verification payload" })
      return
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex")

    if (generatedSignature !== signature) {
      res.status(400).json({ verified: false, message: "Signature mismatch" })
      return
    }

    if (razorpay && orderId) {
      try {
        const order = await razorpay.orders.fetch(orderId)
        const orderNotes = order?.notes || {}
        const orderType = String(orderNotes.type || "").trim()
        if (orderType === "flat-purchase" || orderType === "room-booking") {
          const buyerUserId = String(orderNotes.userId || "").trim()
          const flatId = String(orderNotes.flatId || "").trim()
          const flat = state.flats.find((item) => item.id === flatId)

          if (!buyerUserId || !flatId || !flat || !isActiveOwnerListing(flat)) {
            res.status(400).json({ verified: false, message: "Invalid flat purchase metadata" })
            return
          }

          if (String(flat.ownerId || "") === buyerUserId) {
            res.status(400).json({ verified: false, message: "You cannot buy your own listing" })
            return
          }

          if (!isEligibleStudentBuyer(buyerUserId)) {
            res.status(403).json({ verified: false, message: "Only normal students can buy/book rooms" })
            return
          }

          const metrics = getFlatMetrics(flatId)
          const alreadyPurchasedBy = String(metrics.purchasedByUserId || "")
          if (alreadyPurchasedBy && alreadyPurchasedBy !== buyerUserId) {
            res.status(409).json({ verified: false, message: "This flat is already sold/booked" })
            return
          }

          const purchasedFlatId = getPurchasedFlatIdByUser(buyerUserId)
          if ((purchasedFlatId && purchasedFlatId !== flatId) || (!purchasedFlatId && hasUserBookedAnyRoommate(buyerUserId))) {
            res.status(409).json({ verified: false, message: "One normal student can buy only one room" })
            return
          }

          metrics.purchasedByUserId = buyerUserId
          metrics.purchasedAt = new Date().toISOString()
          state.flatMetrics[flatId] = metrics

          try {
            await persistFlatMetrics(flatId)
          } catch (error) {
            console.error("Failed to persist flat purchase metrics:", error.message)
          }

          const buyerUser = state.users.get(buyerUserId)
          const ownerUser = state.users.get(String(flat.ownerId || ""))
          const buyerName = String(buyerUser?.name || "Student").trim() || "Student"
          const buyerEmail = String(buyerUser?.email || "").trim().toLowerCase()
          const ownerEmail = String(ownerUser?.email || flat.ownerEmail || "").trim().toLowerCase()
          const listingTitle = String(flat.title || "your listing").trim() || "your listing"

          if (buyerEmail) {
            await sendEmail({
              to: buyerEmail,
              subject: "Booking confirmed on Student Flat Finder ✅",
              text: `Hi ${buyerName},\n\nYour payment is verified and your room booking for \"${listingTitle}\" is confirmed.\n\n- Team Student Flat Finder`,
              html: `<p>Hi <strong>${buyerName}</strong>,</p><p>Your payment is verified and your room booking for <strong>${listingTitle}</strong> is confirmed.</p><p>— Team Student Flat Finder</p>`,
            })
          }

          if (ownerEmail && ownerEmail !== buyerEmail) {
            await sendEmail({
              to: ownerEmail,
              subject: "Your listing has been booked on Student Flat Finder",
              text: `Hi,\n\n${buyerName} has successfully booked your listing \"${listingTitle}\".\n\n- Team Student Flat Finder`,
              html: `<p>Hi,</p><p><strong>${buyerName}</strong> has successfully booked your listing <strong>${listingTitle}</strong>.</p><p>— Team Student Flat Finder</p>`,
            })
          }
        }

        if (orderType === "roommate-booking") {
          const buyerUserId = String(orderNotes.userId || "").trim()
          const roommateId = String(orderNotes.roommateId || "").trim()
          const roommate = state.roommates.find((item) => item.id === roommateId)

          if (!buyerUserId || !roommateId || !roommate || !isActiveRoommateListing(roommate)) {
            res.status(400).json({ verified: false, message: "Invalid roommate booking metadata" })
            return
          }

          if (String(roommate.createdByUserId || "") === buyerUserId) {
            res.status(400).json({ verified: false, message: "You cannot book your own listing" })
            return
          }

          if (!isEligibleStudentBuyer(buyerUserId)) {
            res.status(403).json({ verified: false, message: "Only normal students can buy/book rooms" })
            return
          }

          const joinedUserIds = getRoommateJoinedUserIds(roommate)
          if (joinedUserIds.includes(buyerUserId)) {
            res.status(409).json({ verified: false, message: "You have already joined this roommate listing" })
            return
          }

          if (!hasRoommateSeatAvailable(roommate)) {
            res.status(409).json({ verified: false, message: "This roommate listing is full" })
            return
          }

          if (hasAnyRoomBookedByUser(buyerUserId)) {
            res.status(409).json({ verified: false, message: "One normal student can buy only one room" })
            return
          }

          const buyerUser = state.users.get(buyerUserId)
          const buyerName = String(buyerUser?.name || "Student").trim() || "Student"

          const nextJoinedUserIds = [...new Set([...joinedUserIds, buyerUserId])]
          roommate.currentRoommateUserIds = nextJoinedUserIds

          if (!String(roommate.purchasedByUserId || "").trim()) {
            roommate.purchasedByUserId = buyerUserId
            roommate.purchasedByName = buyerName
          } else {
            const currentRoommates = Array.isArray(roommate.currentRoommates)
              ? roommate.currentRoommates.map((item) => String(item || "").trim()).filter(Boolean)
              : []
            if (!currentRoommates.includes(buyerName)) {
              currentRoommates.push(buyerName)
            }
            roommate.currentRoommates = currentRoommates
          }

          try {
            await persistRoommate(roommate)
          } catch (error) {
            console.error("Failed to persist roommate booking:", error.message)
          }

          const listingOwnerUser = state.users.get(String(roommate.createdByUserId || ""))
          const buyerEmail = String(buyerUser?.email || "").trim().toLowerCase()
          const listingOwnerEmail = String(listingOwnerUser?.email || "").trim().toLowerCase()
          const listingName = String(roommate.name || "roommate listing").trim() || "roommate listing"

          if (buyerEmail) {
            await sendEmail({
              to: buyerEmail,
              subject: "Roommate booking confirmed on Student Flat Finder ✅",
              text: `Hi ${buyerName},\n\nYour payment is verified and your booking for roommate listing \"${listingName}\" is confirmed.\n\n- Team Student Flat Finder`,
              html: `<p>Hi <strong>${buyerName}</strong>,</p><p>Your payment is verified and your booking for roommate listing <strong>${listingName}</strong> is confirmed.</p><p>— Team Student Flat Finder</p>`,
            })
          }

          if (listingOwnerEmail && listingOwnerEmail !== buyerEmail) {
            await sendEmail({
              to: listingOwnerEmail,
              subject: "A student joined your roommate listing",
              text: `Hi,\n\n${buyerName} has successfully joined your roommate listing \"${listingName}\".\n\n- Team Student Flat Finder`,
              html: `<p>Hi,</p><p><strong>${buyerName}</strong> has successfully joined your roommate listing <strong>${listingName}</strong>.</p><p>— Team Student Flat Finder</p>`,
            })
          }
        }
      } catch (error) {
        res.status(500).json({ verified: false, message: "Failed to verify purchase metadata", detail: error.message })
        return
      }
    }

    let updatedUser = null
    const verifiedSubscriptionUserId = String(payload.userId || "").trim()
    const verifiedSubscriptionPlan = String(payload.plan || "").trim()

    if (verifiedSubscriptionUserId && verifiedSubscriptionPlan) {
      const user = state.users.get(verifiedSubscriptionUserId)
      if (user) {
        const lockState = getSubscriptionLockState(user)
        if (lockState.active) {
          res.status(409).json({
            verified: false,
            message: `You already have an active subscription until ${new Date(lockState.expiresAt).toLocaleDateString("en-IN")}`,
          })
          return
        }

        activateSubscription(user, verifiedSubscriptionPlan)

        try {
          await persistUser(user)
        } catch (error) {
          console.error("Failed to persist subscription after payment verify:", error.message)
        }

        updatedUser = sanitizeUser(user)
      }
    }

    res.json({
      verified: true,
      message: "Payment verified successfully",
      subscriptionActivated: Boolean(updatedUser),
      user: updatedUser,
    })
  })

  app.post("/api/chat/:flatId", async (req, res) => {
    const payload = req.body || {}
    if (!payload.senderName || !payload.message || !payload.senderEmail) {
      res.status(400).json({ message: "senderName, senderEmail and message are required" })
      return
    }

    const flatId = req.params.flatId
    const flat = state.flats.find((item) => item.id === flatId)
    if (!flat) {
      res.status(404).json({ message: "Flat not found" })
      return
    }

    const existingMessages = state.chats[flatId] || []
    const previousMessage = existingMessages[existingMessages.length - 1]

    const senderUserId = String(payload.senderUserId || "")
    const senderUser = senderUserId ? state.users.get(senderUserId) : null
    if (!senderUser) {
      res.status(401).json({ message: "Please login to send messages." })
      return
    }

    const hasPremium = Boolean(senderUser?.subscription?.active)
    const senderMessageCount = existingMessages.filter((item) => item.senderUserId === senderUserId).length

    if (senderUserId && !hasPremium && senderMessageCount >= FREE_CHAT_LIMIT) {
      res.status(402).json({
        message: "Free chat limit reached. Upgrade subscription to continue chatting.",
        remaining: 0,
        requiresSubscription: true,
      })
      return
    }

    const isSenderOwner = Boolean(senderUserId && flat.ownerId && senderUserId === flat.ownerId)
    let recipientUserId = String(payload.recipientUserId || "").trim()
    let recipientEmail = String(payload.recipientEmail || "")
      .trim()
      .toLowerCase()

    if (!isSenderOwner) {
      const ownerUser = flat.ownerId ? state.users.get(flat.ownerId) : null
      if (ownerUser?.email) {
        recipientUserId = ownerUser.id
        recipientEmail = String(ownerUser.email).trim().toLowerCase()
      }
    }

    if (isSenderOwner && !recipientEmail) {
      const latestInbound = [...existingMessages]
        .reverse()
        .find((item) => item.senderEmail && item.senderEmail !== String(payload.senderEmail).trim().toLowerCase())

      if (latestInbound) {
        recipientUserId = String(latestInbound.senderUserId || recipientUserId || "").trim()
        recipientEmail = String(latestInbound.senderEmail || recipientEmail || "").trim().toLowerCase()
      }
    }

    if (
      (recipientUserId && recipientUserId === senderUserId) ||
      (recipientEmail && recipientEmail === String(senderUser.email || "").trim().toLowerCase()) ||
      senderUserId === String(flat.ownerId || "") && String(payload.target || "owner") === "owner"
    ) {
      res.status(400).json({ message: "You cannot message yourself." })
      return
    }

    if (senderUser.role === "owner") {
      if (String(flat.ownerId || "") !== senderUserId) {
        res.status(403).json({ message: "Owners cannot message other listings." })
        return
      }

      const hasIncomingStudentMessage = existingMessages.some((item) => item.senderUserId && item.senderUserId !== senderUserId)
      if (!hasIncomingStudentMessage && !recipientUserId && !recipientEmail) {
        res.status(403).json({ message: "Owners can only reply to students who message first." })
        return
      }

      if (recipientUserId) {
        const recipientUser = state.users.get(recipientUserId)
        if (recipientUser?.role === "owner") {
          res.status(403).json({ message: "Owners cannot message other owners." })
          return
        }
      }
    }

    const message = {
      id: makeId("msg"),
      senderName: String(payload.senderName),
      senderEmail: String(payload.senderEmail).trim().toLowerCase(),
      senderUserId,
      recipientUserId: recipientUserId || null,
      recipientEmail: recipientEmail || null,
      target: String(payload.target || "owner"),
      message: String(payload.message),
      createdAt: new Date().toISOString(),
    }

    if (!state.chats[flatId]) {
      state.chats[flatId] = []
    }

    state.chats[flatId].push(message)

    try {
      await persistChatMessages(flatId, state.chats[flatId])
    } catch (error) {
      console.error("Failed to persist chat message:", error.message)
    }

    const emailRecipient = message.recipientEmail || previousMessage?.senderEmail || null

    if (emailRecipient && emailRecipient !== message.senderEmail) {
      sendEmail({
        to: emailRecipient,
        subject: "You have a new reply on Student Flat Finder",
        text: `Hi, ${message.senderName} has replied to your message: "${message.message}"`,
        html: `<p>Hi,</p><p><strong>${message.senderName}</strong> has replied to your message:</p><blockquote>${message.message}</blockquote>`,
      })
    }

    broadcastChatUpdate(flatId, message)
    const sentCount = senderUserId ? senderMessageCount + 1 : null
    const remaining = senderUserId && !hasPremium ? Math.max(FREE_CHAT_LIMIT - sentCount, 0) : null

    res.status(201).json({
      ...message,
      remaining,
      requiresSubscription: senderUserId ? !hasPremium : false,
    })
  })


};
