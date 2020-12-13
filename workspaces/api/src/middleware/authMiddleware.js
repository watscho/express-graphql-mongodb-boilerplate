const authMiddleware = {
  isAuth: async (resolve, source, args, context, info) => {
    const { user } = context

    if (!user) {
      return Promise.reject(new Error('You must be authorized.'))
    }

    return resolve(source, args, context, info)
  },

  isGuest: async (resolve, source, args, context, info) => {
    const { user } = context

    if (user) {
      return Promise.reject(new Error('You have already authorized.'))
    }

    return resolve(source, args, context, info)
  },

  isVerified: async (resolve, source, args, context, info) => {
    const {
      user: {
        account: {
          verification: { verified }
        }
      }
    } = context

    if (!verified) {
      return Promise.reject(new Error('You must be verified.'))
    }

    return resolve(source, args, context, info)
  },

  isUnverfied: async (resolve, source, args, context, info) => {
    const {
      user: {
        account: {
          verification: { verified }
        }
      }
    } = context

    if (verified) {
      return Promise.reject(new Error('You have already verified.'))
    }

    return resolve(source, args, context, info)
  }
}

module.exports = { authMiddleware }
