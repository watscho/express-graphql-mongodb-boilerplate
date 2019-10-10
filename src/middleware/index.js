const AuthMiddleware = require('@app/middleware/authMiddleware')

module.exports = {
  isAuth: AuthMiddleware.isAuth,
  isGuest: AuthMiddleware.isGuest,
  isUnverfied: AuthMiddleware.isUnverfied,
  isVerified: AuthMiddleware.isVerified
}
