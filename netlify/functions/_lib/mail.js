function logResetEmail(email, resetUrl) {
  console.log(`[password-reset] to=${email} url=${resetUrl}`);
}

module.exports = {
  logResetEmail,
};
