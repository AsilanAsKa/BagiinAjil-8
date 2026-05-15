const phoneRegex = /^\+?[1-9]\d{7,14}$/;

function isValidPhone(phone) {
  return phoneRegex.test(String(phone || '').trim());
}

function normalizeIdentifier(identifier) {
  return String(identifier || '').trim().toLowerCase();
}

module.exports = {
  isValidPhone,
  normalizeIdentifier,
  phoneRegex
};
