import { useMemo, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import Layout from "./components/Layout"
import { AuthContext } from "./auth"
import { clearCurrentUser, getCurrentUser, setCurrentUser } from "./api"
import {
  HomePage,
  BrowsePage,
  MapPage,
  LoginPage,
  SignupPage,
  DashboardPage,
  ListPage,
  FlatPage,
  RoommatePage,
  ProfilePage,
  SubscriptionPage,
  ChatPage,
  QuizPage,
  FavoritesPage,
  CommunityPage,
  FeedbackPage,
  NotificationsPage,
  ReviewsPage,
  NotFoundPage,
} from "./pages"

export default function App() {
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser())

  const authValue = useMemo(() => ({
    currentUser,
    login: (user) => {
      setCurrentUser(user)
      setCurrentUserState(user)
    },
    logout: () => {
      clearCurrentUser()
      setCurrentUserState(null)
    },
  }), [currentUser])

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="browse" element={<BrowsePage />} />
            <Route path="browse/map" element={<MapPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="list" element={<ListPage />} />
            <Route path="flat/:id" element={<FlatPage />} />
            <Route path="roommate/:id" element={<RoommatePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="personality-quiz" element={<QuizPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="feedback" element={<FeedbackPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
