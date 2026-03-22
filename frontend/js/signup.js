const signupForm = document.getElementById("signupForm")
const signupStatus = document.getElementById("signupStatus")
const signupIntentStudent = document.getElementById("signupIntentStudent")
const signupIntentOwner = document.getElementById("signupIntentOwner")
const signupStudentFlow = document.getElementById("signupStudentFlow")
const signupFlowBuy = document.getElementById("signupFlowBuy")
const signupFlowRoommate = document.getElementById("signupFlowRoommate")
const signupUniversityWrap = document.getElementById("signupUniversityWrap")
const signupUniversity = document.getElementById("signupUniversity")

function toggleSignupStudentFlow() {
  const isStudent = Boolean(signupIntentStudent?.checked)
  const isRoomOnlyFlow = Boolean(signupFlowBuy?.checked)
  signupStudentFlow?.classList.toggle("hidden", !isStudent)
  signupUniversityWrap?.classList.toggle("hidden", !isStudent || !isRoomOnlyFlow)
  if (signupUniversity) {
    signupUniversity.required = isStudent && isRoomOnlyFlow
  }
}

function resolveRedirect(user) {
  const intent = String(user?.intent || "").toLowerCase()
  const preferredRoomType = String(user?.preferredRoomType || "").toLowerCase()

  if (intent !== "owner" && preferredRoomType === "room-only") {
    return "/personality-quiz?onboarding=1"
  }

  return "/dashboard"
}

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault()

  const formData = new FormData(signupForm)
  const payload = Object.fromEntries(formData.entries())

  if (payload.password !== payload.confirmPassword) {
    signupStatus.textContent = "Passwords do not match"
    return
  }

  const isNormalStudent = payload.intent === "seeker" && (payload.preferredRoomType || "room-only") === "room-only"
  if (isNormalStudent && !String(payload.university || "").trim()) {
    signupStatus.textContent = "University / College name is required for normal students."
    return
  }

  try {
    const interests = String(payload.interests || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)

    const user = await window.AppUtils.api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        intent: payload.intent,
        preferredRoomType: payload.intent === "owner" ? null : payload.preferredRoomType || "room-only",
        university: String(payload.university || "").trim(),
        password: payload.password,
        course: payload.course,
        bio: payload.bio,
        interests,
        personality: {
          cleanliness: Number(payload.cleanliness || 5),
          socialLevel: Number(payload.socialLevel || 5),
          studyHabits: Number(payload.studyHabits || 5),
        },
      }),
    })

    window.AppUtils.setCurrentUser(user)
    signupStatus.textContent = "Signup successful. Redirecting..."
    setTimeout(() => {
      window.location.href = resolveRedirect(user)
    }, 900)
  } catch (error) {
    signupStatus.textContent = error.message
  }
})

signupIntentStudent?.addEventListener("change", toggleSignupStudentFlow)
signupIntentOwner?.addEventListener("change", toggleSignupStudentFlow)
signupFlowBuy?.addEventListener("change", toggleSignupStudentFlow)
signupFlowRoommate?.addEventListener("change", toggleSignupStudentFlow)
toggleSignupStudentFlow()
