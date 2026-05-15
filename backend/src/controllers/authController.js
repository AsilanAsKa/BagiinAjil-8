const bcrypt = require('bcrypt');
const { User } = require('../models/User');
const { createOtp, OTP_MAX_ATTEMPTS } = require('../utils/otp');
const {
  hashToken,
  refreshExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} = require('../utils/tokens');
const { normalizeIdentifier } = require('../utils/validation');

function shouldExposeOtp() {
  return process.env.NODE_ENV === 'test' || process.env.ENABLE_OTP_DEBUG === 'true';
}

function buildTokenResponse(user, refreshToken) {
  return {
    accessToken: signAccessToken(user),
    refreshToken
  };
}

async function issueRefreshToken(user) {
  const refreshToken = signRefreshToken(user);
  user.refreshTokens.push({
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiryDate()
  });
  await user.save();
  return refreshToken;
}

async function register(req, res, next) {
  try {
    const { name, phone, email, password, role = 'donor' } = req.body;
    const normalizedEmail = normalizeIdentifier(email);
    const normalizedPhone = String(phone).trim();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }]
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Email or phone already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = await createOtp();

    const user = await User.create({
      name,
      phone: normalizedPhone,
      email: normalizedEmail,
      password: passwordHash,
      role,
      otp: otp.data
    });

    const response = {
      message: 'Registration successful. Verify OTP to activate account.',
      user: user.toSafeObject()
    };

    if (shouldExposeOtp()) {
      response.devOtp = otp.code;
    }

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const identifier = normalizeIdentifier(req.body.identifier);
    const { otp } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }]
    }).select('+otp.codeHash');

    if (!user || !user.otp || !user.otp.codeHash) {
      return res.status(400).json({ message: 'OTP verification is not available' });
    }

    if (user.otp.locked || user.otp.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(423).json({ message: 'OTP is locked after 3 failed attempts' });
    }

    if (!user.otp.expiresAt || user.otp.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    const isMatch = await bcrypt.compare(otp, user.otp.codeHash);

    if (!isMatch) {
      user.otp.attempts += 1;
      if (user.otp.attempts >= OTP_MAX_ATTEMPTS) {
        user.otp.locked = true;
        await user.save();
        return res.status(423).json({ message: 'OTP is locked after 3 failed attempts' });
      }

      await user.save();
      return res.status(400).json({
        message: 'Invalid OTP',
        attemptsRemaining: OTP_MAX_ATTEMPTS - user.otp.attempts
      });
    }

    user.isVerified = true;
    user.otp = undefined;
    await user.save();

    return res.json({
      message: 'OTP verified successfully',
      user: user.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const identifier = normalizeIdentifier(req.body.identifier);
    const { password } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }]
    }).select('+password +refreshTokens');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Verify OTP before login' });
    }

    const refreshToken = await issueRefreshToken(user);

    return res.json({
      message: 'Login successful',
      ...buildTokenResponse(user, refreshToken),
      user: user.toSafeObject()
    });
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const payload = verifyRefreshToken(refreshToken);

    if (payload.tokenType !== 'refresh') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(payload.sub).select('+refreshTokens');

    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const presentedHash = hashToken(refreshToken);
    const existingToken = user.refreshTokens.find(
      (token) => token.tokenHash === presentedHash && token.expiresAt.getTime() > Date.now()
    );

    if (!existingToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    user.refreshTokens = user.refreshTokens.filter((token) => token.tokenHash !== presentedHash);
    const newRefreshToken = signRefreshToken(user);
    user.refreshTokens.push({
      tokenHash: hashToken(newRefreshToken),
      expiresAt: refreshExpiryDate()
    });
    await user.save();

    return res.json({
      message: 'Token refreshed',
      ...buildTokenResponse(user, newRefreshToken)
    });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const tokenHash = hashToken(refreshToken);
    await User.updateOne(
      { 'refreshTokens.tokenHash': tokenHash },
      { $pull: { refreshTokens: { tokenHash } } }
    );

    return res.json({ message: 'Logout successful' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  logout,
  refresh,
  register,
  verifyOtp
};
