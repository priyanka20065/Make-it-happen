require("dotenv").config()

const express = require("express")
// const crypto = require("crypto")
const { flats: seedFlats, roommates: seedRoommates } = require("./data/flats")
const { uploadsDir, imageUpload, staticNoCacheOptions } = require("./config/upload")
const { createAppContext } = require("./services/appContext")

const app = express()
const PORT = process.env.PORT || 4000

app.use(express.json())
app.use("/uploads", express.static(uploadsDir, staticNoCacheOptions))

const appContext = createAppContext({ seedFlats, seedRoommates })

require("./routes/api")(app, {
  ...appContext,
  imageUpload,
  crypto,
})

app.use((error, _req, res, next) => {
  if (!error) {
    next()
    return
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ message: "Image is too large. Please upload files up to 25MB each." })
    return
  }

  if (error.name === "MulterError") {
    res.status(400).json({ message: error.message || "Image upload failed" })
    return
  }

  if (String(_req.path || "").startsWith("/api")) {
    res.status(500).json({ message: error.message || "Server error" })
    return
  }

  next(error)
})

function startServer(portArg, maxRetries = 5) {
  const currentPort = Number(portArg)
  const server = app
    .listen(currentPort, () => {
      console.log(`Express server running at http://localhost:${currentPort}`)
    })
    .on("error", (error) => {
      if (error.code === "EADDRINUSE" && maxRetries > 0) {
        const nextPort = currentPort + 1
        console.warn(`Port ${currentPort} is in use. Trying ${nextPort}...`)
        startServer(nextPort, maxRetries - 1)
        return
      }

      throw error
    })

  return server
}

async function bootstrap() {
  appContext.pruneUnsupportedListingsFromState()
  await appContext.initializeMongoState()
  await appContext.backfillRoommateLocationData()
  startServer(PORT)
}

bootstrap()
