const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const DEFAULT_ACCESS_TTL = '15m';
const DEFAULT_REFRESH_TTL = '7d';

function getAccessSecret() {
  return process.env.JWT_ACCESS_SECRET || 'test_access_secret_change_me';
}

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_change_me';
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role
    },
    getAccessSecret(),
    {
      expiresIn: process.env.ACCESS_TOKEN_TTL || DEFAULT_ACCESS_TTL
    }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      jti: crypto.randomUUID(),
      tokenType: 'refresh'
    },
    getRefreshSecret(),
    {
      expiresIn: process.env.REFRESH_TOKEN_TTL || DEFAULT_REFRESH_TTL
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getAccessSecret());
}

function verifyRefreshToken(token) {
  return jwt.verify(token, getRefreshSecret());
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshExpiryDate() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

module.exports = {
  hashToken,
  refreshExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
