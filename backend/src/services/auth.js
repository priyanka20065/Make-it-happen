const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const SALT_ROUNDS = 10
const JWT_EXPIRY = "7d"

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Compare a password with its hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

/**
 * Generate a JWT token
 */
function generateToken(userId, email) {
  const secret = process.env.JWT_SECRET || "your-secret-key-change-in-env"
  return jwt.sign(
    { userId, email, iat: Date.now() },
    secret,
    { expiresIn: JWT_EXPIRY }
  )
}

/**
 * Verify a JWT token
 */
function verifyToken(token) {
  try {
    const secret = process.env.JWT_SECRET || "your-secret-key-change-in-env"
    return jwt.verify(token, secret)
  } catch (error) {
    return null
  }
}

/**
 * Extract token from Authorization header
 */
function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || ""
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }
  return null
}

/**
 * Middleware to verify JWT token
 */
function authMiddleware(req, res, next) {
  const token = getTokenFromRequest(req)
  
  if (!token) {
    return res.status(401).json({ message: "No token provided" })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired token" })
  }

  req.user = decoded
  next()
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  getTokenFromRequest,
  authMiddleware,
}
