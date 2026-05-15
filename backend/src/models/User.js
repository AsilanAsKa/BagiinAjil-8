const mongoose = require('mongoose');

const ROLES = ['donor', 'campaign_creator', 'admin'];

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    _id: false,
    timestamps: {
      createdAt: true,
      updatedAt: false
    }
  }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'donor'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    otp: {
      codeHash: {
        type: String,
        select: false
      },
      expiresAt: Date,
      attempts: {
        type: Number,
        default: 0
      },
      locked: {
        type: Boolean,
        default: false
      }
    },
    refreshTokens: {
      type: [refreshTokenSchema],
      default: [],
      select: false
    }
  },
  {
    timestamps: true
  }
);

userSchema.methods.toSafeObject = function toSafeObject() {
  const user = this.toObject();
  delete user.password;
  delete user.otp;
  delete user.refreshTokens;
  delete user.__v;
  return user;
};

module.exports = {
  User: mongoose.model('User', userSchema),
  ROLES
};
