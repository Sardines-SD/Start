// app.js — Testable business logic extracted from Server.js
// This file contains pure functions that can be unit tested
// without requiring Firebase or Express to be running

// ── Status and role constants ─────────────────────────────────────────────────
const VALID_STATUSES    = ['pending', 'in-progress', 'resolved'];
const VALID_ROLES       = ['user', 'worker', 'admin'];
const VALID_CATEGORIES  = ['Pothole', 'Water', 'Electricity', 'Waste', 'Other'];
const VALID_PRIORITIES  = ['low', 'medium', 'high'];
const IMAGE_SIZE_LIMIT  = 15 * 1024 * 1024;

// ── Sprint 1: Auth logic ──────────────────────────────────────────────────────
function validateLoginInput(email, password) {
  if (!email || !password) {
    return { valid: false, error: 'Email and password are required' };
  }
  if (typeof email !== 'string' || !email.includes('@')) {
    return { valid: false, error: 'Invalid email format' };
  }
  if (typeof password !== 'string' || password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  return { valid: true, error: null };
}

function validateRegistrationInput(email, password, confirmPassword) {
  const loginCheck = validateLoginInput(email, password);
  if (!loginCheck.valid) return loginCheck;
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' };
  }
  return { valid: true, error: null };
}

function getLoginErrorMessage(errorCode) {
  const messages = {
    'auth/user-not-found':     'No account found with this email address.',
    'auth/wrong-password':     'Incorrect password. Please try again.',
    'auth/invalid-email':      'Please enter a valid email address.',
    'auth/user-disabled':      'This account has been disabled.',
    'auth/too-many-requests':  'Too many failed attempts. Please try again later.',
    'auth/invalid-credential': 'Invalid email or password.',
  };
  return messages[errorCode] || 'Login failed. Please try again.';
}

function validateVerificationCode(code) {
  if (!code || typeof code !== 'string') return false;
  return /^\d{6}$/.test(code.trim());
}

// ── Sprint 2: Request validation ──────────────────────────────────────────────
function validateCreateRequest(body) {
  const { category, description, image } = body;
  if (!category || !description) {
    return { valid: false, error: 'Category and description are required' };
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return { valid: false, error: 'Invalid category' };
  }
  if (image && image.length > IMAGE_SIZE_LIMIT) {
    return { valid: false, error: 'Image too large. Please use an image under 10MB.' };
  }
  return { valid: true, error: null };
}

function validateStatusUpdate(status) {
  if (!VALID_STATUSES.includes(status)) {
    return { valid: false, error: 'Invalid status value' };
  }
  return { valid: true, error: null };
}

function validateRoleUpdate(role) {
  if (!VALID_ROLES.includes(role)) {
    return { valid: false, error: 'Invalid role value' };
  }
  return { valid: true, error: null };
}

function canUserDelete(reportUserId, requestingUid, role) {
  return reportUserId === requestingUid || role === 'admin';
}

function canUserUpdateStatus(role) {
  return role === 'admin' || role === 'worker';
}

function canUserSeeAllReports(role) {
  return role === 'admin' || role === 'worker';
}

function canAdminDeleteUser(requestingUid, targetUid, role) {
  if (role !== 'admin') return false;
  if (requestingUid === targetUid) return false;
  return true;
}

// ── Sprint 2: Filter logic ────────────────────────────────────────────────────
function applyRequestFilters(requests, status, search) {
  let result = [...requests];
  if (status) {
    result = result.filter(r => r.status === status);
  }
  if (search) {
    const kw = search.toLowerCase();
    result = result.filter(r =>
      (r.description || '').toLowerCase().includes(kw) ||
      (r.category    || '').toLowerCase().includes(kw)
    );
  }
  return result;
}

// ── Sprint 2: Email notification logic ────────────────────────────────────────
function shouldNotifyOnStatusChange(newStatus) {
  return ['in-progress', 'resolved'].includes(newStatus);
}

function buildStatusEmailSubject(status, category) {
  const labels = {
    'in-progress': 'is being worked on',
    'resolved':    'has been resolved',
  };
  return `[FixMyCity] Your ${category} report ${labels[status] || 'has been updated'}`;
}

// ── Sprint 3: Geolocation logic ───────────────────────────────────────────────
function validateCoordinates(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { valid: false, error: 'Coordinates must be numbers' };
  }
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }
  if (lng < -180 || lng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }
  return { valid: true, error: null };
}

