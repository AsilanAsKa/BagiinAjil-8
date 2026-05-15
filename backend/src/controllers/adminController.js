const { User } = require('../models/User');

async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    return res.json({
      users: users.map((user) => user.toSafeObject())
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUsers
};
