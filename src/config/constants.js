module.exports = {
  // ── Exam subjects (JAMB uses these 4 groups) ───────────────────
  SUBJECT_GROUPS: {
    SCIENCES:     ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Agricultural Science', 'Further Mathematics'],
    ARTS:         ['Literature in English', 'Government', 'Christian Religious Studies', 'Islamic Studies', 'History', 'Fine Arts'],
    COMMERCIALS:  ['Accounting', 'Commerce', 'Economics', 'Business Studies', 'Office Practice'],
    SOCIAL_SCI:   ['Geography', 'Civic Education', 'French', 'Hausa', 'Igbo', 'Yoruba'],
    COMPULSORY:   ['Use of English'],
  },

  // Every candidate must sit Use of English + 3 others
  REQUIRED_SUBJECT_COUNT: 4,
  COMPULSORY_SUBJECT: 'Use of English',

  // ── Score ranges ───────────────────────────────────────────────
  MAX_SCORE_PER_SUBJECT: 100,
  TOTAL_SUBJECTS: 4,
  MAX_AGGREGATE_SCORE: 400,

  // Grade boundaries (JAMB style)
  GRADE_BOUNDARIES: [
    { min: 300, max: 400, grade: 'A',  remark: 'Excellent'  },
    { min: 250, max: 299, grade: 'B',  remark: 'Very Good'  },
    { min: 200, max: 249, grade: 'C',  remark: 'Good'       },
    { min: 160, max: 199, grade: 'D',  remark: 'Fair'       },
    { min: 140, max: 159, grade: 'E',  remark: 'Pass'       },
    { min: 0,   max: 139, grade: 'F',  remark: 'Fail'       },
  ],

  MINIMUM_PASS_SCORE: 140,

  // ── Registration number format ─────────────────────────────────
  // Format: YEAR + STATE_CODE (2 chars) + RANDOM_6_DIGITS
  // e.g.  2025LA2018456
  REG_NUMBER_PREFIX: process.env.EXAM_YEAR || '2026',

  // ── Nigerian states ────────────────────────────────────────────
  STATES: [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue',
    'Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu',
    'Federal Capital Territory','Gombe','Imo','Jigawa','Kaduna','Kano',
    'Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun',
    'Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara',
  ],

  STATE_CODES: {
    'Abia': 'AB', 'Adamawa': 'AD', 'Akwa Ibom': 'AK', 'Anambra': 'AN',
    'Bauchi': 'BA', 'Bayelsa': 'BY', 'Benue': 'BE', 'Borno': 'BO',
    'Cross River': 'CR', 'Delta': 'DE', 'Ebonyi': 'EB', 'Edo': 'ED',
    'Ekiti': 'EK', 'Enugu': 'EN', 'Federal Capital Territory': 'FC',
    'Gombe': 'GO', 'Imo': 'IM', 'Jigawa': 'JI', 'Kaduna': 'KD',
    'Kano': 'KN', 'Katsina': 'KT', 'Kebbi': 'KB', 'Kogi': 'KO',
    'Kwara': 'KW', 'Lagos': 'LA', 'Nasarawa': 'NA', 'Niger': 'NI',
    'Ogun': 'OG', 'Ondo': 'ON', 'Osun': 'OS', 'Oyo': 'OY',
    'Plateau': 'PL', 'Rivers': 'RI', 'Sokoto': 'SO', 'Taraba': 'TA',
    'Yobe': 'YO', 'Zamfara': 'ZA',
  },

  // ── Qualification types ────────────────────────────────────────
  O_LEVEL_QUALIFICATIONS: ['WAEC', 'NECO', 'NABTEB', 'GCE'],
  O_LEVEL_GRADES: ['A1','B2','B3','C4','C5','C6','D7','E8','F9'],

  // ── Exam types ────────────────────────────────────────────────
  EXAM_TYPES: {
    UTME: 'UTME',   // Unified Tertiary Matriculation Examination
    DE:   'DE',     // Direct Entry
    MOCK: 'MOCK',
  },

  // ── Registration statuses ──────────────────────────────────────
  REGISTRATION_STATUS: {
    INITIATED:  'initiated',
    INCOMPLETE: 'incomplete',
    COMPLETE:   'complete',
    VERIFIED:   'verified',
    SUSPENDED:  'suspended',
  },

  // ── Result statuses ───────────────────────────────────────────
  RESULT_STATUS: {
    PENDING:    'pending',
    PROCESSED:  'processed',
    WITHHELD:   'withheld',
    RELEASED:   'released',
    CANCELLED:  'cancelled',
  },

  // ── Roles ─────────────────────────────────────────────────────
  ROLES: {
    ADMIN:      'admin',
    SUPER_ADMIN:'super_admin',
    CANDIDATE:  'candidate',
    CENTER_ADMIN: 'center_admin',
  },

  // ── Pagination defaults ────────────────────────────────────────
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};