function isCoordinateWithinSouthAfrica(lat, lng) {
  return lat >= -35 && lat <= -22 && lng >= 16 && lng <= 33;
}

function buildLocationData(lat, lng, wardInfo) {
  return {
    latitude:     lat,
    longitude:    lng,
    ward:         wardInfo?.ward         || null,
    wardNo:       wardInfo?.wardNo       || null,
    municipality: wardInfo?.municipality || null,
    province:     wardInfo?.province     || null,
  };
}

function formatWardDisplay(ward, municipality) {
  if (!ward && !municipality) return 'Location unknown';
  if (!ward)                  return municipality;
  if (!municipality)          return ward;
  return `${ward}, ${municipality}`;
}

// ── Sprint 3: Public dashboard logic ─────────────────────────────────────────
function sanitisePublicReport(report) {
  return {
    firestoreId:  report.firestoreId  || report.id,
    category:     report.category,
    status:       report.status,
    description:  (report.description || '').substring(0, 100),
    ward:         report.ward         || null,
    municipality: report.municipality || null,
    latitude:     report.latitude     || null,
    longitude:    report.longitude    || null,
    createdAt:    report.createdAt    || '',
  };
}

function isReportVisibleToPublic(report) {
  return ['pending', 'in-progress', 'resolved'].includes(report.status);
}

// ── Sprint 3: Analytics logic ─────────────────────────────────────────────────
function calculateAnalytics(requests) {
  const byCategory = {};
  const byStatus   = { pending: 0, 'in-progress': 0, resolved: 0 };

  requests.forEach(r => {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    if (byStatus[r.status] !== undefined) byStatus[r.status]++;
  });

  const workerPerformance = {};
  requests.filter(r => r.assignedTo).forEach(r => {
    if (!workerPerformance[r.assignedTo]) {
      workerPerformance[r.assignedTo] = { assigned: 0, resolved: 0 };
    }
    workerPerformance[r.assignedTo].assigned++;
    if (r.status === 'resolved') workerPerformance[r.assignedTo].resolved++;
  });

  const resolved   = requests.filter(r => r.status === 'resolved');
  const totalCount = requests.length;
  const resolutionRate = totalCount
    ? Math.round((resolved.length / totalCount) * 100)
    : 0;

  return {
    totalRequests: totalCount,
    byCategory,
    byStatus,
    workerPerformance,
    resolutionRate,
  };
}

// ── Sprint 3: Priority logic ──────────────────────────────────────────────────
function validatePriority(priority) {
  if (!VALID_PRIORITIES.includes(priority)) {
    return { valid: false, error: 'Priority must be low, medium, or high' };
  }
  return { valid: true, error: null };
}

function canSetPriority(role) {
  return role === 'admin';
}

function canAssignToWorker(role) {
  return role === 'admin';
}

function canClaimRequest(role) {
  return role === 'worker';
}

// ── Sprint 3: Feedback logic ──────────────────────────────────────────────────
function validateFeedback(rating, report, userId) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { valid: false, error: 'Rating must be between 1 and 5' };
  }
  if (report.userId !== userId) {
    return { valid: false, error: 'You can only rate your own reports' };
  }
  if (report.status !== 'resolved') {
    return { valid: false, error: 'Feedback can only be submitted for resolved reports' };
  }
  if (report.feedback) {
    return { valid: false, error: 'Feedback has already been submitted' };
  }
  return { valid: true, error: null };
}

// ── Sprint 3: CSV export logic ────────────────────────────────────────────────
function buildCSVRow(r) {
  return [
    r.id           || '',
    r.category     || '',
    `"${(r.description || '').replace(/"/g, '""')}"`,
    r.status       || '',
    r.priority     || 'none',
    r.ward         || '',
    r.municipality || '',
    r.userEmail    || '',
    r.createdAt    || '',
  ].join(',');
}

