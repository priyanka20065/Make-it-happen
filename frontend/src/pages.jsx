import { useEffect, useMemo, useState } from "react"
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom"
import ListingCard from "./components/ListingCard"
import { useAuth } from "./auth"
import {
  api,
  buildMapHref,
  formatINR,
  getFavoriteIds,
  redirectAfterAuth,
  toggleFavoriteId,
  uploadListingMedia,
} from "./api"

function PageSection({ title, description, children, action }) {
  return (
    <section className="panel glass-panel">
      <div className="section-title">
        <div>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {action || null}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small className="helper-text">{hint}</small> : null}
    </label>
  )
}

function SectionGrid({ children }) {
  return <div className="section-grid">{children}</div>
}

function StatTile({ label, value }) {
  return (
    <div className="inline-tile">
      <span className="helper-text">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function LoadingState({ label = "Loading..." }) {
  return <div className="page-empty">{label}</div>
}

function EmptyState({ title, description }) {
  return (
    <div className="page-empty glass-panel">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  )
}

function useRequireAuth() {
  const { currentUser } = useAuth()
  return currentUser
}

function toCommaString(items) {
  return Array.isArray(items) ? items.join(", ") : String(items || "")
}

function splitCommaString(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function HomePage() {
  const { currentUser } = useAuth()

  return (
    <div className="page-shell">
      <section className="hero-grid">
        <div className="hero-copy glass-panel">
          <span className="badge badge-available">React SPA</span>
          <h1>Find your perfect student flat.</h1>
          <p>
            Browse flats, meet roommates, chat with owners, and manage bookings from a single React interface that talks
            directly to your existing backend.
          </p>
          <div className="hero-badges">
            <span className="chip">Browse</span>
            <span className="chip">Roommates</span>
            <span className="chip">Chat</span>
            <span className="chip">Payments</span>
            <span className="chip">Profiles</span>
          </div>
          <div className="hero-actions-row">
            <Link className="btn btn-primary" to="/browse">Browse Flats</Link>
            <Link className="btn btn-secondary" to="/list">List Your Space</Link>
            <Link className="btn btn-light" to={currentUser ? "/dashboard" : "/login"}>{currentUser ? "Open Dashboard" : "Login"}</Link>
          </div>
        </div>

        <div className="hero-image-card glass-panel">
          <img src="/assets/modern-apartment-living.png" alt="Student housing" />
        </div>
      </section>

      <div className="stat-row" style={{ marginTop: "1rem" }}>
        <StatTile label="Match flats faster" value="Smart browse" />
        <StatTile label="Talk instantly" value="Real-time chat" />
        <StatTile label="Keep backend separate" value="Clean structure" />
        <StatTile label="Single frontend app" value="React SPA" />
      </div>

      <section className="feature-grid" style={{ marginTop: "1rem" }}>
        <article className="card glass-panel">
          <h2>Smart Search</h2>
          <p>Filter by rent, interests, personality, and room type without leaving the page.</p>
        </article>
        <article className="card glass-panel">
          <h2>Direct Messaging</h2>
          <p>Open a flat or roommate listing and message right away using your existing chat endpoints.</p>
        </article>
        <article className="card glass-panel">
          <h2>Payments & Subscription</h2>
          <p>Activate subscriptions from the frontend while the backend keeps ownership of the payment flow.</p>
        </article>
      </section>

      <section className="promo-band" style={{ marginTop: "1rem" }}>
        <div className="toolbar">
          <div>
            <h2 style={{ margin: 0 }}>Premium benefits for students and owners</h2>
            <p style={{ margin: "0.35rem 0 0" }}>Use the same backend, now wrapped in a single React experience.</p>
          </div>
          <Link className="btn btn-light" to="/subscription">View Plans</Link>
        </div>
      </section>
    </div>
  )
}

function BrowseFilters({ filters, setFilters, activeView, setActiveView, mapMode = false }) {
  return (
    <aside className="filters glass-panel">
      <div className="tabs" style={{ marginBottom: "0.75rem" }}>
        <button className={`tab-btn ${activeView === "rooms" ? "active" : ""}`} onClick={() => setActiveView("rooms")} type="button">
          Rooms
        </button>
        <button className={`tab-btn ${activeView === "roommates" ? "active" : ""}`} onClick={() => setActiveView("roommates")} type="button">
          Roommates
        </button>
      </div>

      <div className="search-grid">
        <Field label="Search">
          <input value={filters.q} onChange={(event) => setFilters((value) => ({ ...value, q: event.target.value }))} placeholder="Search listings" />
        </Field>
        <Field label="Flat Type">
          <select value={filters.flatType} onChange={(event) => setFilters((value) => ({ ...value, flatType: event.target.value }))} disabled={activeView !== "rooms"}>
            <option value="all">All</option>
            <option value="room-only">Room only</option>
            <option value="room-with-roommates">Room with roommates</option>
          </select>
        </Field>
        <Field label="Min Rent">
          <input type="number" value={filters.minRent} onChange={(event) => setFilters((value) => ({ ...value, minRent: event.target.value }))} />
        </Field>
        <Field label="Max Rent">
          <input type="number" value={filters.maxRent} onChange={(event) => setFilters((value) => ({ ...value, maxRent: event.target.value }))} />
        </Field>
        <Field label="Cleanliness">
          <input type="number" min="0" max="10" value={filters.cleanliness} onChange={(event) => setFilters((value) => ({ ...value, cleanliness: event.target.value }))} />
        </Field>
        <Field label="Social Level">
          <input type="number" min="0" max="10" value={filters.socialLevel} onChange={(event) => setFilters((value) => ({ ...value, socialLevel: event.target.value }))} />
        </Field>
        <Field label="Study Habits">
          <input type="number" min="0" max="10" value={filters.studyHabits} onChange={(event) => setFilters((value) => ({ ...value, studyHabits: event.target.value }))} />
        </Field>
        <Field label="Interest">
          <input value={filters.interest} onChange={(event) => setFilters((value) => ({ ...value, interest: event.target.value }))} placeholder="coding, music, etc." />
        </Field>
      </div>

      <div className="btn-group" style={{ marginTop: "0.9rem" }}>
        <button className="btn btn-primary" type="button" onClick={() => setFilters((value) => ({ ...value }))}>Apply Filters</button>
        {mapMode ? <Link className="btn btn-light" to="/browse">Back to browse</Link> : <Link className="btn btn-light" to="/browse/map">Map view</Link>}
      </div>
    </aside>
  )
}

export function BrowsePage({ mapMode = false }) {
  const [activeView, setActiveView] = useState(mapMode ? "rooms" : "rooms")
  const [filters, setFilters] = useState({ q: "", flatType: "all", minRent: "0", maxRent: "999999", cleanliness: "0", socialLevel: "0", studyHabits: "0", interest: "" })
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setFilters((value) => ({
      ...value,
      q: params.get("q") || value.q,
      flatType: params.get("flatType") || value.flatType,
    }))
    if ((params.get("view") || "").toLowerCase() === "roommates") {
      setActiveView("roommates")
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setStatus("")

    const params = new URLSearchParams({
      q: filters.q.trim(),
      minRent: filters.minRent || "0",
      maxRent: filters.maxRent || "999999",
      cleanliness: filters.cleanliness || "0",
      socialLevel: filters.socialLevel || "0",
      studyHabits: filters.studyHabits || "0",
      interest: filters.interest.trim(),
      interests: filters.interest.trim(),
    })

    if (activeView === "rooms") {
      params.set("flatType", filters.flatType)
    }

    const endpoint = activeView === "rooms" ? `/api/flats?${params.toString()}` : `/api/roommates?${params.toString()}`

    api.get(endpoint)
      .then((response) => {
        if (!cancelled) {
          setItems(Array.isArray(response) ? response : [])
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus(error.message)
          setItems([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    const stream = new EventSource("/api/stream/browse")
    stream.addEventListener("browse-update", () => {
      api.get(endpoint).then((response) => {
        if (!cancelled) {
          setItems(Array.isArray(response) ? response : [])
        }
      }).catch(() => null)
    })

    return () => {
      cancelled = true
      stream.close()
    }
  }, [activeView, filters.q, filters.flatType, filters.minRent, filters.maxRent, filters.cleanliness, filters.socialLevel, filters.studyHabits, filters.interest])

  const title = mapMode ? "Browse on the map" : activeView === "rooms" ? "Browse student rooms" : "Browse roommate profiles"
  const description = mapMode
    ? "Use the same browse data, but with map links ready for each card."
    : activeView === "rooms"
      ? "Filter rooms by rent, room type, distance, and matching roommates."
      : "Find roomie profiles that match your budget and personality."

  return (
    <div className="page-shell">
      <div className="map-grid">
        <BrowseFilters
          filters={filters}
          setFilters={setFilters}
          activeView={activeView}
          setActiveView={setActiveView}
          mapMode={mapMode}
        />

        <section className="results glass-panel">
          <div className="section-title">
            <div>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            <div className="helper-text">{loading ? "Loading..." : `${items.length} result${items.length === 1 ? "" : "s"}`}</div>
          </div>

          {status ? <div className="status-banner">{status}</div> : null}
          {loading ? <LoadingState /> : null}
          {!loading && !items.length ? (
            <EmptyState title="No results found" description="Try loosening one of the filters or switch to the other tab." />
          ) : null}
          {!loading && items.length ? (
            <div className="flat-grid">
              {items.map((item) => (
                <ListingCard key={item.id} item={item} kind={activeView === "rooms" ? "flat" : "roommate"} />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

export function MapPage() {
  return <BrowsePage mapMode />
}

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [intent, setIntent] = useState("student")
  const [preferredRoomType, setPreferredRoomType] = useState("room-only")
  const [status, setStatus] = useState("")
  const [form, setForm] = useState({ email: "", password: "" })

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus("Signing in...")

    try {
      const user = await api.post("/api/auth/login", {
        ...form,
        intent: intent === "owner" ? "owner" : "seeker",
        preferredRoomType: intent === "owner" ? null : preferredRoomType,
      })
      login(user)
      setStatus("Login successful. Redirecting...")
      navigate(redirectAfterAuth(user), { replace: true })
    } catch (error) {
      setStatus(error.message)
    }
  }

  return (
    <div className="page-shell auth-page">
      <div className="auth-head">
        <h1>Welcome back</h1>
        <p>Sign in and continue to your dashboard.</p>
      </div>

      <form className="auth-form glass-panel simple-form" onSubmit={handleSubmit}>
        <fieldset className="auth-role-group">
          <legend>Login as</legend>
          <div className="auth-segment">
            <input id="loginIntentStudent" className="auth-segment-input" type="radio" name="intent" checked={intent === "student"} onChange={() => setIntent("student")} />
            <label className="auth-segment-btn" htmlFor="loginIntentStudent">Student</label>
            <input id="loginIntentOwner" className="auth-segment-input" type="radio" name="intent" checked={intent === "owner"} onChange={() => setIntent("owner")} />
            <label className="auth-segment-btn" htmlFor="loginIntentOwner">Owner</label>
          </div>
        </fieldset>

        {intent !== "owner" ? (
          <fieldset className="auth-role-group">
            <legend>Student flow</legend>
            <label className="inline-radio"><input type="radio" name="preferredRoomType" checked={preferredRoomType === "room-only"} onChange={() => setPreferredRoomType("room-only")} /> Room only</label>
            <label className="inline-radio"><input type="radio" name="preferredRoomType" checked={preferredRoomType === "room-with-roommates"} onChange={() => setPreferredRoomType("room-with-roommates")} /> Room with roommates</label>
          </fieldset>
        ) : null}

        <Field label="Email">
          <input value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} type="email" required />
        </Field>
        <Field label="Password">
          <input value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} type="password" required />
        </Field>

        <button className="btn btn-primary auth-submit" type="submit">Login</button>
        <p className="auth-status helper-text">{status}</p>
        <p className="helper-text">No account yet? <Link to="/signup">Create one here</Link>.</p>
      </form>
    </div>
  )
}

export function SignupPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [intent, setIntent] = useState("seeker")
  const [preferredRoomType, setPreferredRoomType] = useState("room-only")
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    university: "",
    course: "",
    bio: "",
    interests: "",
    cleanliness: 5,
    socialLevel: 5,
    studyHabits: 5,
  })
  const [status, setStatus] = useState("")

  async function handleSubmit(event) {
    event.preventDefault()

    if (form.password !== form.confirmPassword) {
      setStatus("Passwords do not match")
      return
    }

    if (intent === "seeker" && preferredRoomType === "room-only" && !String(form.university || "").trim()) {
      setStatus("University / College name is required for normal students.")
      return
    }

    setStatus("Creating your account...")

    try {
      const user = await api.post("/api/auth/signup", {
        name: form.name,
        email: form.email,
        password: form.password,
        intent,
        preferredRoomType: intent === "owner" ? null : preferredRoomType,
        university: form.university,
        course: form.course,
        bio: form.bio,
        interests: splitCommaString(form.interests),
        personality: {
          cleanliness: Number(form.cleanliness),
          socialLevel: Number(form.socialLevel),
          studyHabits: Number(form.studyHabits),
        },
      })

      login(user)
      setStatus("Signup successful. Redirecting...")
      navigate(redirectAfterAuth(user), { replace: true })
    } catch (error) {
      setStatus(error.message)
    }
  }

  return (
    <div className="page-shell auth-page">
      <div className="auth-head">
        <h1>Create your account</h1>
        <p>Join as a student seeker or an owner listing flats.</p>
      </div>

      <form className="auth-form glass-panel simple-form" onSubmit={handleSubmit}>
        <fieldset className="auth-role-group">
          <legend>I am a</legend>
          <div className="auth-segment">
            <input id="signupIntentStudent" className="auth-segment-input" type="radio" name="intent" checked={intent === "seeker"} onChange={() => setIntent("seeker")} />
            <label className="auth-segment-btn" htmlFor="signupIntentStudent">Student seeker</label>
            <input id="signupIntentOwner" className="auth-segment-input" type="radio" name="intent" checked={intent === "owner"} onChange={() => setIntent("owner")} />
            <label className="auth-segment-btn" htmlFor="signupIntentOwner">Owner</label>
          </div>
        </fieldset>

        {intent === "seeker" ? (
          <fieldset className="auth-role-group">
            <legend>Student flow</legend>
            <label className="inline-radio"><input type="radio" name="preferredRoomType" checked={preferredRoomType === "room-only"} onChange={() => setPreferredRoomType("room-only")} /> Room only</label>
            <label className="inline-radio"><input type="radio" name="preferredRoomType" checked={preferredRoomType === "room-with-roommates"} onChange={() => setPreferredRoomType("room-with-roommates")} /> Room with roommates</label>
          </fieldset>
        ) : null}

        <div className="form-grid">
          <Field label="Name"><input value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} required /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required /></Field>
          <Field label="Password"><input type="password" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} required /></Field>
          <Field label="Confirm Password"><input type="password" value={form.confirmPassword} onChange={(event) => setForm((value) => ({ ...value, confirmPassword: event.target.value }))} required /></Field>
          <Field label="University / College"><input value={form.university} onChange={(event) => setForm((value) => ({ ...value, university: event.target.value }))} /></Field>
          <Field label="Course"><input value={form.course} onChange={(event) => setForm((value) => ({ ...value, course: event.target.value }))} /></Field>
        </div>

        <Field label="Bio"><textarea value={form.bio} onChange={(event) => setForm((value) => ({ ...value, bio: event.target.value }))} /></Field>
        <Field label="Interests"><input value={form.interests} onChange={(event) => setForm((value) => ({ ...value, interests: event.target.value }))} placeholder="coding, music, sports" /></Field>

        <div className="form-grid">
          <Field label="Cleanliness"><input type="number" min="1" max="10" value={form.cleanliness} onChange={(event) => setForm((value) => ({ ...value, cleanliness: event.target.value }))} /></Field>
          <Field label="Social Level"><input type="number" min="1" max="10" value={form.socialLevel} onChange={(event) => setForm((value) => ({ ...value, socialLevel: event.target.value }))} /></Field>
          <Field label="Study Habits"><input type="number" min="1" max="10" value={form.studyHabits} onChange={(event) => setForm((value) => ({ ...value, studyHabits: event.target.value }))} /></Field>
        </div>

        <button className="btn btn-primary auth-submit" type="submit">Create account</button>
        <p className="auth-status helper-text">{status}</p>
        <p className="helper-text">Already have an account? <Link to="/login">Login here</Link>.</p>
      </form>
    </div>
  )
}

export function DashboardPage() {
  const currentUser = useRequireAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [activity, setActivity] = useState(null)
  const [listings, setListings] = useState([])
  const [roommates, setRoommates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { replace: true })
      return
    }

    let cancelled = false
    setLoading(true)

    const requests = [
      api.get(`/api/profile/${currentUser.id}`),
      api.get(`/api/dashboard/activity/${currentUser.id}`),
      api.get(`/api/list/owner/${currentUser.id}`).catch(() => []),
      api.get(`/api/list/roommate/${currentUser.id}`).catch(() => []),
    ]

    Promise.all(requests)
      .then(([profileData, activityData, ownerListings, roommateListings]) => {
        if (!cancelled) {
          setProfile(profileData)
          setActivity(activityData)
          setListings(Array.isArray(ownerListings) ? ownerListings : [])
          setRoommates(Array.isArray(roommateListings) ? roommateListings : [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(currentUser)
          setActivity({ profileViews: 0, savedFlats: 0, messages: 0 })
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentUser, navigate])

  if (!currentUser) {
    return null
  }

  if (loading) {
    return <LoadingState label="Loading dashboard..." />
  }

  return (
    <div className="page-shell">
      <PageSection
        title={`Dashboard for ${profile?.name || currentUser.name}`}
        description="Your account summary, listings, and activity live here."
        action={<Link className="btn btn-secondary" to="/profile">Edit profile</Link>}
      >
        <div className="inline-tiles">
          <StatTile label="Profile views" value={activity?.profileViews ?? 0} />
          <StatTile label="Saved flats" value={activity?.savedFlats ?? 0} />
          <StatTile label="Messages" value={activity?.messages ?? 0} />
          <StatTile label="Subscription" value={profile?.subscription?.active ? profile.subscription.plan : "Free"} />
        </div>
      </PageSection>

      <SectionGrid>
        <PageSection title="Your profile" description={profile?.bio || "No bio yet."}>
          <div className="card-list">
            <div className="note-card"><strong>Email</strong><div className="note-meta">{profile?.email}</div></div>
            <div className="note-card"><strong>University</strong><div className="note-meta">{profile?.university || "Not set"}</div></div>
            <div className="note-card"><strong>Interests</strong><div className="note-meta">{toCommaString(profile?.interests || [])}</div></div>
          </div>
        </PageSection>

        <PageSection title="Quick actions" description="Jump into the main parts of the app.">
          <div className="btn-group">
            <Link className="btn btn-primary" to="/browse">Browse</Link>
            <Link className="btn btn-secondary" to="/list">List</Link>
            <Link className="btn btn-light" to="/chat">Chat</Link>
            <Link className="btn btn-light" to="/subscription">Subscription</Link>
          </div>
        </PageSection>
      </SectionGrid>

      <SectionGrid style={{ marginTop: "1rem" }}>
        <PageSection title="Your flat listings" description="Owner listings created from this account.">
          {listings.length ? <div className="flat-grid">{listings.map((item) => <ListingCard key={item.id} item={item} kind="flat" />)}</div> : <EmptyState title="No owner listings yet" description="Create one from the list page." />}
        </PageSection>

        <PageSection title="Your roommate listings" description="Student roommate listings created from this account.">
          {roommates.length ? <div className="flat-grid">{roommates.map((item) => <ListingCard key={item.id} item={item} kind="roommate" />)}</div> : <EmptyState title="No roommate listings yet" description="Create one from the list page." />}
        </PageSection>
      </SectionGrid>
    </div>
  )
}

function UploadControls({ images, setImages, tours, setTours }) {
  return (
    <div className="form-grid">
      <Field label="Property images" hint="Select at least 2 normal images.">
        <input type="file" multiple accept="image/*" onChange={(event) => setImages(event.target.files)} />
      </Field>
      <Field label="Panoramic 360 images" hint="Select at least 2 panoramic images.">
        <input type="file" multiple accept="image/*" onChange={(event) => setTours(event.target.files)} />
      </Field>
      <div className="note-card">
        <strong>Selected files</strong>
        <div className="note-meta">{images.length} image(s), {tours.length} 360 image(s)</div>
      </div>
    </div>
  )
}

export function ListPage() {
  const currentUser = useRequireAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialMode = searchParams.get("mode") === "roommate" ? "roommate" : "owner"
  const [mode, setMode] = useState(initialMode)
  const [status, setStatus] = useState("")
  const [images, setImages] = useState([])
  const [tours, setTours] = useState([])
  const [ownerForm, setOwnerForm] = useState({ title: "", description: "", address: "", rent: "", lat: "", lng: "", amenities: "WiFi, Kitchen", availableFrom: "", ownerName: "", ownerEmail: "" })
  const [roommateForm, setRoommateForm] = useState({ name: "", age: "20", course: "", bio: "", preferredRentMax: "10000", maxOccupants: "1", moveInDate: "", interests: "", cleanliness: "5", socialLevel: "5", studyHabits: "5", address: "", lat: "", lng: "", institutionAddress: "", institutionLat: "", institutionLng: "", preferredFlatId: "" })

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { replace: true })
      return
    }

    if (String(currentUser.role || currentUser.intent || "").toLowerCase() === "owner") {
      setMode("owner")
    } else if (String(currentUser.preferredRoomType || "").toLowerCase() === "room-with-roommates") {
      setMode("roommate")
    }

    setOwnerForm((value) => ({ ...value, ownerName: currentUser.name, ownerEmail: currentUser.email }))
  }, [currentUser, navigate])

  if (!currentUser) {
    return null
  }

  async function handleOwnerSubmit(event) {
    event.preventDefault()
    setStatus("Uploading listing media...")

    try {
      const uploadResult = await uploadListingMedia({ images, tour360: tours })
      const payload = {
        ...ownerForm,
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        ownerEmail: currentUser.email,
        rent: Number(ownerForm.rent),
        lat: ownerForm.lat,
        lng: ownerForm.lng,
        amenities: splitCommaString(ownerForm.amenities),
        images: uploadResult.images,
        virtualTourUrls: uploadResult.tour360Urls,
      }
      await api.post("/api/list/owner", payload)
      setStatus("Owner listing created successfully.")
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function handleRoommateSubmit(event) {
    event.preventDefault()
    setStatus("Uploading roommate listing media...")

    try {
      const uploadResult = await uploadListingMedia({ images, tour360: tours })
      const payload = {
        ...roommateForm,
        createdByUserId: currentUser.id,
        name: roommateForm.name,
        age: Number(roommateForm.age),
        preferredRentMax: Number(roommateForm.preferredRentMax),
        maxOccupants: Number(roommateForm.maxOccupants),
        cleanliness: Number(roommateForm.cleanliness),
        socialLevel: Number(roommateForm.socialLevel),
        studyHabits: Number(roommateForm.studyHabits),
        interests: roommateForm.interests,
        images: uploadResult.images,
        virtualTourUrls: uploadResult.tour360Urls,
      }
      await api.post("/api/list/roommate", payload)
      setStatus("Roommate listing created successfully.")
    } catch (error) {
      setStatus(error.message)
    }
  }

  return (
    <div className="page-shell">
      <PageSection
        title="Create a listing"
        description="Keep backend routes where they belong, but manage listings from the React frontend."
        action={(
          <div className="tabs">
            <button className={`tab-btn ${mode === "owner" ? "active" : ""}`} type="button" onClick={() => setMode("owner")}>Owner listing</button>
            <button className={`tab-btn ${mode === "roommate" ? "active" : ""}`} type="button" onClick={() => setMode("roommate")}>Roommate listing</button>
          </div>
        )}
      >
        <p className="helper-text">The backend still owns validation and persistence. The React form just feeds it data.</p>
      </PageSection>

      {status ? <div className="status-banner" style={{ marginTop: "1rem" }}>{status}</div> : null}

      {mode === "owner" ? (
        <form className="glass-panel panel" onSubmit={handleOwnerSubmit} style={{ marginTop: "1rem" }}>
          <div className="form-grid">
            <Field label="Title"><input value={ownerForm.title} onChange={(event) => setOwnerForm((value) => ({ ...value, title: event.target.value }))} required /></Field>
            <Field label="Rent"><input type="number" value={ownerForm.rent} onChange={(event) => setOwnerForm((value) => ({ ...value, rent: event.target.value }))} required /></Field>
            <Field label="Address"><input value={ownerForm.address} onChange={(event) => setOwnerForm((value) => ({ ...value, address: event.target.value }))} required /></Field>
            <Field label="Available From"><input type="date" value={ownerForm.availableFrom} onChange={(event) => setOwnerForm((value) => ({ ...value, availableFrom: event.target.value }))} /></Field>
            <Field label="Latitude"><input value={ownerForm.lat} onChange={(event) => setOwnerForm((value) => ({ ...value, lat: event.target.value }))} /></Field>
            <Field label="Longitude"><input value={ownerForm.lng} onChange={(event) => setOwnerForm((value) => ({ ...value, lng: event.target.value }))} /></Field>
          </div>
          <Field label="Description"><textarea value={ownerForm.description} onChange={(event) => setOwnerForm((value) => ({ ...value, description: event.target.value }))} /></Field>
          <Field label="Amenities"><input value={ownerForm.amenities} onChange={(event) => setOwnerForm((value) => ({ ...value, amenities: event.target.value }))} /></Field>
          <UploadControls images={images} setImages={setImages} tours={tours} setTours={setTours} />
          <div className="btn-group" style={{ marginTop: "1rem" }}>
            <button className="btn btn-primary" type="submit">Create owner listing</button>
          </div>
        </form>
      ) : (
        <form className="glass-panel panel" onSubmit={handleRoommateSubmit} style={{ marginTop: "1rem" }}>
          <div className="form-grid">
            <Field label="Name"><input value={roommateForm.name} onChange={(event) => setRoommateForm((value) => ({ ...value, name: event.target.value }))} required /></Field>
            <Field label="Age"><input type="number" value={roommateForm.age} onChange={(event) => setRoommateForm((value) => ({ ...value, age: event.target.value }))} required /></Field>
            <Field label="Course"><input value={roommateForm.course} onChange={(event) => setRoommateForm((value) => ({ ...value, course: event.target.value }))} required /></Field>
            <Field label="Preferred Rent Max"><input type="number" value={roommateForm.preferredRentMax} onChange={(event) => setRoommateForm((value) => ({ ...value, preferredRentMax: event.target.value }))} required /></Field>
            <Field label="Max Occupants"><input type="number" value={roommateForm.maxOccupants} onChange={(event) => setRoommateForm((value) => ({ ...value, maxOccupants: event.target.value }))} /></Field>
            <Field label="Move-in Date"><input type="date" value={roommateForm.moveInDate} onChange={(event) => setRoommateForm((value) => ({ ...value, moveInDate: event.target.value }))} /></Field>
          </div>
          <Field label="Bio"><textarea value={roommateForm.bio} onChange={(event) => setRoommateForm((value) => ({ ...value, bio: event.target.value }))} /></Field>
          <Field label="Interests"><input value={roommateForm.interests} onChange={(event) => setRoommateForm((value) => ({ ...value, interests: event.target.value }))} /></Field>
          <div className="form-grid">
            <Field label="Cleanliness"><input type="number" min="1" max="10" value={roommateForm.cleanliness} onChange={(event) => setRoommateForm((value) => ({ ...value, cleanliness: event.target.value }))} /></Field>
            <Field label="Social Level"><input type="number" min="1" max="10" value={roommateForm.socialLevel} onChange={(event) => setRoommateForm((value) => ({ ...value, socialLevel: event.target.value }))} /></Field>
            <Field label="Study Habits"><input type="number" min="1" max="10" value={roommateForm.studyHabits} onChange={(event) => setRoommateForm((value) => ({ ...value, studyHabits: event.target.value }))} /></Field>
          </div>
          <div className="form-grid">
            <Field label="Address"><input value={roommateForm.address} onChange={(event) => setRoommateForm((value) => ({ ...value, address: event.target.value }))} required /></Field>
            <Field label="Latitude"><input value={roommateForm.lat} onChange={(event) => setRoommateForm((value) => ({ ...value, lat: event.target.value }))} /></Field>
            <Field label="Longitude"><input value={roommateForm.lng} onChange={(event) => setRoommateForm((value) => ({ ...value, lng: event.target.value }))} /></Field>
            <Field label="Institution Address"><input value={roommateForm.institutionAddress} onChange={(event) => setRoommateForm((value) => ({ ...value, institutionAddress: event.target.value }))} /></Field>
            <Field label="Institution Latitude"><input value={roommateForm.institutionLat} onChange={(event) => setRoommateForm((value) => ({ ...value, institutionLat: event.target.value }))} /></Field>
            <Field label="Institution Longitude"><input value={roommateForm.institutionLng} onChange={(event) => setRoommateForm((value) => ({ ...value, institutionLng: event.target.value }))} /></Field>
          </div>
          <Field label="Preferred Flat ID" hint="Optional, to link this roommate profile to a flat."><input value={roommateForm.preferredFlatId} onChange={(event) => setRoommateForm((value) => ({ ...value, preferredFlatId: event.target.value }))} /></Field>
          <UploadControls images={images} setImages={setImages} tours={tours} setTours={setTours} />
          <div className="btn-group" style={{ marginTop: "1rem" }}>
            <button className="btn btn-primary" type="submit">Create roommate listing</button>
          </div>
        </form>
      )}
    </div>
  )
}

export function FlatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUser = useRequireAuth()
  const [item, setItem] = useState(null)
  const [status, setStatus] = useState("")
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    let cancelled = false
    setStatus("Loading flat...")

    Promise.all([
      api.get(`/api/flats/${id}`),
      currentUser ? api.post(`/api/flats/${id}/view`, { viewerUserId: currentUser.id }) : api.get(`/api/flats/${id}`),
    ])
      .then(([flat]) => {
        if (!cancelled) {
          setItem(flat)
          setLiked(getFavoriteIds().includes(String(id)))
          setStatus("")
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus(error.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentUser, id])

  async function toggleLike() {
    if (!currentUser) {
      navigate("/login")
      return
    }

    try {
      const response = await api.post(`/api/flats/${id}/like`, { userId: currentUser.id })
      const next = toggleFavoriteId(id)
      setLiked(next.includes(String(id)))
      setItem(response.flat)
      setStatus(response.liked ? "Saved locally and on the backend." : "Removed from saved flats.")
    } catch (error) {
      setStatus(error.message)
    }
  }

  if (status && !item) {
    return <LoadingState label={status} />
  }

  if (!item) {
    return <EmptyState title="Flat not found" description="The listing may have been removed or is unavailable." />
  }

  const ownerChatLink = `/chat?flatId=${encodeURIComponent(item.id)}`

  return (
    <div className="page-shell">
      <PageSection
        title={item.title}
        description={item.location?.address}
        action={(
          <div className="btn-group">
            <button className="btn btn-secondary" type="button" onClick={toggleLike}>{liked ? "Unsave" : "Save"}</button>
            <Link className="btn btn-primary" to={ownerChatLink}>Message owner</Link>
          </div>
        )}
      >
        {status ? <div className="status-banner">{status}</div> : null}
        <div className="split-layout">
          <div className="card-list">
            <img src={item.images?.[0] || "/assets/modern-apartment-living.png"} alt={item.title} className="gallery-image" />
            <div className="detail-gallery">
              {(item.images || []).slice(1).map((src) => <img key={src} src={src} alt={item.title} />)}
            </div>
            <div className="note-card">
              <strong>{formatINR(item.rent)} / month</strong>
              <div className="note-meta">{item.description}</div>
            </div>
            <div className="note-card">
              <strong>Owner</strong>
              <div className="note-meta">{item.ownerName}</div>
            </div>
            <div className="note-card">
              <strong>Available from</strong>
              <div className="note-meta">{item.availableFrom}</div>
            </div>
            <div className="note-card">
              <strong>Map</strong>
              <div className="note-meta"><a href={buildMapHref(item.location?.address, item.location?.coordinates)} target="_blank" rel="noreferrer">Open location</a></div>
            </div>
          </div>

          <div className="card-list">
            <div className="note-card">
              <strong>Details</strong>
              <div className="note-meta">{item.flatType === "room-only" ? "Room only" : "Room with roommates"}</div>
            </div>
            <div className="note-card">
              <strong>Stats</strong>
              <div className="note-meta">Views: {item.stats?.views ?? 0} | Likes: {item.stats?.likes ?? 0} | Messages: {item.stats?.uniqueMessageUsers ?? 0}</div>
            </div>
            <div className="note-card">
              <strong>Amenities</strong>
              <div className="chip-list">{(item.amenities || []).map((amenity) => <span className="chip" key={amenity}>{amenity}</span>)}</div>
            </div>
            <div className="note-card">
              <strong>Roommates</strong>
              <div className="chip-list">{(item.roommateProfiles || []).length ? item.roommateProfiles.map((roommate) => <span className="chip" key={roommate.id}>{roommate.name}</span>) : <span className="helper-text">No roommates linked</span>}</div>
            </div>
            <div className="note-card">
              <strong>Virtual tours</strong>
              <div className="detail-gallery">
                {(item.virtualTourUrls || []).map((src) => <img key={src} src={src} alt="360 tour" />)}
              </div>
            </div>
          </div>
        </div>
      </PageSection>
    </div>
  )
}

export function RoommatePage() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [status, setStatus] = useState("")

  useEffect(() => {
    let cancelled = false
    setStatus("Loading roommate profile...")
    api.get(`/api/roommates/${id}`)
      .then((response) => {
        if (!cancelled) {
          setItem(response)
          setStatus("")
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus(error.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (status && !item) {
    return <LoadingState label={status} />
  }

  if (!item) {
    return <EmptyState title="Roommate not found" description="The profile may have been removed or is unavailable." />
  }

  return (
    <div className="page-shell">
      <PageSection
        title={item.name}
        description={item.displayAddress || item.address || item.institutionAddress}
        action={<Link className="btn btn-primary" to={`/chat?roommateId=${encodeURIComponent(item.id)}`}>Message</Link>}
      >
        {status ? <div className="status-banner">{status}</div> : null}
        <div className="split-layout">
          <div className="card-list">
            <img src={item.images?.[0] || "/assets/modern-apartment-living.png"} alt={item.name} className="gallery-image" />
            <div className="detail-gallery">
              {(item.images || []).slice(1).map((src) => <img key={src} src={src} alt={item.name} />)}
            </div>
            <div className="note-card"><strong>Budget</strong><div className="note-meta">{formatINR(item.preferredRentMax)} per month</div></div>
            <div className="note-card"><strong>Age / Course</strong><div className="note-meta">{item.age} years, {item.course}</div></div>
            <div className="note-card"><strong>Bio</strong><div className="note-meta">{item.bio}</div></div>
          </div>

          <div className="card-list">
            <div className="note-card"><strong>Distance</strong><div className="note-meta">{typeof item.distanceToInstitutionKm === "number" ? `${item.distanceToInstitutionKm} km from institution` : "Distance info unavailable"}</div></div>
            <div className="note-card"><strong>Traits</strong><div className="note-meta">Cleanliness {item.personality?.cleanliness ?? 5}/10, Social {item.personality?.socialLevel ?? 5}/10, Study {item.personality?.studyHabits ?? 5}/10</div></div>
            <div className="note-card"><strong>Interests</strong><div className="chip-list">{(item.interests || []).map((interest) => <span className="chip" key={interest}>{interest}</span>)}</div></div>
            <div className="note-card"><strong>Map</strong><div className="note-meta"><a href={buildMapHref(item.displayAddress || item.address, item.mapCoordinates)} target="_blank" rel="noreferrer">Open location</a></div></div>
            <div className="note-card"><strong>Tour</strong><div className="detail-gallery">{(item.virtualTourUrls || []).map((src) => <img key={src} src={src} alt="360 tour" />)}</div></div>
          </div>
        </div>
      </PageSection>
    </div>
  )
}

export function ProfilePage() {
  const currentUser = useRequireAuth()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState(null)
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { replace: true })
      return
    }

    api.get(`/api/profile/${currentUser.id}`)
      .then((profile) => {
        setForm({
          name: profile.name || "",
          bio: profile.bio || "",
          university: profile.university || "",
          course: profile.course || "",
          interests: toCommaString(profile.interests || []),
        })
      })
      .catch(() => {
        setForm({
          name: currentUser.name || "",
          bio: currentUser.bio || "",
          university: currentUser.university || "",
          course: currentUser.course || "",
          interests: toCommaString(currentUser.interests || []),
        })
      })
  }, [currentUser, navigate])

  if (!currentUser || !form) {
    return <LoadingState label="Loading profile..." />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus("Saving profile...")

    try {
      const updated = await api.put(`/api/profile/${currentUser.id}`, {
        name: form.name,
        bio: form.bio,
        university: form.university,
        course: form.course,
        interests: splitCommaString(form.interests),
      })
      login(updated)
      setStatus("Profile saved.")
    } catch (error) {
      setStatus(error.message)
    }
  }

  return (
    <div className="page-shell">
      <PageSection title="Edit profile" description="Update your public profile details.">
        <form className="glass-panel panel" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Name"><input value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></Field>
            <Field label="University"><input value={form.university} onChange={(event) => setForm((value) => ({ ...value, university: event.target.value }))} /></Field>
            <Field label="Course"><input value={form.course} onChange={(event) => setForm((value) => ({ ...value, course: event.target.value }))} /></Field>
          </div>
          <Field label="Bio"><textarea value={form.bio} onChange={(event) => setForm((value) => ({ ...value, bio: event.target.value }))} /></Field>
          <Field label="Interests"><input value={form.interests} onChange={(event) => setForm((value) => ({ ...value, interests: event.target.value }))} /></Field>
          <div className="btn-group">
            <button className="btn btn-primary" type="submit">Save profile</button>
          </div>
          {status ? <p className="helper-text">{status}</p> : null}
        </form>
      </PageSection>
    </div>
  )
}

export function SubscriptionPage() {
  const currentUser = useRequireAuth()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [config, setConfig] = useState(null)
  const [profile, setProfile] = useState(null)
  const [plan, setPlan] = useState(SUBSCRIPTION_PLANS.premium.key)
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { replace: true })
      return
    }

    let cancelled = false

    Promise.all([api.get("/api/payment/config"), api.get(`/api/profile/${currentUser.id}`)])
      .then(([paymentConfig, userProfile]) => {
        if (cancelled) {
          return
        }

        setConfig(paymentConfig)
        setProfile(userProfile)
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus(error.message)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentUser, navigate])

  if (!currentUser) {
    return null
  }

  const subscription = profile?.subscription || currentUser.subscription || { active: false, plan: "Free" }
  const lockIsActive = Boolean(subscription?.active)

  async function startCheckout(planKey) {
    const selectedPlan = SUBSCRIPTION_PLANS[planKey]
    if (!selectedPlan) {
      setStatus("Invalid plan selected.")
      return
    }

    if (lockIsActive) {
      setStatus("Your current subscription is already active.")
      return
    }

    setStatus("Preparing Razorpay checkout...")

    try {
      const paymentConfig = config || (await api.get("/api/payment/config"))
      if (!paymentConfig.enabled || !paymentConfig.keyId) {
        setStatus("Payment is not configured. Add Razorpay keys first.")
        return
      }

      await loadRazorpayScript()

      const order = await api.post("/api/payment/create-order", {
        amount: selectedPlan.amount,
        currency: "INR",
        receipt: `sub_${currentUser.id}_${Date.now()}`,
        notes: {
          type: "subscription",
          userId: currentUser.id,
          plan: selectedPlan.key,
        },
      })

      const razorpay = new window.Razorpay({
        key: paymentConfig.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Student Flat Finder",
        description: selectedPlan.description,
        order_id: order.id,
        prefill: {
          name: currentUser.name || "Student User",
          email: currentUser.email || "",
        },
        handler: async (response) => {
          try {
            const verify = await api.post("/api/payment/verify", {
              ...response,
              userId: currentUser.id,
              plan: selectedPlan.key,
            })

            if (verify?.user) {
              login(verify.user)
              setProfile(verify.user)
            }

            setStatus(verify.subscriptionActivated ? `Subscription activated as ${selectedPlan.label}.` : verify.message || "Payment verified.")
          } catch (error) {
            setStatus(error.message)
          }
        },
        theme: {
          color: "#2563eb",
        },
      })

      razorpay.on("payment.failed", (error) => {
        setStatus(error.error?.description || "Payment failed")
      })

      razorpay.open()
    } catch (error) {
      setStatus(error.message)
    }
  }

  if (loading) {
    return <LoadingState label="Loading subscription status..." />
  }

  return (
    <div className="page-shell">
      <PageSection title="Subscription" description="Start free, then pay through Razorpay when you upgrade.">
        <div className="status-banner" style={{ marginBottom: "1rem" }}>
          Current plan: {lockIsActive ? `${subscription.plan || "Active"} active` : "Free"}
        </div>
        <div className="section-grid">
          <div className="glass-panel panel pricing-card">
            <h2>Free</h2>
            <p>Basic browsing and limited chat.</p>
            <span className="price-tag">Free</span>
          </div>
          <div className="glass-panel panel pricing-card">
            <h2>Premium</h2>
            <p>{SUBSCRIPTION_PLANS.premium.description}</p>
            <span className="price-tag">{formatINR(499)}</span>
            <div className="btn-group">
              <button className="btn btn-primary" type="button" onClick={() => setPlan(SUBSCRIPTION_PLANS.premium.key)}>Choose Premium</button>
              <button className="btn btn-secondary" type="button" onClick={() => startCheckout("premium")} disabled={lockIsActive}>
                Pay with Razorpay
              </button>
            </div>
          </div>
          <div className="glass-panel panel pricing-card">
            <h2>Premium Yearly</h2>
            <p>{SUBSCRIPTION_PLANS.yearly.description}</p>
            <span className="price-tag">{formatINR(2999)}</span>
            <div className="btn-group">
              <button className="btn btn-primary" type="button" onClick={() => setPlan(SUBSCRIPTION_PLANS.yearly.key)}>Choose Yearly</button>
              <button className="btn btn-secondary" type="button" onClick={() => startCheckout("yearly")} disabled={lockIsActive}>
                Pay with Razorpay
              </button>
            </div>
          </div>
        </div>
        <div className="status-banner" style={{ marginTop: "1rem" }}>
          Secure payment checkout is ready when you choose a plan.
        </div>
        {status ? <p className="helper-text">{status}</p> : null}
      </PageSection>
    </div>
  )
}

function ConversationView({ title, messages = [], onSubmit, message, setMessage, placeholder }) {
  return (
    <div className="chat-thread-panel glass-panel">
      <div className="chat-thread-head">
        <h2>{title}</h2>
      </div>
      <div className="thread-messages">
        {messages.length ? messages.map((item) => (
          <div key={item.id || `${item.senderEmail}-${item.createdAt}`} className="message-item">
            <strong>{item.senderName}</strong>
            <div className="meta">{new Date(item.createdAt).toLocaleString()}</div>
            <p>{item.message}</p>
          </div>
        )) : <EmptyState title="No messages yet" description="Start the conversation from this listing." />}
      </div>
      <form className="chat-compose" onSubmit={onSubmit}>
        <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={placeholder} />
        <button className="btn btn-primary" type="submit">Send</button>
      </form>
    </div>
  )
}

export function ChatPage() {
  const currentUser = useRequireAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const flatId = searchParams.get("flatId")
  const roommateId = searchParams.get("roommateId")
  const [listing, setListing] = useState(null)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { replace: true })
      return
    }

    if (!flatId && !roommateId) {
      return
    }

    let cancelled = false
    let stream = null

    async function load() {
      try {
        if (flatId) {
          const [flat, chat] = await Promise.all([api.get(`/api/flats/${flatId}`), api.get(`/api/chat/${flatId}`)])
          if (!cancelled) {
            setListing({ type: "flat", data: flat })
            setMessages(Array.isArray(chat) ? chat : [])
          }

          stream = new EventSource(`/api/chat/${flatId}/stream`)
          stream.addEventListener("chat-message", () => {
            api.get(`/api/chat/${flatId}`).then((chatResponse) => {
              if (!cancelled) {
                setMessages(Array.isArray(chatResponse) ? chatResponse : [])
              }
            }).catch(() => null)
          })
        }

        const [roommate, chat] = await Promise.all([
          api.get(`/api/roommates/${roommateId}`),
          api.get(`/api/roommate-chat/${roommateId}?userId=${encodeURIComponent(currentUser.id)}`),
        ])
        if (!cancelled) {
          setListing({ type: "roommate", data: roommate })
          setMessages(Array.isArray(chat) ? chat : [])
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error.message)
        }
      }
    }

    const cleanup = load()

    return () => {
      cancelled = true
      if (stream) {
        stream.close()
      }
    }
  }, [currentUser, flatId, roommateId, navigate])

  if (!currentUser) {
    return null
  }

  if (!flatId && !roommateId) {
    return (
      <div className="page-shell">
        <EmptyState
          title="Choose a conversation"
          description="Open a flat or roommate detail page and use the message button there."
        />
      </div>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!message.trim()) {
      return
    }

    setStatus("Sending message...")

    try {
      if (flatId && listing?.type === "flat") {
        const flat = listing.data
        const payload = {
          senderName: currentUser.name,
          senderEmail: currentUser.email,
          senderUserId: currentUser.id,
          message,
          recipientUserId: currentUser.id === flat.ownerId ? undefined : flat.ownerId,
          recipientEmail: currentUser.id === flat.ownerId ? undefined : flat.ownerEmail,
          target: currentUser.id === flat.ownerId ? "owner" : "owner",
        }
        const sent = await api.post(`/api/chat/${flatId}`, payload)
        setMessages((value) => [...value, sent])
      } else if (roommateId && listing?.type === "roommate") {
        const roommate = listing.data
        const payload = {
          roommateId,
          senderName: currentUser.name,
          senderEmail: currentUser.email,
          senderUserId: currentUser.id,
          message,
        }
        if (currentUser.id !== roommate.createdByUserId) {
          payload.recipientUserId = roommate.createdByUserId
        }
        const sent = await api.post(`/api/roommate-chat/${roommateId}`, payload)
        setMessages((value) => [...value, sent])
      }
      setMessage("")
      setStatus("Message sent.")
    } catch (error) {
      setStatus(error.message)
    }
  }

  const listingTitle = listing?.type === "flat" ? listing.data?.title : listing?.data?.name

  return (
    <div className="page-shell chat-page">
      <PageSection title={listingTitle || "Messages"} description="Chat with owners or roomie matches.">
        {status ? <div className="status-banner">{status}</div> : null}
        <div className="chat-shell">
          <div className="chat-list-pane glass-panel">
            <div className="note-card">
              <strong>Conversation type</strong>
              <div className="note-meta">{flatId ? "Flat chat" : "Roommate chat"}</div>
            </div>
            <div className="note-card">
              <strong>Open from</strong>
              <div className="note-meta">{flatId ? <Link to={`/flat/${flatId}`}>Flat details</Link> : <Link to={`/roommate/${roommateId}`}>Roommate details</Link>}</div>
            </div>
          </div>
          <ConversationView
            title={listingTitle || "Conversation"}
            messages={messages}
            onSubmit={handleSubmit}
            message={message}
            setMessage={setMessage}
            placeholder="Write a message..."
          />
        </div>
      </PageSection>
    </div>
  )
}

