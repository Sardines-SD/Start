function isValidCategory(category) {
  const valid = ['Pothole', 'Water', 'Electricity', 'Waste', 'Other'];
  return valid.includes(category);
}

function isValidStatus(status) {
  const valid = ['pending', 'in-progress', 'resolved'];
  return valid.includes(status);
}

function isValidReport(report) {
  return Boolean(report.category && report.description);
}

function canDelete(reportUserId, requestingUid, role) {
  return reportUserId === requestingUid || role === 'admin';
}

function canUpdateStatus(role) {
  return role === 'admin' || role === 'worker';
}

function canSeeAllReports(role) {
  return role === 'admin' || role === 'worker';
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

function passwordsMatch(password, confirm) {
  return password === confirm;
}

function isValidImageSize(sizeInBytes) {
  const limit = 15 * 1024 * 1024;
  return sizeInBytes < limit;
}

function isValidImageType(mimeType) {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(mimeType);
}

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

module.exports = {
  isValidCategory,
  isValidStatus,
  isValidReport,
  canDelete,
  canUpdateStatus,
  canSeeAllReports,
  isValidPassword,
  passwordsMatch,
  isValidImageSize,
  isValidImageType,
  escapeHtml,
  getStatusClass,
  filterByStatus,
  filterByKeyword,
};