function buildFullCSV(requests) {
  const header = 'ID,Category,Description,Status,Priority,Ward,Municipality,Email,Created';
  const rows   = requests.map(buildCSVRow);
  return [header, ...rows].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 4: New Business Logic
// ═══════════════════════════════════════════════════════════════════════════════

// ── US1: Escalation ───────────────────────────────────────────────────────────

/**
 * Validates whether a resident can escalate a given request.
 * Rules: must own the request, must not already be escalated, must not be resolved.
 * @param {object} report - The Firestore request document
 * @param {string} userId - The UID of the requesting user
 * @returns {{ valid: boolean, error: string|null }}
 */
function canEscalateRequest(report, userId) {
  if (report.userId !== userId) {
    return { valid: false, error: 'You can only escalate your own requests' };
  }
  if (report.escalated) {
    return { valid: false, error: 'This request has already been escalated' };
  }
  if (report.status === 'resolved') {
    return { valid: false, error: 'Resolved requests cannot be escalated' };
  }
  return { valid: true, error: null };
}

/**
 * Validates the optional escalation reason field.
 * Reason is optional — undefined/null/empty string all pass.
 * When provided, must be a non-empty string ≤ 200 characters.
 * @param {string|undefined|null} reason
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateEscalationReason(reason) {
  if (reason === undefined || reason === null || reason === '') {
    return { valid: true, error: null }; // field is optional
  }
  if (typeof reason !== 'string') {
    return { valid: false, error: 'Escalation reason must be a string' };
  }
  if (reason.trim().length === 0) {
    return { valid: false, error: 'Escalation reason cannot be blank' };
  }
  if (reason.length > 200) {
    return { valid: false, error: 'Escalation reason must be 200 characters or fewer' };
  }
  return { valid: true, error: null };
}

/**
 * Builds the Firestore update payload for an escalation action.
 * @param {string|undefined} reason - Optional reason text
 * @returns {object} Fields to merge into the Firestore document
 */
function buildEscalationPayload(reason) {
  return {
    escalated:        true,
    escalatedAt:      Date.now(),
    escalationReason: reason || null,
  };
}

// ── US2: Public map marker colour ─────────────────────────────────────────────

/**
 * Returns the Leaflet marker colour string for a request.
 * Escalated requests always return 'red' regardless of status.
 * @param {string} status - 'pending' | 'in-progress' | 'resolved'
 * @param {boolean} escalated - Whether the request has been escalated
 * @returns {string} colour name
 */
function getMarkerColour(status, escalated = false) {
  if (escalated) return 'red';
  const map = {
    'pending':     'orange',
    'in-progress': 'blue',
    'resolved':    'green',
  };
  return map[status] ?? 'grey';
}

// ── US3: Unclaim (release) a request ─────────────────────────────────────────

/**
 * Returns true when the requesting worker is allowed to unclaim a request.
 * Only the worker who originally claimed it may release it.
 * @param {object} report - Firestore request document
 * @param {string} workerUid - UID of the worker attempting to unclaim
 * @returns {{ valid: boolean, error: string|null }}
 */
function canUnclaimRequest(report, workerUid) {
  if (!report.assignedTo || !report.claimedAt) {
    return { valid: false, error: 'This request has not been claimed' };
  }
  if (report.assignedTo !== workerUid) {
    return { valid: false, error: 'You can only release requests you have claimed' };
  }
  if (report.status === 'resolved') {
    return { valid: false, error: 'Resolved requests cannot be unclaimed' };
  }
  return { valid: true, error: null };
}

/**
 * Builds the Firestore update payload for an unclaim action.
 * Clears assignedTo, claimedAt and reverts status to pending.
 * @returns {object} Fields to merge into the Firestore document
 */
function buildUnclaimPayload() {
  return {
    assignedTo:  null,
    claimedAt:   null,
    status:      'pending',
    unclaimedAt: Date.now(),
  };
}

// ── US4: Duplicate detection ──────────────────────────────────────────────────

const DUPLICATE_RADIUS_KM     = 0.5;  // flag if within 500 m
const DUPLICATE_TIME_WINDOW_H = 24;   // within last 24 hours

/**
 * Calculates the Haversine distance in kilometres between two lat/lng points.
 * @param {number} lat1 @param {number} lng1
 * @param {number} lat2 @param {number} lng2
 * @returns {number} distance in km
 */
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const R    = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns true when two timestamps (ms) are within the given time window.
 * @param {number} tsA @param {number} tsB @param {number} windowHours
 */
function isWithinTimeWindow(tsA, tsB, windowHours = DUPLICATE_TIME_WINDOW_H) {
  return Math.abs(tsA - tsB) <= windowHours * 3_600_000;
}

/**
 * Finds potential duplicate reports for a new submission.
 * A duplicate candidate must match category, be within DUPLICATE_RADIUS_KM,
 * and have been submitted within DUPLICATE_TIME_WINDOW_H hours.
 *
 * @param {object} newReport     - { category, latitude, longitude, createdAtMs }
 * @param {object[]} existing    - Array of existing Firestore report objects
 * @returns {object[]} matching duplicates (may be empty)
 */
function findPotentialDuplicates(newReport, existing) {
  if (
    typeof newReport.latitude  !== 'number' ||
    typeof newReport.longitude !== 'number'
  ) return [];

  return existing.filter(r => {
    if (r.category !== newReport.category)             return false;
    if (typeof r.latitude  !== 'number')               return false;
    if (typeof r.longitude !== 'number')               return false;

    const dist = haversineDistanceKm(
      newReport.latitude, newReport.longitude,
      r.latitude,         r.longitude
    );
    if (dist > DUPLICATE_RADIUS_KM)                    return false;

    if (newReport.createdAtMs && r.createdAtMs) {
      if (!isWithinTimeWindow(newReport.createdAtMs, r.createdAtMs)) return false;
    }

    return true;
  });
}

// ── US5 (Bonus): Dark-mode preference helpers ─────────────────────────────────

/**
 * Returns true when a theme string is a supported theme value.
 * @param {string} theme
 */
function isValidTheme(theme) {
  return theme === 'light' || theme === 'dark';
}

/**
 * Toggles between 'light' and 'dark'.
 * @param {string} currentTheme
 * @returns {string}
 */
function toggleTheme(currentTheme) {
  return currentTheme === 'dark' ? 'light' : 'dark';
}

/**
 * Applies a CSS class to a document root element for theming.
 * Returns the class name that should be added/removed.
 * @param {string} theme
 * @returns {string} class name
 */
function getThemeClass(theme) {
  return theme === 'dark' ? 'dark-mode' : 'light-mode';
}


// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 4 US4 — Assign Due Dates to Requests
// ═══════════════════════════════════════════════════════════════════════════════

/** How many hours before a due date a worker reminder is sent. */
const DUE_DATE_REMINDER_HOURS = 24;

/**
 * Returns true when a due-date value is a valid future-or-present ISO 8601
 * date string or a positive Unix timestamp in milliseconds.
 * Admins can assign any date that is not already in the past relative to now.
 * @param {string|number} value  - ISO date string (YYYY-MM-DD) or ms timestamp
 * @param {number} [nowMs]       - Override for "now" (useful in tests)
 */
function isValidDueDate(value, nowMs = Date.now()) {
  if (value === null || value === undefined || value === '') return false;
  const ts = typeof value === 'number' ? value : Date.parse(value);
  if (isNaN(ts)) return false;
  // Must be a positive timestamp and not more than 2 years in the future
  if (ts <= 0) return false;
  const twoYearsMs = 2 * 365 * 24 * 3_600_000;
  if (ts > nowMs + twoYearsMs) return false;
  return true;
}

/**
 * Returns true when a request is overdue.
 * A request is overdue when:
 *   - it has a dueDate
 *   - that date is in the past
 *   - its status is NOT "resolved"
 * @param {object} report  - Firestore request document
 * @param {number} [nowMs] - Override for "now" (useful in tests)
 */
function isDueDateOverdue(report, nowMs = Date.now()) {
  if (!report.dueDate)             return false;
  if (report.status === 'resolved') return false;
  const ts = typeof report.dueDate === 'number'
    ? report.dueDate
    : Date.parse(report.dueDate);
  if (isNaN(ts)) return false;
  return ts < nowMs;
}

/**
 * Returns a status string describing the due-date state of a request.
 * Possible values: 'overdue' | 'approaching' | 'on-track' | 'resolved' | 'no-due-date'
 * @param {object} report
 * @param {number} [nowMs]
 */
function getDueDateStatus(report, nowMs = Date.now()) {
  if (!report.dueDate)              return 'no-due-date';
  if (report.status === 'resolved') return 'resolved';
  if (isDueDateOverdue(report, nowMs)) return 'overdue';
  if (isDueDateApproaching(report, nowMs)) return 'approaching';
  return 'on-track';
}

/**
 * Returns true when a due date is within the reminder window (DUE_DATE_REMINDER_HOURS)
 * but has not yet passed.
 * @param {object} report
 * @param {number} [nowMs]
 */
/*function isDueDateApproaching(report, nowMs = Date.now()) {
  if (!report.dueDate)              return false;
  if (report.status === 'resolved') return false;
  const ts = typeof report.dueDate === 'number'
    ? report.dueDate
    : Date.parse(report.dueDate);
  if (isNaN(ts)) return false;
  if (ts < nowMs) return false; // already overdue
  return (ts - nowMs) <= DUE_DATE_REMINDER_HOURS * 3_600_000;
}*/

/**
 * Returns true when the requesting user's role is allowed to set due dates.
 * Only admins may assign or update due dates.
 * @param {string} role
 * @returns {{ valid: boolean, error: string|null }}
 */
function canAssignDueDate(role) {
  if (role !== 'admin') {
    return { valid: false, error: 'Only admins can assign due dates' };
  }
  return { valid: true, error: null };
}

/**
 * Builds the Firestore update payload for a due-date assignment or update.
 * @param {string|number} dueDate  - ISO date string or ms timestamp
 * @param {string} assignedByUid   - UID of the admin setting the date
 * @returns {object} Firestore update fields
 */
function buildDueDatePayload(dueDate, assignedByUid) {
  const ts = typeof dueDate === 'number' ? dueDate : Date.parse(dueDate);
  return {
    dueDate:          ts,
    dueDateSetBy:     assignedByUid,
    dueDateUpdatedAt: Date.now(),
  };
}

/**
 * Returns a human-readable due-date string for display in dashboards.
 * - Overdue:     "Overdue by X days"
 * - Approaching: "Due in X hours"
 * - On-track:    "Due on DD MMM YYYY"
 * - No date:     "No due date"
 * @param {object} report
 * @param {number} [nowMs]
 */
/*function formatDueDateDisplay(report, nowMs = Date.now()) {
  if (!report.dueDate) return 'No due date';
  const ts = typeof report.dueDate === 'number'
    ? report.dueDate
    : Date.parse(report.dueDate);
  if (isNaN(ts)) return 'Invalid date';

  if (report.status === 'resolved') {
    return 'Resolved';
  }

  const diffMs   = ts - nowMs;
  const diffDays = Math.floor(Math.abs(diffMs) / 86_400_000);
  const diffHrs  = Math.floor(Math.abs(diffMs) / 3_600_000);

  if (diffMs < 0) {
    // Overdue
    return diffDays >= 1 ? `Overdue by ${diffDays} day${diffDays === 1 ? '' : 's'}` : 'Overdue';
  }
  if (diffMs <= DUE_DATE_REMINDER_HOURS * 3_600_000) {
    // Approaching
    return diffHrs >= 1 ? `Due in ${diffHrs} hour${diffHrs === 1 ? '' : 's'}` : 'Due very soon';
  }
  // On track — format as readable date
  const d = new Date(ts);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `Due ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}*/

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  // Sprint 1
  validateLoginInput,
  validateRegistrationInput,
  getLoginErrorMessage,
  validateVerificationCode,
  // Sprint 2
  validateCreateRequest,
  validateStatusUpdate,
  validateRoleUpdate,
  canUserDelete,
  canUserUpdateStatus,
  canUserSeeAllReports,
  canAdminDeleteUser,
  applyRequestFilters,
  shouldNotifyOnStatusChange,
  buildStatusEmailSubject,
  // Sprint 3
  validateCoordinates,
  isCoordinateWithinSouthAfrica,
  buildLocationData,
  formatWardDisplay,
  sanitisePublicReport,
  isReportVisibleToPublic,
  calculateAnalytics,
  validatePriority,
  canSetPriority,
  canAssignToWorker,
  canClaimRequest,
  validateFeedback,
  buildCSVRow,
  buildFullCSV,
  // Sprint 4
  canEscalateRequest,
  validateEscalationReason,
  buildEscalationPayload,
  getMarkerColour,
  canUnclaimRequest,
  buildUnclaimPayload,
  haversineDistanceKm,
  isWithinTimeWindow,
  findPotentialDuplicates,
  isValidTheme,
  toggleTheme,
  getThemeClass,
  // Sprint 4 US4 — Due Dates
  isValidDueDate,
  isDueDateOverdue,
  getDueDateStatus,
  isDueDateApproaching,
  canAssignDueDate,
  buildDueDatePayload,
  formatDueDateDisplay,
  DUE_DATE_REMINDER_HOURS,
  // Constants
  VALID_STATUSES,
  VALID_ROLES,
  VALID_CATEGORIES,
  VALID_PRIORITIES,
  IMAGE_SIZE_LIMIT,
  DUPLICATE_RADIUS_KM,
  DUPLICATE_TIME_WINDOW_H,
};