export function QuizPage() {
  const currentUser = useRequireAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState("")
  const [results, setResults] = useState([])
  const [form, setForm] = useState({
    university: currentUser?.university || "",
    cleanliness: currentUser?.personality?.cleanliness ?? 5,
    socialLevel: currentUser?.personality?.socialLevel ?? 5,
    studyHabits: currentUser?.personality?.studyHabits ?? 5,
    interests: toCommaString(currentUser?.interests || []),
    minimumScore: 0,
  })

  useEffect(() => {
    if (!currentUser && !new URLSearchParams(window.location.search).get("onboarding")) {
      navigate("/login", { replace: true })
    }
  }, [currentUser, navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus("Finding matches...")

    try {
      const response = await api.post("/api/quiz/match", {
        university: form.university,
        cleanliness: Number(form.cleanliness),
        socialLevel: Number(form.socialLevel),
        studyHabits: Number(form.studyHabits),
        interests: splitCommaString(form.interests),
        minimumScore: Number(form.minimumScore),
      })
      setResults(Array.isArray(response) ? response : [])
      setStatus(response.length ? `Found ${response.length} match(es).` : "No matches found.")
    } catch (error) {
      setStatus(error.message)
    }
  }

  return (
    <div className="page-shell">
      <PageSection title="Personality quiz" description="Match students and listings based on style, habits, and interests.">
        <form className="glass-panel panel" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="University"><input value={form.university} onChange={(event) => setForm((value) => ({ ...value, university: event.target.value }))} /></Field>
            <Field label="Cleanliness"><input type="number" min="1" max="10" value={form.cleanliness} onChange={(event) => setForm((value) => ({ ...value, cleanliness: event.target.value }))} /></Field>
            <Field label="Social Level"><input type="number" min="1" max="10" value={form.socialLevel} onChange={(event) => setForm((value) => ({ ...value, socialLevel: event.target.value }))} /></Field>
            <Field label="Study Habits"><input type="number" min="1" max="10" value={form.studyHabits} onChange={(event) => setForm((value) => ({ ...value, studyHabits: event.target.value }))} /></Field>
            <Field label="Interests"><input value={form.interests} onChange={(event) => setForm((value) => ({ ...value, interests: event.target.value }))} /></Field>
            <Field label="Minimum score"><input type="number" min="0" max="40" value={form.minimumScore} onChange={(event) => setForm((value) => ({ ...value, minimumScore: event.target.value }))} /></Field>
          </div>
          <div className="btn-group" style={{ marginTop: "1rem" }}>
            <button className="btn btn-primary" type="submit">Find matches</button>
          </div>
          {status ? <p className="helper-text">{status}</p> : null}
        </form>
      </PageSection>

      {results.length ? (
        <div className="flat-grid" style={{ marginTop: "1rem" }}>
          {results.map((item) => <ListingCard key={item.id} item={item} kind="flat" />)}
        </div>
      ) : null}
    </div>
  )
}

export function FavoritesPage() {
  const [favorites, setFavorites] = useState(() => getFavoriteIds())
  const [items, setItems] = useState([])

  useEffect(() => {
    api.get("/api/flats")
      .then((flats) => {
        const favoriteSet = new Set(favorites)
        setItems((Array.isArray(flats) ? flats : []).filter((item) => favoriteSet.has(String(item.id))))
      })
      .catch(() => setItems([]))
  }, [favorites])

  if (!favorites.length) {
    return (
      <div className="page-shell">
        <EmptyState title="No saved flats yet" description="Tap Save on a flat detail page to keep it here." />
      </div>
    )
  }

  return (
    <div className="page-shell">
      <PageSection title="Favorites" description="Saved flats stored locally in your browser.">
        <div className="flat-grid">
          {items.map((item) => <ListingCard key={item.id} item={item} kind="flat" />)}
        </div>
      </PageSection>
    </div>
  )
}

export function CommunityPage() {
  return <SimplePage title="Community" description="A place for discussions, help, and student housing advice." />
}

export function FeedbackPage() {
  const [text, setText] = useState("")
  const [status, setStatus] = useState("")

  function handleSubmit(event) {
    event.preventDefault()
    localStorage.setItem("sff_feedback_note", text)
    setStatus("Feedback saved locally.")
  }

  return (
    <div className="page-shell">
      <PageSection title="Feedback" description="Leave product feedback without touching backend code.">
        <form className="glass-panel panel" onSubmit={handleSubmit}>
          <Field label="Message"><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Tell us what should improve." /></Field>
          <div className="btn-group">
            <button className="btn btn-primary" type="submit">Save feedback</button>
            <a className="btn btn-light" href="mailto:support@studentflatfinder.com">Email support</a>
          </div>
          {status ? <p className="helper-text">{status}</p> : null}
        </form>
      </PageSection>
    </div>
  )
}

export function NotificationsPage() {
  return <SimplePage title="Notifications" description="Subscription, chat, and listing alerts can live here in React." />
}

export function ReviewsPage() {
  return <SimplePage title="Reviews" description="A future-friendly reviews area for flats, owners, and roomie matches." />
}

function SimplePage({ title, description }) {
  return (
    <div className="page-shell">
      <EmptyState title={title} description={description} />
    </div>
  )
}

const SUBSCRIPTION_PLANS = {
  premium: {
    key: "Premium",
    label: "Premium",
    amount: 49900,
    description: "Unlock longer chat access and booking flexibility.",
  },
  yearly: {
    key: "Premium yearly",
    label: "Premium Yearly",
    amount: 299900,
    description: "Best value for longer stays.",
  },
}

let razorpayScriptPromise = null

function loadRazorpayScript() {
  if (window.Razorpay) {
    return Promise.resolve(true)
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.async = true
      script.onload = () => resolve(true)
      script.onerror = () => reject(new Error("Unable to load Razorpay checkout"))
      document.body.appendChild(script)
    })
  }

  return razorpayScriptPromise
}

export function NotFoundPage() {
  return (
    <div className="page-shell">
      <EmptyState title="Page not found" description="Use the navigation to return to the React app." />
    </div>
  )
}
