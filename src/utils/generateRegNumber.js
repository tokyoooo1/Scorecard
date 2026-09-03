const { STATE_CODES, REG_NUMBER_PREFIX } = require('../config/constants');
const Candidate = require('../models/Candidate.model');

/**
 * Generates a unique JAMB-style registration number.
 * Format: YEAR + STATE_CODE (2) + GENDER_CHAR (1) + RANDOM_6_DIGITS
 * Example: 2025LA M123456  →  2025LAM123456
 */
const generateRegNumber = async (state, gender) => {
  const year      = REG_NUMBER_PREFIX; //2026
  const stateCode = STATE_CODES[state] || 'FC';  //LA
  const genderChar= gender === 'Female' ? 'F' : 'M'; //F

  let regNumber;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const random = Math.floor(100000 + Math.random() * 900000); // 6-digit //550000
    regNumber    = `${year}${stateCode}${genderChar}${random}`; //2026LAF550000
    const exists = await Candidate.findOne({ registrationNumber: regNumber });
    if (!exists) isUnique = true;
    attempts++;
  }

  if (!isUnique) throw new Error('Failed to generate unique registration number');
  return regNumber;
};

/**
 * Generate a profile code (used for result checking access).
 * Format: JAM + YEAR_2DIGIT + RANDOM_8_ALPHANUM
 */
const generateProfileCode = async () => {
  const year = String(new Date().getFullYear()).slice(-2);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars

  let code;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const rand = Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    code = `JAM${year}${rand}`;
    const exists = await Candidate.findOne({ profileCode: code });
    if (!exists) isUnique = true;
    attempts++;
  }

  if (!isUnique) throw new Error('Failed to generate unique profile code');
  return code;
};

/**
 * Generate a result checking token serial + PIN pair.
 * Serial: JAMRESULT + YEAR + RANDOM_8
 * PIN:    RANDOM_10_DIGITS
 */
const generateResultToken = () => {
  const year = String(new Date().getFullYear()).slice(-2);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand  = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  const serial = `JRS${year}${rand}`;
  const pin    = String(Math.floor(1000000000 + Math.random() * 9000000000)); // 10-digit
  return { serial, pin };
};

module.exports = { generateRegNumber, generateProfileCode, generateResultToken };
