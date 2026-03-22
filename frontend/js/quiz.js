const quizForm = document.getElementById("quizForm")
const quizStatus = document.getElementById("quizStatus")
const recommendations = document.getElementById("recommendations")

const currentUser = window.AppUtils.ensureLoggedIn("/login")

function prefillQuizForm(userProfile) {
  if (!quizForm || !userProfile) {
    return
  }

  const setField = (name, value) => {
    const node = quizForm.querySelector(`[name="${name}"]`)
    if (!node || value === undefined || value === null) {
      return
    }
    node.value = value
  }

  setField("cleanliness", Number(userProfile.personality?.cleanliness || 5))
  setField("socialLevel", Number(userProfile.personality?.socialLevel || 5))
  setField("studyHabits", Number(userProfile.personality?.studyHabits || 5))
  setField("interests", Array.isArray(userProfile.interests) ? userProfile.interests.join(", ") : "")
}

if (currentUser) {
  const onboardingMode = new URLSearchParams(window.location.search).get("onboarding") === "1"

  window.AppUtils
    .api(`/api/profile/${currentUser.id}`)
    .then((profile) => {
      prefillQuizForm(profile)
      if (onboardingMode) {
        quizStatus.textContent = "Complete your preferences to get personalized room matches."
      }
    })
    .catch(() => {
      prefillQuizForm(currentUser)
    })

  quizForm.addEventListener("submit", async (event) => {
    event.preventDefault()

    const formData = new FormData(quizForm)
    const interestsRaw = String(formData.get("interests") || "")

    const payload = {
      cleanliness: Number(formData.get("cleanliness") || 5),
      socialLevel: Number(formData.get("socialLevel") || 5),
      studyHabits: Number(formData.get("studyHabits") || 5),
      interests: interestsRaw
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    }

    try {
      const result = await window.AppUtils.api("/api/quiz/match", {
        method: "POST",
        body: JSON.stringify(payload),
      })

      const updatedUser = {
        ...currentUser,
        interests: payload.interests,
        personality: {
          cleanliness: payload.cleanliness,
          socialLevel: payload.socialLevel,
          studyHabits: payload.studyHabits,
        },
      }

      await window.AppUtils.api(`/api/profile/${currentUser.id}`, {
        method: "PUT",
        body: JSON.stringify(updatedUser),
      })

      window.AppUtils.setCurrentUser(updatedUser)
      quizStatus.textContent = onboardingMode
        ? "Preferences saved. Redirecting to your matched dashboard..."
        : "AI matching complete. Top recommendations below."

      recommendations.innerHTML = result.recommendations
        .map(
          (flat) => `
          <article class="card">
            <h3>${flat.title}</h3>
            <p class="muted">${flat.location.address}</p>
            <p>${window.AppUtils.formatINR(flat.rent)} / month</p>
            <p class="muted">Match score: ${flat.matchScore}</p>
            <a class="btn btn-secondary small-btn" href="/flat/${flat.id}">View Room</a>
          </article>
        `,
        )
        .join("")

      if (onboardingMode) {
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 900)
      }
    } catch (error) {
      quizStatus.textContent = error.message
    }
  })
}
