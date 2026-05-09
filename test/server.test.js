const {
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
} = require('../app');

const {
  // Sprint 1
  isValidEmail,
  isValidLoginCredentials,
  isResidentRole,
  isStaffRole,
  //getLoginErrorMessage,
  isKnownErrorCode,
  isValidRegistration,
  isValidVerificationCode,
  isValidRole,
  // Sprint 2
  isValidCategory,
  isValidReport,
  canDeleteAccount,
  adminCannotDeleteSelf,
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
  shouldSendEmailNotification,
  getEmailSubject,
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
  //canClaimRequest,
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
} = require('./helpers');

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 1 TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 1 — Login and Registration Tests', () => {

  // ── US1: Resident Login ────────────────────────────────────────────────
  test('valid email format is accepted', () => {
    expect(isValidEmail('resident@gmail.com')).toBe(true);
    expect(isValidEmail('user@municipality.co.za')).toBe(true);
  });

  test('invalid email format is rejected', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('missing@')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  test('null email is rejected', () => {
    expect(isValidEmail(null)).toBe(false);
  });

  test('valid login credentials accepted', () => {
    expect(isValidLoginCredentials('user@test.com', 'password123')).toBe(true);
  });

  test('invalid email in login credentials rejected', () => {
    expect(isValidLoginCredentials('notvalid', 'password123')).toBe(false);
  });

  test('short password in login credentials rejected', () => {
    expect(isValidLoginCredentials('user@test.com', '123')).toBe(false);
  });

  test('resident role is identified correctly', () => {
    expect(isResidentRole('user')).toBe(true);
    expect(isResidentRole('admin')).toBe(false);
    expect(isResidentRole('worker')).toBe(false);
  });

  // ── US2: Municipal Staff Login ─────────────────────────────────────────
  test('admin is identified as staff', () => {
    expect(isStaffRole('admin')).toBe(true);
  });

  test('worker is identified as staff', () => {
    expect(isStaffRole('worker')).toBe(true);
  });

  test('regular user is not identified as staff', () => {
    expect(isStaffRole('user')).toBe(false);
  });

  // ── US3: Login Error Handling ──────────────────────────────────────────
  test('user not found error returns correct message', () => {
    const msg = getLoginErrorMessage('auth/user-not-found');
    expect(msg).toBe('No account found with this email address.');
  });

  test('wrong password error returns correct message', () => {
    const msg = getLoginErrorMessage('auth/wrong-password');
    expect(msg).toBe('Incorrect password. Please try again.');
  });

  test('invalid email error returns correct message', () => {
    const msg = getLoginErrorMessage('auth/invalid-email');
    expect(msg).toBe('Please enter a valid email address.');
  });

  test('too many requests error returns correct message', () => {
    const msg = getLoginErrorMessage('auth/too-many-requests');
    expect(msg).toBe('Too many failed attempts. Please try again later.');
  });

  test('disabled account error returns correct message', () => {
    const msg = getLoginErrorMessage('auth/user-disabled');
    expect(msg).toBe('This account has been disabled.');
  });

  test('unknown error code returns fallback message', () => {
    const msg = getLoginErrorMessage('auth/some-unknown-error');
    expect(msg).toBe('Login failed. Please try again.');
  });

  test('known error codes are identified correctly', () => {
    expect(isKnownErrorCode('auth/user-not-found')).toBe(true);
    expect(isKnownErrorCode('auth/wrong-password')).toBe(true);
    expect(isKnownErrorCode('auth/invalid-credential')).toBe(true);
  });

  test('unknown error codes are identified correctly', () => {
    expect(isKnownErrorCode('auth/random-error')).toBe(false);
    expect(isKnownErrorCode('')).toBe(false);
  });

  // ── US4: Community Member Registration ────────────────────────────────
  test('valid registration is accepted', () => {
    expect(isValidRegistration('user@test.com', 'password123', 'password123')).toBe(true);
  });

  test('registration with invalid email is rejected', () => {
    expect(isValidRegistration('notvalid', 'password123', 'password123')).toBe(false);
  });

  test('registration with short password is rejected', () => {
    expect(isValidRegistration('user@test.com', '123', '123')).toBe(false);
  });

  test('registration with mismatched passwords is rejected', () => {
    expect(isValidRegistration('user@test.com', 'password123', 'different123')).toBe(false);
  });

  test('valid 6-digit verification code is accepted', () => {
    expect(isValidVerificationCode('123456')).toBe(true);
    expect(isValidVerificationCode('000000')).toBe(true);
  });

  test('verification code with letters is rejected', () => {
    expect(isValidVerificationCode('abc123')).toBe(false);
  });

  test('verification code shorter than 6 digits is rejected', () => {
    expect(isValidVerificationCode('1234')).toBe(false);
  });

  test('verification code longer than 6 digits is rejected', () => {
    expect(isValidVerificationCode('1234567')).toBe(false);
  });

  test('empty verification code is rejected', () => {
    expect(isValidVerificationCode('')).toBe(false);
  });

  test('valid roles are accepted', () => {
    expect(isValidRole('user')).toBe(true);
    expect(isValidRole('worker')).toBe(true);
    expect(isValidRole('admin')).toBe(true);
  });

  test('invalid role is rejected', () => {
    expect(isValidRole('superadmin')).toBe(false);
    expect(isValidRole('')).toBe(false);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 2 TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 2 — Municipal Service Portal Tests', () => {

  // ── US1: Create Report ─────────────────────────────────────────────────
  test('report object has all required fields', () => {
    const report = {
      userId:      'user123',
      userEmail:   'resident@test.com',
      category:    'Pothole',
      description: 'Large pothole on Main Street',
      status:      'pending',
    };
    expect(report).toHaveProperty('userId');
    expect(report).toHaveProperty('category');
    expect(report).toHaveProperty('description');
    expect(report).toHaveProperty('status');
    expect(report.status).toBe('pending');
  });

  test('report without category is invalid', () => {
    expect(isValidReport({ description: 'test' })).toBe(false);
  });

  test('report without description is invalid', () => {
    expect(isValidReport({ category: 'Water' })).toBe(false);
  });

  test('report with both fields is valid', () => {
    expect(isValidReport({ category: 'Water', description: 'Burst pipe' })).toBe(true);
  });

  test('valid categories are accepted', () => {
    expect(isValidCategory('Pothole')).toBe(true);
    expect(isValidCategory('Water')).toBe(true);
    expect(isValidCategory('Electricity')).toBe(true);
    expect(isValidCategory('Waste')).toBe(true);
    expect(isValidCategory('Other')).toBe(true);
  });

  test('invalid category is rejected', () => {
    expect(isValidCategory('Aliens')).toBe(false);
    expect(isValidCategory('')).toBe(false);
  });

  // ── US2: Delete Account ────────────────────────────────────────────────
  test('admin can delete another users account', () => {
    expect(canDeleteAccount('admin_uid', 'user_uid', 'admin')).toBe(true);
  });

  test('user can delete their own account', () => {
    expect(canDeleteAccount('user_uid', 'user_uid', 'user')).toBe(true);
  });

  test('user cannot delete another users account', () => {
    expect(canDeleteAccount('user_A', 'user_B', 'user')).toBe(false);
  });

  test('admin cannot delete their own account via admin endpoint', () => {
    expect(adminCannotDeleteSelf('admin_uid', 'admin_uid')).toBe(true);
  });

  test('admin deleting another user is not self-deletion', () => {
    expect(adminCannotDeleteSelf('admin_uid', 'worker_uid')).toBe(false);
  });

  // ── US3: Delete Report ─────────────────────────────────────────────────
  test('report owner can delete their own report', () => {
    expect(canDelete('user_A', 'user_A', 'user')).toBe(true);
  });

  test('non-owner cannot delete another users report', () => {
    expect(canDelete('user_A', 'user_B', 'user')).toBe(false);
  });

  test('admin can delete any report', () => {
    expect(canDelete('user_A', 'user_B', 'admin')).toBe(true);
  });

  test('delete fails if report does not exist', () => {
    const findReport = (id, reports) => reports.find(r => r.id === id) || null;
    const reports    = [{ id: '123', userId: 'user_A' }];
    expect(findReport('999', reports)).toBeNull();
  });

  // ── US4: Filter and Search ─────────────────────────────────────────────
  const SAMPLE_REPORTS = [
    { id: 1, category: 'Pothole', description: 'Big pothole on Main St', status: 'pending'     },
    { id: 2, category: 'Water',   description: 'Burst pipe near school', status: 'in-progress' },
    { id: 3, category: 'Waste',   description: 'Overflowing bin',        status: 'resolved'    },
  ];

  test('filter by status returns only matching reports', () => {
    expect(filterByStatus(SAMPLE_REPORTS, 'pending').length).toBe(1);
    expect(filterByStatus(SAMPLE_REPORTS, 'pending')[0].category).toBe('Pothole');
  });

  test('filter by in-progress returns correct report', () => {
    expect(filterByStatus(SAMPLE_REPORTS, 'in-progress').length).toBe(1);
    expect(filterByStatus(SAMPLE_REPORTS, 'in-progress')[0].category).toBe('Water');
  });

  test('empty status filter returns all reports', () => {
    expect(filterByStatus(SAMPLE_REPORTS, '').length).toBe(3);
  });

  test('search by keyword matches description', () => {
    expect(filterByKeyword(SAMPLE_REPORTS, 'pipe').length).toBe(1);
    expect(filterByKeyword(SAMPLE_REPORTS, 'pipe')[0].id).toBe(2);
  });

  test('search by keyword matches category', () => {
    expect(filterByKeyword(SAMPLE_REPORTS, 'waste').length).toBe(1);
  });

  test('search with no match returns empty array', () => {
    expect(filterByKeyword(SAMPLE_REPORTS, 'earthquake').length).toBe(0);
  });

  test('empty keyword returns all reports', () => {
    expect(filterByKeyword(SAMPLE_REPORTS, '').length).toBe(3);
  });

  test('filter by category returns correct reports', () => {
    expect(filterByCategory(SAMPLE_REPORTS, 'Water').length).toBe(1);
    expect(filterByCategory(SAMPLE_REPORTS, 'Water')[0].id).toBe(2);
  });

  test('empty category filter returns all reports', () => {
    expect(filterByCategory(SAMPLE_REPORTS, '').length).toBe(3);
  });

  // ── US5: Update Report Status ──────────────────────────────────────────
  test('valid statuses are accepted', () => {
    expect(isValidStatus('pending')).toBe(true);
    expect(isValidStatus('in-progress')).toBe(true);
    expect(isValidStatus('resolved')).toBe(true);
  });

  test('invalid status is rejected', () => {
    expect(isValidStatus('done')).toBe(false);
    expect(isValidStatus('')).toBe(false);
  });

  test('admin and worker can update report status', () => {
    expect(canUpdateStatus('admin')).toBe(true);
    expect(canUpdateStatus('worker')).toBe(true);
  });

  test('regular user cannot update report status', () => {
    expect(canUpdateStatus('user')).toBe(false);
  });

  test('admin and worker can see all reports', () => {
    expect(canSeeAllReports('admin')).toBe(true);
    expect(canSeeAllReports('worker')).toBe(true);
  });

  test('regular user cannot see all reports', () => {
    expect(canSeeAllReports('user')).toBe(false);
  });

  // ── US6: Email Notification ────────────────────────────────────────────
  test('email is sent when status changes to in-progress', () => {
    expect(shouldSendEmailNotification('in-progress')).toBe(true);
  });

  test('email is sent when status changes to resolved', () => {
    expect(shouldSendEmailNotification('resolved')).toBe(true);
  });

  test('email is not sent when status is pending', () => {
    expect(shouldSendEmailNotification('pending')).toBe(false);
  });

  test('email subject includes category name', () => {
    const subject = getEmailSubject('resolved', 'Pothole');
    expect(subject).toContain('Pothole');
    expect(subject).toContain('resolved');
  });

  test('email subject for in-progress includes correct label', () => {
    const subject = getEmailSubject('in-progress', 'Water');
    expect(subject).toContain('Water');
  });

  // ── US7: Password Validation ───────────────────────────────────────────
  test('password shorter than 6 chars is invalid', () => {
    expect(isValidPassword('123')).toBe(false);
  });

  test('password of 6 or more chars is valid', () => {
    expect(isValidPassword('securepass')).toBe(true);
  });

  test('empty password is invalid', () => {
    expect(isValidPassword('')).toBe(false);
  });

  test('matching passwords confirm correctly', () => {
    expect(passwordsMatch('mypassword', 'mypassword')).toBe(true);
  });

  test('mismatched passwords fail confirmation', () => {
    expect(passwordsMatch('mypassword', 'wrongpass')).toBe(false);
  });

  // ── US8: Image Upload ──────────────────────────────────────────────────
  test('image under size limit is accepted', () => {
    expect(isValidImageSize(1_000_000)).toBe(true);
  });

  test('image over size limit is rejected', () => {
    expect(isValidImageSize(20_000_000)).toBe(false);
  });

  test('valid image types are accepted', () => {
    expect(isValidImageType('image/jpeg')).toBe(true);
    expect(isValidImageType('image/png')).toBe(true);
    expect(isValidImageType('image/gif')).toBe(true);
    expect(isValidImageType('image/webp')).toBe(true);
  });

  test('invalid file type is rejected', () => {
    expect(isValidImageType('application/pdf')).toBe(false);
    expect(isValidImageType('text/plain')).toBe(false);
  });

  // ── Security: XSS Escaping ─────────────────────────────────────────────
  test('escapeHtml prevents XSS script injection', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('escapeHtml converts ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  test('escapeHtml converts quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  test('escapeHtml handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  test('escapeHtml handles null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  test('getStatusClass returns pending for pending', () => {
    expect(getStatusClass('pending')).toBe('pending');
  });

  test('getStatusClass returns progress for in-progress', () => {
    expect(getStatusClass('in-progress')).toBe('progress');
    expect(getStatusClass('in progress')).toBe('progress');
  });

  test('getStatusClass returns resolved for resolved', () => {
    expect(getStatusClass('resolved')).toBe('resolved');
    expect(getStatusClass('completed')).toBe('resolved');
  });

  test('getStatusClass returns pending for unknown status', () => {
    expect(getStatusClass('')).toBe('pending');
    expect(getStatusClass(null)).toBe('pending');
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 3 TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 3 — Geolocation and Ward Detection Tests', () => {

  // ── US1: Geolocated Service Request ───────────────────────────────────
  test('valid coordinates are accepted', () => {
    expect(isValidCoordinates(-26.2041, 28.0473)).toBe(true);
  });

  test('invalid latitude above 90 is rejected', () => {
    expect(isValidCoordinates(91, 28.0473)).toBe(false);
  });

  test('invalid latitude below -90 is rejected', () => {
    expect(isValidCoordinates(-91, 28.0473)).toBe(false);
  });

  test('invalid longitude above 180 is rejected', () => {
    expect(isValidCoordinates(-26.2041, 181)).toBe(false);
  });

  test('invalid longitude below -180 is rejected', () => {
    expect(isValidCoordinates(-26.2041, -181)).toBe(false);
  });

  test('non-numeric coordinates are rejected', () => {
    expect(isValidCoordinates('abc', 28)).toBe(false);
    expect(isValidCoordinates(-26, 'xyz')).toBe(false);
  });

  test('null coordinates are rejected', () => {
    expect(isValidCoordinates(null, null)).toBe(false);
  });

  test('Johannesburg coordinates are within South Africa', () => {
    expect(isWithinSouthAfrica(-26.2041, 28.0473)).toBe(true);
  });

  test('Cape Town coordinates are within South Africa', () => {
    expect(isWithinSouthAfrica(-33.9249, 18.4241)).toBe(true);
  });

  test('Durban coordinates are within South Africa', () => {
    expect(isWithinSouthAfrica(-29.8587, 31.0218)).toBe(true);
  });

  test('London coordinates are outside South Africa', () => {
    expect(isWithinSouthAfrica(51.5074, -0.1278)).toBe(false);
  });

  test('New York coordinates are outside South Africa', () => {
    expect(isWithinSouthAfrica(40.7128, -74.0060)).toBe(false);
  });

  test('buildReportWithLocation attaches coordinates to report', () => {
    const result = buildReportWithLocation(
      { category: 'Pothole', description: 'Big hole' },
      -26.2041, 28.0473, 'Ward 5', 'City of Joburg'
    );
    expect(result.latitude).toBe(-26.2041);
    expect(result.longitude).toBe(28.0473);
    expect(result.ward).toBe('Ward 5');
    expect(result.municipality).toBe('City of Joburg');
    expect(result.hasLocation).toBe(true);
  });

  test('buildReportWithLocation with null ward still works', () => {
    const result = buildReportWithLocation(
      { category: 'Water', description: 'Pipe burst' },
      -26.2041, 28.0473, null, null
    );
    expect(result.ward).toBeNull();
    expect(result.municipality).toBeNull();
    expect(result.hasLocation).toBe(true);
  });

  test('buildReportWithLocation preserves original report fields', () => {
    const result = buildReportWithLocation(
      { category: 'Pothole', description: 'Crack', userId: 'user1' },
      -26.2041, 28.0473, 'Ward 1', 'CoJ'
    );
    expect(result.category).toBe('Pothole');
    expect(result.userId).toBe('user1');
  });

  test('valid ward string is accepted', () => {
    expect(isValidWard('Ward 5')).toBe(true);
    expect(isValidWard('Ward 12')).toBe(true);
  });

  test('empty ward string is rejected', () => {
    expect(isValidWard('')).toBe(false);
  });

  test('valid municipality is accepted', () => {
    expect(isValidMunicipality('City of Johannesburg')).toBe(true);
  });

  test('empty municipality is rejected', () => {
    expect(isValidMunicipality('')).toBe(false);
  });

  test('formatWardLabel with both ward and municipality', () => {
    expect(formatWardLabel('Ward 5', 'City of Joburg')).toBe('Ward 5, City of Joburg');
  });

  test('formatWardLabel with only ward', () => {
    expect(formatWardLabel('Ward 5', null)).toBe('Ward 5');
  });

  test('formatWardLabel with only municipality', () => {
    expect(formatWardLabel(null, 'City of Joburg')).toBe('City of Joburg');
  });

  test('formatWardLabel with neither returns unknown', () => {
    expect(formatWardLabel(null, null)).toBe('Unknown location');
  });

  test('report with coordinates has geolocation', () => {
    expect(reportHasGeolocation({ latitude: -26.2041, longitude: 28.0473 })).toBe(true);
  });

  test('report without coordinates has no geolocation', () => {
    expect(reportHasGeolocation({ category: 'Pothole' })).toBe(false);
  });

  test('report with null coordinates has no geolocation', () => {
    expect(reportHasGeolocation({ latitude: null, longitude: null })).toBe(false);
  });

});

describe('Sprint 3 — Feature Tests', () => {

  // ── US2: Public Dashboard ──────────────────────────────────────────────
  test('pending report is shown on public dashboard', () => {
    expect(isPublicReport({ status: 'pending' })).toBe(true);
  });

  test('in-progress report is shown on public dashboard', () => {
    expect(isPublicReport({ status: 'in-progress' })).toBe(true);
  });

  test('resolved report is shown on public dashboard', () => {
    expect(isPublicReport({ status: 'resolved' })).toBe(true);
  });

  test('unknown status is not shown on public dashboard', () => {
    expect(isPublicReport({ status: 'draft' })).toBe(false);
    expect(isPublicReport({ status: '' })).toBe(false);
  });

  test('stripSensitiveFields removes userEmail and userId', () => {
    const result = stripSensitiveFields({
      id: '1', category: 'Pothole',
      userId: 'user123', userEmail: 'private@email.com',
      status: 'pending',
    });
    expect(result).not.toHaveProperty('userEmail');
    expect(result).not.toHaveProperty('userId');
    expect(result).toHaveProperty('category');
  });

  // ── US3: Assign Requests and Priority ─────────────────────────────────
  test('admin can assign requests to workers', () => {
    expect(canAssignRequest('admin')).toBe(true);
  });

  test('worker cannot assign requests', () => {
    expect(canAssignRequest('worker')).toBe(false);
  });

  test('regular user cannot assign requests', () => {
    expect(canAssignRequest('user')).toBe(false);
  });

  test('priority low is valid', () => {
    expect(isValidPriority('low')).toBe(true);
  });

  test('priority medium is valid', () => {
    expect(isValidPriority('medium')).toBe(true);
  });

  test('priority high is valid', () => {
    expect(isValidPriority('high')).toBe(true);
  });

  test('invalid priority is rejected', () => {
    expect(isValidPriority('urgent')).toBe(false);
    expect(isValidPriority('')).toBe(false);
  });

  test('high priority has highest score', () => {
    expect(getPriorityScore('high')).toBe(3);
    expect(getPriorityScore('medium')).toBe(2);
    expect(getPriorityScore('low')).toBe(1);
  });

  test('unknown priority has score of 0', () => {
    expect(getPriorityScore('')).toBe(0);
  });

  test('sortByPriority orders high before medium before low', () => {
    const sorted = sortByPriority([
      { id: 1, priority: 'low'    },
      { id: 2, priority: 'high'   },
      { id: 3, priority: 'medium' },
    ]);
    expect(sorted[0].priority).toBe('high');
    expect(sorted[1].priority).toBe('medium');
    expect(sorted[2].priority).toBe('low');
  });

  test('sortByPriority does not mutate original array', () => {
    const reports = [{ id: 1, priority: 'low' }, { id: 2, priority: 'high' }];
    const sorted  = sortByPriority(reports);
    expect(reports[0].priority).toBe('low');
    expect(sorted[0].priority).toBe('high');
  });

  // ── US4: Worker Claim ──────────────────────────────────────────────────
  test('worker can claim a request', () => {
    expect(canClaimRequest('worker')).toBe(true);
  });

  test('admin can also claim a request', () => {
    expect(canClaimRequest('admin')).toBe(true);
  });

  test('regular user cannot claim a request', () => {
    expect(canClaimRequest('user')).toBe(false);
  });

  // ── US5: Satisfaction Feedback ─────────────────────────────────────────
  test('rating of 1 is valid', () => {
    expect(isValidRating(1)).toBe(true);
  });

  test('rating of 5 is valid', () => {
    expect(isValidRating(5)).toBe(true);
  });

  test('rating of 0 is invalid', () => {
    expect(isValidRating(0)).toBe(false);
  });

  test('rating of 6 is invalid', () => {
    expect(isValidRating(6)).toBe(false);
  });

  test('decimal rating is invalid', () => {
    expect(isValidRating(3.5)).toBe(false);
  });

  test('feedback already submitted blocks re-submission', () => {
    expect(feedbackAlreadySubmitted({ feedback: { rating: 4 } })).toBe(true);
    expect(feedbackAlreadySubmitted({})).toBe(false);
  });

  test('citizen can submit feedback on their resolved report', () => {
    expect(canSubmitFeedback(
      { status: 'resolved', userId: 'user_A', feedback: null }, 'user_A'
    )).toBe(true);
  });

  test('citizen cannot submit feedback on pending report', () => {
    expect(canSubmitFeedback(
      { status: 'pending', userId: 'user_A', feedback: null }, 'user_A'
    )).toBe(false);
  });

  test('citizen cannot submit feedback on another users report', () => {
    expect(canSubmitFeedback(
      { status: 'resolved', userId: 'user_A', feedback: null }, 'user_B'
    )).toBe(false);
  });

  test('citizen cannot submit feedback twice', () => {
    expect(canSubmitFeedback(
      { status: 'resolved', userId: 'user_A', feedback: { rating: 5 } }, 'user_A'
    )).toBe(false);
  });

  test('formatFeedback creates correct structure', () => {
    const result = formatFeedback(4, 'Great service');
    expect(result.rating).toBe(4);
    expect(result.comment).toBe('Great service');
    expect(result.submitted).toBe(true);
  });

  test('formatFeedback with no comment defaults to empty string', () => {
    expect(formatFeedback(5).comment).toBe('');
  });

  // ── US6: Analytics and CSV Export ─────────────────────────────────────
  const ANALYTICS_REPORTS = [
    { id: 1, category: 'Pothole',     status: 'pending',     assignedTo: null      },
    { id: 2, category: 'Water',       status: 'resolved',    assignedTo: 'worker1' },
    { id: 3, category: 'Pothole',     status: 'in-progress', assignedTo: 'worker1' },
    { id: 4, category: 'Electricity', status: 'resolved',    assignedTo: 'worker2' },
    { id: 5, category: 'Waste',       status: 'pending',     assignedTo: null      },
  ];

  test('calcVolumeByCategory counts Pothole correctly', () => {
    expect(calcVolumeByCategory(ANALYTICS_REPORTS)['Pothole']).toBe(2);
  });

  test('calcVolumeByCategory counts Water correctly', () => {
    expect(calcVolumeByCategory(ANALYTICS_REPORTS)['Water']).toBe(1);
  });

  test('calcVolumeByStatus counts pending correctly', () => {
    expect(calcVolumeByStatus(ANALYTICS_REPORTS)['pending']).toBe(2);
  });

  test('calcVolumeByStatus counts in-progress correctly', () => {
    expect(calcVolumeByStatus(ANALYTICS_REPORTS)['in-progress']).toBe(1);
  });

  test('calcVolumeByStatus counts resolved correctly', () => {
    expect(calcVolumeByStatus(ANALYTICS_REPORTS)['resolved']).toBe(2);
  });

  test('calcWorkerPerformance counts assigned correctly', () => {
    expect(calcWorkerPerformance(ANALYTICS_REPORTS)['worker1'].assigned).toBe(2);
    expect(calcWorkerPerformance(ANALYTICS_REPORTS)['worker2'].assigned).toBe(1);
  });

  test('calcWorkerPerformance counts resolved correctly', () => {
    expect(calcWorkerPerformance(ANALYTICS_REPORTS)['worker1'].resolved).toBe(1);
  });

  test('calcResolutionRate returns correct percentage', () => {
    expect(calcResolutionRate(ANALYTICS_REPORTS)).toBe(40);
  });

  test('calcResolutionRate returns 0 for empty array', () => {
    expect(calcResolutionRate([])).toBe(0);
  });

  test('generateCSVRow produces comma separated values', () => {
    const row = generateCSVRow({
      id: '123', category: 'Pothole', description: 'Big hole',
      status: 'pending', priority: 'high', ward: 'Ward 5',
      municipality: 'City of Joburg',
    });
    expect(row).toContain('Pothole');
    expect(row).toContain('pending');
    expect(row).toContain('high');
    expect(row).toContain('Ward 5');
  });

  test('generateCSVRow handles missing priority with none', () => {
    expect(generateCSVRow({
      id: '1', category: 'Water', description: 'test', status: 'pending'
    })).toContain('none');
  });

  test('generateCSVRow escapes quotes in description', () => {
    expect(generateCSVRow({
      id: '1', category: 'Water', description: 'Pipe "broken" badly',
      status: 'pending', priority: 'medium', ward: 'Ward 1',
    })).toContain('""');
  });

  test('generateCSVHeader returns correct column names', () => {
    const header = generateCSVHeader();
    expect(header).toContain('Category');
    expect(header).toContain('Status');
    expect(header).toContain('Priority');
    expect(header).toContain('Ward');
  });

  test('generateFullCSV includes header and rows', () => {
    const csv = generateFullCSV([
      { id: '1', category: 'Pothole', description: 'Big hole', status: 'pending', priority: 'high', ward: 'Ward 1', municipality: 'CoJ' },
      { id: '2', category: 'Water', description: 'Pipe burst', status: 'resolved', priority: 'low', ward: 'Ward 2', municipality: 'CoJ' },
    ]);
    expect(csv).toContain('Category');
    expect(csv).toContain('Pothole');
    expect(csv).toContain('Water');
  });

  test('generateFullCSV with empty array returns only header', () => {
    expect(generateFullCSV([])).toBe(generateCSVHeader());
  });

});

