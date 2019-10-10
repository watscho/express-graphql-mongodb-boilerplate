const UserValidator = require('@app/validator/userValidator')

module.exports = {
  signUpValidator: UserValidator.signUp,
  newPasswordValidator: UserValidator.newPassword,
  changePasswordValidator: UserValidator.changePassword,
  updateUserValidator: UserValidator.updateUser
}
