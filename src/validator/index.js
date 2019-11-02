const UserValidator = require('@app/validator/userValidator').getInstance()

module.exports = {
  signUpValidator: UserValidator.signUp,
  newPasswordValidator: UserValidator.newPassword,
  changePasswordValidator: UserValidator.changePassword,
  updateUserValidator: UserValidator.updateUser
}
