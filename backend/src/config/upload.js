const fs = require("fs")
const path = require("path")
const multer = require("multer")

const uploadsDir = path.join(__dirname, "..", "..", "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, uploadsDir)
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg"
      const safeName = path
        .basename(file.originalname || "image", extension)
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "-")
        .slice(0, 32)
      callback(null, `${safeName || "image"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`)
    },
  }),
  fileFilter: (_req, file, callback) => {
    if (String(file.mimetype || "").startsWith("image/")) {
      callback(null, true)
      return
    }

    callback(new Error("Only image files are allowed"))
  },
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
})

const staticNoCacheOptions = {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    res.setHeader("Pragma", "no-cache")
    res.setHeader("Expires", "0")
    res.setHeader("Surrogate-Control", "no-store")
  },
}

module.exports = {
  uploadsDir,
  imageUpload,
  staticNoCacheOptions,
}
