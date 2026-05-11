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
  // Constants
  VALID_STATUSES,
  VALID_ROLES,
  VALID_CATEGORIES,
  VALID_PRIORITIES,
  IMAGE_SIZE_LIMIT,
};
