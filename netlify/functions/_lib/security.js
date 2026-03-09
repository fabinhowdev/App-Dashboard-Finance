const crypto = require("node:crypto");

function randomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function passwordIsStrong(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(password);
}

function normalizeStoredBcryptHash(hash) {
  const input = String(hash || "");
  if (input.startsWith("$2y$")) {
    return `$2b$${input.slice(4)}`;
  }
  return input;
}

module.exports = {
  randomHex,
  sha256,
  passwordIsStrong,
  normalizeStoredBcryptHash,
};
