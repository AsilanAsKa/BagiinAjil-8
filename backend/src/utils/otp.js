const bcrypt = require('bcrypt');

const OTP_TTL_MS = 2 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 3;

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function createOtp() {
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);

  return {
    code,
    data: {
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
      locked: false
    }
  };
}

module.exports = {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  createOtp,
  generateOtpCode
};
