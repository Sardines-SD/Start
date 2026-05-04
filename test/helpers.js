// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 2 HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

// ── US1: Create Report ────────────────────────────────────────────────────────
function isValidCategory(category) {
  const valid = ['Pothole', 'Water', 'Electricity', 'Waste', 'Other'];
  return valid.includes(category);
}

function isValidReport(report) {
  return Boolean(report.category && report.description);
}

// ── US2: Delete Report ────────────────────────────────────────────────────────
function canDelete(reportUserId, requestingUid, role) {
  return reportUserId === requestingUid || role === 'admin';
}

// ── US3: Filter and Search ────────────────────────────────────────────────────
function filterByStatus(reports, status) {
  if (!status) return reports;
  return reports.filter(r => r.status === status);
}

function filterByKeyword(reports, keyword) {
  if (!keyword) return reports;
  const kw = keyword.toLowerCase();
  return reports.filter(r =>
    (r.description || '').toLowerCase().includes(kw) ||
    (r.category    || '').toLowerCase().includes(kw)
  );
}

function filterByCategory(reports, category) {
  if (!category) return reports;
  return reports.filter(r => r.category === category);
}

// ── US4: Update Report Status ─────────────────────────────────────────────────
function isValidStatus(status) {
  const valid = ['pending', 'in-progress', 'resolved'];
  return valid.includes(status);
}

function canUpdateStatus(role) {
  return role === 'admin' || role === 'worker';
}

// ── US5: View All Reports ─────────────────────────────────────────────────────
function canSeeAllReports(role) {
  return role === 'admin' || role === 'worker';
}

// ── US7: Password / Auth ──────────────────────────────────────────────────────
function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

function passwordsMatch(password, confirm) {
  return password === confirm;
}

// ── US8: Image Upload ─────────────────────────────────────────────────────────
function isValidImageSize(sizeInBytes) {
  const limit = 15 * 1024 * 1024;
  return sizeInBytes < limit;
}

function isValidImageType(mimeType) {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(mimeType);
}

// ── Security Helpers ──────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

function getStatusClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'pending')                            return 'pending';
  if (s === 'in progress' || s === 'in-progress') return 'progress';
  if (s === 'resolved'    || s === 'completed')   return 'resolved';
  return 'pending';
}

// ── Geolocation / Ward Detection ──────────────────────────────────────────────
function isValidCoordinates(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat  >= -90  && lat  <= 90  &&
    lng  >= -180 && lng  <= 180
  );
}

function isWithinSouthAfrica(lat, lng) {
  return (
    lat >= -35 && lat <= -22 &&
    lng >=  16 && lng <=  33
  );
}

function buildReportWithLocation(report, lat, lng, ward, municipality) {
  return {
    ...report,
    latitude:     lat,
    longitude:    lng,
    ward:         ward         || null,
    municipality: municipality || null,
    hasLocation:  isValidCoordinates(lat, lng),
  };
}

function formatWardLabel(ward, municipality) {
  if (!ward && !municipality) return 'Unknown location';
  if (!ward)                  return municipality;
  if (!municipality)          return ward;
  return `${ward}, ${municipality}`;
}

function isValidWard(ward) {
  return typeof ward === 'string' && ward.trim().length > 0;
}

function isValidMunicipality(municipality) {
  return typeof municipality === 'string' && municipality.trim().length > 0;
}

