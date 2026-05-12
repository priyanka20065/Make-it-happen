import { Link } from "react-router-dom"
import { buildMapHref, formatINR } from "../api"

function ChipList({ items }) {
  if (!Array.isArray(items) || !items.length) {
    return null
  }

  return <div className="chip-list">{items.map((item) => <span className="chip" key={item}>{item}</span>)}</div>
}

export default function ListingCard({ item, kind = "flat" }) {
  if (kind === "roommate") {
    const locationLabel = item.displayAddress || item.address || item.location?.address || item.institutionAddress || "Campus Area"
    const mapHref = buildMapHref(locationLabel, item.mapCoordinates || item.location?.coordinates)
    const distanceLine = typeof item.distanceToInstitutionKm === "number"
      ? `${item.distanceToInstitutionKm} km from ${item.institutionAddress || item.institution?.address || "your institution"}`
      : "Distance info unavailable"

    return (
      <article className="flat-card">
        <img src={item.images?.[0] || "/assets/modern-apartment-living.png"} alt={item.name} className="flat-image" />
        <div className="flat-content">
          <h3>{item.name}</h3>
          <p className="muted"><small>{locationLabel}</small></p>
          <p className="text-justify">{item.bio}</p>

          <div className="listing-meta-row">
            <span className="price-tag">{formatINR(item.preferredRentMax)}</span>
            <span className="muted">/ month</span>
          </div>

          <span className="trait-label">Traits & Distance</span>
          <p className="muted"><small>{distanceLine}</small></p>
          <div className="chip-list">
            <span className="chip">Cleanliness: {item.personality?.cleanliness ?? 5}/10</span>
            <span className="chip">Social: {item.personality?.socialLevel ?? 5}/10</span>
            <span className="chip">Study: {item.personality?.studyHabits ?? 5}/10</span>
          </div>

          <span className="trait-label">Interests</span>
          <ChipList items={item.interests || []} />

          <div className="card-footer">
            <a className="btn btn-secondary small-btn" href={mapHref} target="_blank" rel="noreferrer">Map</a>
            <Link className="btn btn-primary small-btn" to={`/roommate/${encodeURIComponent(item.id)}`}>Details</Link>
          </div>
        </div>
      </article>
    )
  }

  const mapHref = buildMapHref(item.location?.address, item.location?.coordinates)
  const statusBadge = item.stats?.isSold ? (
    <span className="badge badge-sold">Sold to {item.stats?.purchasedByName || "buyer"}</span>
  ) : (
    <span className="badge badge-available">Available</span>
  )

  return (
    <article className="flat-card">
      <img src={item.images?.[0] || "/assets/modern-apartment-living.png"} alt={item.title} className="flat-image" />
      <div className="flat-content">
        <div className="card-top-row">
          <h3><Link to={`/flat/${item.id}`}>{item.title}</Link></h3>
          {statusBadge}
        </div>
        <p className="muted"><small>{item.location?.address}</small></p>
        <p className="text-justify">{item.description}</p>

        <div className="listing-meta-row">
          <span className="price-tag">{formatINR(item.rent)}</span>
          <span className="muted">/ month</span>
        </div>

        <p className="muted"><small>{item.flatType === "room-only" ? "Room Only" : "Room with Roommates"}</small></p>
        <p className="muted"><small>Owner: {item.ownerName}</small></p>

        {item.flatType === "room-with-roommates" && Array.isArray(item.roommateProfiles) && item.roommateProfiles.length ? (
          <>
            <span className="trait-label">Roommates</span>
            <ChipList items={item.roommateProfiles.map((roommate) => `${roommate.name} (${roommate.course})`)} />
          </>
        ) : null}

        <div className="card-footer">
          <a className="btn btn-secondary small-btn" href={mapHref} target="_blank" rel="noreferrer">Map</a>
          <Link className="btn btn-primary small-btn" to={`/flat/${item.id}`}>Details</Link>
        </div>
      </div>
    </article>
  )
}
