import { useEffect, useMemo, useState } from "react"
import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { getRoleFlags } from "../api"
import { useAuth } from "../auth"

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => (isActive ? "active-link" : undefined)}
      end={to === "/"}
    >
      {children}
    </NavLink>
  )
}

export default function Layout() {
  const { currentUser, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.classList.toggle("auth-screen", ["/login", "/signup"].includes(location.pathname))
  }, [location.pathname])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.search])

  function handleLogout() {
    setOpen(false)
    document.body.classList.add("route-transition")
    window.setTimeout(() => {
      logout()
      navigate("/login", { replace: true })
      window.setTimeout(() => {
        document.body.classList.remove("route-transition")
      }, 160)
    }, 140)
  }

  const links = useMemo(() => {
    const { isOwner, isStudent, isRoommate } = getRoleFlags(currentUser)

    if (isOwner) {
      return [
        ["/", "Home"],
        ["/list?mode=owner", "Listing"],
        ["/dashboard", "Dashboard"],
        ["/chat", "Messages"],
        ["/favorites", "Favorites"],
      ]
    }

    if (isRoommate) {
      return [
        ["/", "Home"],
        ["/list?mode=roommate", "Roommate Listing"],
        ["/dashboard", "Dashboard"],
        ["/chat", "Messages"],
        ["/favorites", "Favorites"],
      ]
    }

    if (isStudent) {
      return [
        ["/", "Home"],
        ["/browse", "Browse"],
        ["/browse/map", "Map View"],
        ["/dashboard", "Dashboard"],
        ["/chat", "Messages"],
        ["/favorites", "Favorites"],
      ]
    }

    return [
      ["/", "Home"],
      ["/browse", "Browse"],
      ["/browse/map", "Map View"],
      ["/list", "List"],
    ]
  }, [currentUser])

  return (
    <>
      <header className="nav">
        <Link to="/" className="brand">Student Flat Finder</Link>
        <nav>
          {links.map(([to, label]) => (
            <NavItem key={to} to={to}>{label}</NavItem>
          ))}
          {currentUser ? (
            <div className="account-menu">
              <button
                type="button"
                className="account-menu-btn"
                aria-expanded={open ? "true" : "false"}
                onClick={(event) => {
                  event.stopPropagation()
                  setOpen((value) => !value)
                }}
              >
                <span className="welcome-text">Welcome, {currentUser.name}</span>
                <span className="account-caret">⌄</span>
              </button>
              <div className={`account-dropdown ${open ? "" : "hidden"}`} role="menu">
                <Link to="/profile" role="menuitem">Edit Profile</Link>
                <Link to="/subscription" role="menuitem">Subscription</Link>
                <Link to="/feedback" role="menuitem">Feedback</Link>
                <button className="account-logout" type="button" role="menuitem" onClick={handleLogout}>Logout</button>
              </div>
            </div>
          ) : (
            <>
              <Link className="btn btn-primary small-btn" to="/login">Login</Link>
              <Link className="btn btn-secondary small-btn" to="/signup">Sign Up</Link>
            </>
          )}
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </>
  )
}