function reportHasGeolocation(report) {
  return (
    report.latitude  !== null &&
    report.latitude  !== undefined &&
    report.longitude !== null &&
    report.longitude !== undefined
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 3 HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

// ── US1: Public Dashboard ─────────────────────────────────────────────────────
function isPublicReport(report) {
  return ['pending', 'in-progress', 'resolved'].includes(report.status);
}

function stripSensitiveFields(report) {
  const { userEmail, userId, ...publicData } = report;
  return publicData;
}

// ── US2: Analytics ────────────────────────────────────────────────────────────
function calcVolumeByCategory(reports) {
  const result = {};
  reports.forEach(r => {
    result[r.category] = (result[r.category] || 0) + 1;
  });
  return result;
}

function calcVolumeByStatus(reports) {
  const result = { pending: 0, 'in-progress': 0, resolved: 0 };
  reports.forEach(r => {
    if (result[r.status] !== undefined) result[r.status]++;
  });
  return result;
}

function calcWorkerPerformance(reports) {
  const result = {};
  reports.filter(r => r.assignedTo).forEach(r => {
    if (!result[r.assignedTo]) {
      result[r.assignedTo] = { assigned: 0, resolved: 0 };
    }
    result[r.assignedTo].assigned++;
    if (r.status === 'resolved') result[r.assignedTo].resolved++;
  });
  return result;
}

function calcResolutionRate(reports) {
  if (!reports.length) return 0;
  const resolved = reports.filter(r => r.status === 'resolved').length;
  return Math.round((resolved / reports.length) * 100);
}

// ── US3: Assign Request ───────────────────────────────────────────────────────
function canAssignRequest(role) {
  return role === 'admin';
}

// ── US4: Worker Claim ─────────────────────────────────────────────────────────
function canClaimRequest(role) {
  return role === 'worker' || role === 'admin';
}

// ── US5: Satisfaction Feedback ────────────────────────────────────────────────
function isValidRating(rating) {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

function feedbackAlreadySubmitted(report) {
  return Boolean(report.feedback);
}

function canSubmitFeedback(report, userId) {
  return (
    report.status === 'resolved' &&
    report.userId === userId     &&
    !report.feedback
  );
}

function formatFeedback(rating, comment) {
  return {
    rating:    rating,
    comment:   comment || '',
    submitted: true,
  };
}

// ── US6: Priority Levels (Mid-Sprint) ─────────────────────────────────────────
function isValidPriority(priority) {
  const valid = ['low', 'medium', 'high'];
  return valid.includes(priority);
}

function getPriorityScore(priority) {
  const scores = { high: 3, medium: 2, low: 1 };
  return scores[priority] || 0;
}

function sortByPriority(reports) {
  const order = { high: 3, medium: 2, low: 1 };
  return [...reports].sort((a, b) =>
    (order[b.priority] || 0) - (order[a.priority] || 0)
  );
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function generateCSVRow(report) {
  return [
    report.id           || '',
    report.category     || '',
    `"${(report.description || '').replace(/"/g, '""')}"`,
    report.status       || '',
    report.priority     || 'none',
    report.ward         || '',
    report.municipality || '',
  ].join(',');
}

function generateCSVHeader() {
  return 'ID,Category,Description,Status,Priority,Ward,Municipality';
}

function generateFullCSV(reports) {
  const rows = reports.map(generateCSVRow);
  return [generateCSVHeader(), ...rows].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  // Sprint 2
  isValidCategory,
  isValidReport,
  canDelete,
  filterByStatus,
  filterByKeyword,
  filterByCategory,
  isValidStatus,
  canUpdateStatus,
  canSeeAllReports,
  isValidPassword,
  passwordsMatch,
  isValidImageSize,
  isValidImageType,
  escapeHtml,
  getStatusClass,
  // Geolocation
  isValidCoordinates,
  isWithinSouthAfrica,
  buildReportWithLocation,
  formatWardLabel,
  isValidWard,
  isValidMunicipality,
  reportHasGeolocation,
  // Sprint 3
  isPublicReport,
  stripSensitiveFields,
  calcVolumeByCategory,
  calcVolumeByStatus,
  calcWorkerPerformance,
  calcResolutionRate,
  canAssignRequest,
  canClaimRequest,
  isValidRating,
  feedbackAlreadySubmitted,
  canSubmitFeedback,
  formatFeedback,
  isValidPriority,
  getPriorityScore,
  sortByPriority,
  generateCSVRow,
  generateCSVHeader,
  generateFullCSV,
};