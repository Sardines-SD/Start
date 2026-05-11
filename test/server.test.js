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

// ═══════════════════════════════════════════════════════════════════════════════
// APP.JS COVERAGE TESTS — These tests measure coverage of actual app logic
// ═══════════════════════════════════════════════════════════════════════════════

describe('App.js — Sprint 1 Auth Logic', () => {

  test('valid login input is accepted', () => {
    const result = validateLoginInput('user@test.com', 'password123');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  test('missing email returns error', () => {
    const result = validateLoginInput('', 'password123');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('missing password returns error', () => {
    const result = validateLoginInput('user@test.com', '');
    expect(result.valid).toBe(false);
  });

  test('invalid email format returns error', () => {
    const result = validateLoginInput('notanemail', 'password123');
    expect(result.valid).toBe(false);
  });

  test('short password returns error', () => {
    const result = validateLoginInput('user@test.com', '123');
    expect(result.valid).toBe(false);
  });

  test('valid registration is accepted', () => {
    const result = validateRegistrationInput('user@test.com', 'password123', 'password123');
    expect(result.valid).toBe(true);
  });

  test('mismatched passwords fail registration', () => {
    const result = validateRegistrationInput('user@test.com', 'password123', 'different');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Passwords do not match');
  });

  test('invalid email fails registration', () => {
    const result = validateRegistrationInput('notvalid', 'password123', 'password123');
    expect(result.valid).toBe(false);
  });

  test('known error code returns specific message', () => {
    expect(getLoginErrorMessage('auth/user-not-found')).toBe('No account found with this email address.');
    expect(getLoginErrorMessage('auth/wrong-password')).toBe('Incorrect password. Please try again.');
    expect(getLoginErrorMessage('auth/invalid-email')).toBe('Please enter a valid email address.');
    expect(getLoginErrorMessage('auth/user-disabled')).toBe('This account has been disabled.');
    expect(getLoginErrorMessage('auth/too-many-requests')).toBe('Too many failed attempts. Please try again later.');
    expect(getLoginErrorMessage('auth/invalid-credential')).toBe('Invalid email or password.');
  });

  test('unknown error code returns fallback message', () => {
    expect(getLoginErrorMessage('auth/unknown')).toBe('Login failed. Please try again.');
  });

  test('valid 6-digit code is accepted', () => {
    expect(validateVerificationCode('123456')).toBe(true);
  });

  test('code with letters is rejected', () => {
    expect(validateVerificationCode('abc123')).toBe(false);
  });

  test('short code is rejected', () => {
    expect(validateVerificationCode('1234')).toBe(false);
  });

  test('empty code is rejected', () => {
    expect(validateVerificationCode('')).toBe(false);
    expect(validateVerificationCode(null)).toBe(false);
  });

});

describe('App.js — Sprint 2 Request Logic', () => {

  test('valid create request is accepted', () => {
    const result = validateCreateRequest({
      category: 'Pothole', description: 'Big hole on Main St'
    });
    expect(result.valid).toBe(true);
  });

  test('missing category fails validation', () => {
    const result = validateCreateRequest({ description: 'test' });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('missing description fails validation', () => {
    const result = validateCreateRequest({ category: 'Pothole' });
    expect(result.valid).toBe(false);
  });

  test('invalid category fails validation', () => {
    const result = validateCreateRequest({ category: 'Aliens', description: 'test' });
    expect(result.valid).toBe(false);
  });

  test('oversized image fails validation', () => {
    const bigImage = 'x'.repeat(16 * 1024 * 1024);
    const result = validateCreateRequest({
      category: 'Pothole', description: 'test', image: bigImage
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too large');
  });

  test('valid status update is accepted', () => {
    expect(validateStatusUpdate('pending').valid).toBe(true);
    expect(validateStatusUpdate('in-progress').valid).toBe(true);
    expect(validateStatusUpdate('resolved').valid).toBe(true);
  });

  test('invalid status update is rejected', () => {
    expect(validateStatusUpdate('done').valid).toBe(false);
    expect(validateStatusUpdate('').valid).toBe(false);
  });

  test('valid role update is accepted', () => {
    expect(validateRoleUpdate('user').valid).toBe(true);
    expect(validateRoleUpdate('worker').valid).toBe(true);
    expect(validateRoleUpdate('admin').valid).toBe(true);
  });

  test('invalid role update is rejected', () => {
    expect(validateRoleUpdate('superadmin').valid).toBe(false);
  });

  test('owner can delete their report', () => {
    expect(canUserDelete('uid_A', 'uid_A', 'user')).toBe(true);
  });

  test('non-owner cannot delete report', () => {
    expect(canUserDelete('uid_A', 'uid_B', 'user')).toBe(false);
  });

  test('admin can delete any report', () => {
    expect(canUserDelete('uid_A', 'uid_B', 'admin')).toBe(true);
  });

  test('admin and worker can update status', () => {
    expect(canUserUpdateStatus('admin')).toBe(true);
    expect(canUserUpdateStatus('worker')).toBe(true);
    expect(canUserUpdateStatus('user')).toBe(false);
  });

  test('admin and worker can see all reports', () => {
    expect(canUserSeeAllReports('admin')).toBe(true);
    expect(canUserSeeAllReports('worker')).toBe(true);
    expect(canUserSeeAllReports('user')).toBe(false);
  });

  test('admin can delete another users account', () => {
    expect(canAdminDeleteUser('admin_uid', 'user_uid', 'admin')).toBe(true);
  });

  test('admin cannot delete their own account', () => {
    expect(canAdminDeleteUser('admin_uid', 'admin_uid', 'admin')).toBe(false);
  });

  test('non-admin cannot delete accounts', () => {
    expect(canAdminDeleteUser('user_uid', 'other_uid', 'user')).toBe(false);
  });

  test('applyRequestFilters filters by status', () => {
    const reports = [
      { category: 'Pothole', description: 'hole', status: 'pending'     },
      { category: 'Water',   description: 'pipe', status: 'resolved'    },
      { category: 'Waste',   description: 'bin',  status: 'in-progress' },
    ];
    expect(applyRequestFilters(reports, 'pending', '').length).toBe(1);
    expect(applyRequestFilters(reports, 'resolved', '').length).toBe(1);
  });

  test('applyRequestFilters filters by search keyword', () => {
    const reports = [
      { category: 'Pothole', description: 'big hole', status: 'pending' },
      { category: 'Water',   description: 'burst pipe', status: 'resolved' },
    ];
    expect(applyRequestFilters(reports, '', 'pipe').length).toBe(1);
    expect(applyRequestFilters(reports, '', 'hole').length).toBe(1);
    expect(applyRequestFilters(reports, '', 'xyz').length).toBe(0);
  });

  test('applyRequestFilters with no filters returns all', () => {
    const reports = [
      { category: 'Pothole', description: 'hole', status: 'pending'  },
      { category: 'Water',   description: 'pipe', status: 'resolved' },
    ];
    expect(applyRequestFilters(reports, '', '').length).toBe(2);
  });

  test('email notification sent for in-progress', () => {
    expect(shouldNotifyOnStatusChange('in-progress')).toBe(true);
  });

  test('email notification sent for resolved', () => {
    expect(shouldNotifyOnStatusChange('resolved')).toBe(true);
  });

  test('email notification not sent for pending', () => {
    expect(shouldNotifyOnStatusChange('pending')).toBe(false);
  });

  test('email subject includes category and status', () => {
    const subject = buildStatusEmailSubject('resolved', 'Pothole');
    expect(subject).toContain('Pothole');
    expect(subject).toContain('resolved');
  });

  test('email subject for in-progress is correct', () => {
    const subject = buildStatusEmailSubject('in-progress', 'Water');
    expect(subject).toContain('Water');
  });

});

describe('App.js — Sprint 3 Geolocation Logic', () => {

  test('valid SA coordinates pass validation', () => {
    expect(validateCoordinates(-26.2041, 28.0473).valid).toBe(true);
  });

  test('latitude above 90 fails validation', () => {
    const result = validateCoordinates(91, 28);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('latitude below -90 fails validation', () => {
    expect(validateCoordinates(-91, 28).valid).toBe(false);
  });

  test('longitude above 180 fails validation', () => {
    expect(validateCoordinates(-26, 181).valid).toBe(false);
  });

  test('longitude below -180 fails validation', () => {
    expect(validateCoordinates(-26, -181).valid).toBe(false);
  });

  test('non-numeric coordinates fail validation', () => {
    expect(validateCoordinates('abc', 28).valid).toBe(false);
    expect(validateCoordinates(-26, 'xyz').valid).toBe(false);
  });

  test('Johannesburg is within South Africa', () => {
    expect(isCoordinateWithinSouthAfrica(-26.2041, 28.0473)).toBe(true);
  });

  test('Cape Town is within South Africa', () => {
    expect(isCoordinateWithinSouthAfrica(-33.9249, 18.4241)).toBe(true);
  });

  test('London is outside South Africa', () => {
    expect(isCoordinateWithinSouthAfrica(51.5074, -0.1278)).toBe(false);
  });

  test('buildLocationData creates correct structure', () => {
    const result = buildLocationData(-26.2041, 28.0473, {
      ward: 'Ward 5', wardNo: 5, municipality: 'CoJ', province: 'Gauteng'
    });
    expect(result.latitude).toBe(-26.2041);
    expect(result.longitude).toBe(28.0473);
    expect(result.ward).toBe('Ward 5');
    expect(result.municipality).toBe('CoJ');
    expect(result.province).toBe('Gauteng');
  });

  test('buildLocationData with null wardInfo returns nulls', () => {
    const result = buildLocationData(-26.2041, 28.0473, null);
    expect(result.ward).toBeNull();
    expect(result.municipality).toBeNull();
  });

  test('formatWardDisplay with both values', () => {
    expect(formatWardDisplay('Ward 5', 'CoJ')).toBe('Ward 5, CoJ');
  });

  test('formatWardDisplay with only ward', () => {
    expect(formatWardDisplay('Ward 5', null)).toBe('Ward 5');
  });

  test('formatWardDisplay with only municipality', () => {
    expect(formatWardDisplay(null, 'CoJ')).toBe('CoJ');
  });

  test('formatWardDisplay with neither returns unknown', () => {
    expect(formatWardDisplay(null, null)).toBe('Location unknown');
  });

  test('sanitisePublicReport removes sensitive data', () => {
    const result = sanitisePublicReport({
      firestoreId: '1', category: 'Pothole', status: 'pending',
      description: 'Big hole', userEmail: 'private@test.com',
    });
    expect(result).not.toHaveProperty('userEmail');
    expect(result).toHaveProperty('category');
  });

  test('sanitisePublicReport truncates long descriptions', () => {
    const result = sanitisePublicReport({
      category: 'Water', status: 'pending',
      description: 'x'.repeat(200),
    });
    expect(result.description.length).toBe(100);
  });

  test('pending report is visible to public', () => {
    expect(isReportVisibleToPublic({ status: 'pending' })).toBe(true);
  });

  test('resolved report is visible to public', () => {
    expect(isReportVisibleToPublic({ status: 'resolved' })).toBe(true);
  });

  test('draft report is not visible to public', () => {
    expect(isReportVisibleToPublic({ status: 'draft' })).toBe(false);
  });

});

describe('App.js — Sprint 3 Feature Logic', () => {

  test('calculateAnalytics returns correct category counts', () => {
    const requests = [
      { category: 'Pothole',     status: 'pending',     assignedTo: null      },
      { category: 'Pothole',     status: 'resolved',    assignedTo: 'worker1' },
      { category: 'Water',       status: 'in-progress', assignedTo: 'worker1' },
      { category: 'Electricity', status: 'resolved',    assignedTo: 'worker2' },
    ];
    const result = calculateAnalytics(requests);
    expect(result.byCategory['Pothole']).toBe(2);
    expect(result.byCategory['Water']).toBe(1);
    expect(result.byStatus['pending']).toBe(1);
    expect(result.byStatus['resolved']).toBe(2);
    expect(result.resolutionRate).toBe(50);
    expect(result.workerPerformance['worker1'].assigned).toBe(2);
    expect(result.workerPerformance['worker2'].resolved).toBe(1);
    expect(result.totalRequests).toBe(4);
  });

  test('calculateAnalytics handles empty array', () => {
    const result = calculateAnalytics([]);
    expect(result.totalRequests).toBe(0);
    expect(result.resolutionRate).toBe(0);
  });

  test('valid priority passes validation', () => {
    expect(validatePriority('low').valid).toBe(true);
    expect(validatePriority('medium').valid).toBe(true);
    expect(validatePriority('high').valid).toBe(true);
  });

  test('invalid priority fails validation', () => {
    const result = validatePriority('urgent');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('only admin can set priority', () => {
    expect(canSetPriority('admin')).toBe(true);
    expect(canSetPriority('worker')).toBe(false);
    expect(canSetPriority('user')).toBe(false);
  });

  test('only admin can assign requests to workers', () => {
    expect(canAssignToWorker('admin')).toBe(true);
    expect(canAssignToWorker('worker')).toBe(false);
    expect(canAssignToWorker('user')).toBe(false);
  });

  test('worker and admin can claim requests', () => {
    expect(canClaimRequest('worker')).toBe(true);
    expect(canClaimRequest('admin')).toBe(true);
    expect(canClaimRequest('user')).toBe(false);
  });

  test('valid feedback passes validation', () => {
    const report = { userId: 'user_A', status: 'resolved', feedback: null };
    expect(validateFeedback(4, report, 'user_A').valid).toBe(true);
  });

  test('rating of 0 fails feedback validation', () => {
    const report = { userId: 'user_A', status: 'resolved', feedback: null };
    expect(validateFeedback(0, report, 'user_A').valid).toBe(false);
  });

  test('rating of 6 fails feedback validation', () => {
    const report = { userId: 'user_A', status: 'resolved', feedback: null };
    const result = validateFeedback(6, report, 'user_A');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between 1 and 5');
  });

  test('non-owner cannot submit feedback', () => {
    const report = { userId: 'user_A', status: 'resolved', feedback: null };
    const result = validateFeedback(4, report, 'user_B');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('own reports');
  });

  test('pending report cannot receive feedback', () => {
    const report = { userId: 'user_A', status: 'pending', feedback: null };
    const result = validateFeedback(4, report, 'user_A');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('resolved');
  });

  test('cannot submit feedback twice', () => {
    const report = { userId: 'user_A', status: 'resolved', feedback: { rating: 5 } };
    const result = validateFeedback(4, report, 'user_A');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('already been submitted');
  });

  test('buildCSVRow produces correct format', () => {
    const row = buildCSVRow({
      id: '1', category: 'Pothole', description: 'Big hole',
      status: 'pending', priority: 'high', ward: 'Ward 5',
      municipality: 'CoJ', userEmail: 'user@test.com', createdAt: '01/05/2026',
    });
    expect(row).toContain('Pothole');
    expect(row).toContain('high');
    expect(row).toContain('Ward 5');
    expect(row).toContain('user@test.com');
  });

  test('buildCSVRow handles missing fields gracefully', () => {
    const row = buildCSVRow({ id: '1' });
    expect(typeof row).toBe('string');
    expect(row).toContain('none');
  });

  test('buildCSVRow escapes quotes in description', () => {
    const row = buildCSVRow({
      id: '1', category: 'Water', description: 'Pipe "broken"',
      status: 'pending', priority: 'low',
    });
    expect(row).toContain('""');
  });

  test('buildFullCSV includes header and all rows', () => {
    const csv = buildFullCSV([
      { id: '1', category: 'Pothole', description: 'hole', status: 'pending', priority: 'high', ward: 'W1', municipality: 'CoJ', userEmail: 'a@b.com', createdAt: '01/05/2026' },
      { id: '2', category: 'Water',   description: 'pipe', status: 'resolved', priority: 'low', ward: 'W2', municipality: 'CoJ', userEmail: 'c@d.com', createdAt: '02/05/2026' },
    ]);
    expect(csv).toContain('Category');
    expect(csv).toContain('Pothole');
    expect(csv).toContain('Water');
  });

  test('buildFullCSV with empty array returns only header', () => {
    const csv = buildFullCSV([]);
    expect(csv).toBe('ID,Category,Description,Status,Priority,Ward,Municipality,Email,Created');
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// COVERAGE GAP TESTS — Target remaining uncovered lines
// ═══════════════════════════════════════════════════════════════════════════════

describe('Coverage — app.js branch gaps', () => {

  // app.js line 125: buildStatusEmailSubject fallback label (unknown status)
  test('buildStatusEmailSubject uses fallback label for unknown status', () => {
    const subject = buildStatusEmailSubject('cancelled', 'Water');
    expect(subject).toContain('Water');
    expect(subject).toContain('has been updated');
  });

  // app.js line 170: sanitisePublicReport falls back to report.id when no firestoreId
  test('sanitisePublicReport falls back to report.id when firestoreId is missing', () => {
    const result = sanitisePublicReport({
      id: 'fallback-id', category: 'Waste', status: 'pending', description: 'test',
    });
    expect(result.firestoreId).toBe('fallback-id');
  });

  // app.js line 190: calculateAnalytics — byStatus skips unknown statuses
  test('calculateAnalytics ignores unrecognised status values', () => {
    const result = calculateAnalytics([
      { category: 'Water', status: 'draft', assignedTo: null },
    ]);
    expect(result.byStatus['pending']).toBe(0);
    expect(result.byStatus['resolved']).toBe(0);
    expect(result.totalRequests).toBe(1);
  });

  // app.js line 257: buildCSVRow with all fields populated (userEmail + createdAt)
  test('buildCSVRow includes userEmail and createdAt when present', () => {
    const row = buildCSVRow({
      id: '99', category: 'Electricity', description: 'Power out',
      status: 'resolved', priority: 'high', ward: 'Ward 3',
      municipality: 'Tshwane', userEmail: 'worker@test.com', createdAt: '09/05/2026',
    });
    expect(row).toContain('worker@test.com');
    expect(row).toContain('09/05/2026');
    expect(row).toContain('Electricity');
  });

  // app.js branches: applyRequestFilters matching by category keyword
  test('applyRequestFilters matches keyword against category field', () => {
    const reports = [
      { category: 'Electricity', description: 'no power', status: 'pending' },
      { category: 'Pothole',     description: 'big crack', status: 'pending' },
    ];
    const result = applyRequestFilters(reports, '', 'electricity');
    expect(result.length).toBe(1);
    expect(result[0].category).toBe('Electricity');
  });

  // app.js branches: applyRequestFilters combining status AND keyword
  test('applyRequestFilters can filter by both status and keyword simultaneously', () => {
    const reports = [
      { category: 'Water', description: 'burst pipe', status: 'pending'  },
      { category: 'Water', description: 'burst pipe', status: 'resolved' },
      { category: 'Waste', description: 'bin full',   status: 'pending'  },
    ];
    const result = applyRequestFilters(reports, 'pending', 'pipe');
    expect(result.length).toBe(1);
    expect(result[0].status).toBe('pending');
  });

});

describe('Coverage — helpers.js branch gaps', () => {

  // helpers.js lines 26-34: getLoginErrorMessage — all individual branches
  test('getLoginErrorMessage covers auth/invalid-credential branch', () => {
    expect(getLoginErrorMessage('auth/invalid-credential')).toBe('Invalid email or password.');
  });

  // helpers.js line 296: canClaimRequest — worker branch specifically
  test('canClaimRequest returns true for worker role explicitly', () => {
    expect(canClaimRequest('worker')).toBe(true);
  });

  // helpers.js: isValidEmail — missing domain (covers @nodomain edge)
  test('isValidEmail rejects address with no TLD', () => {
    expect(isValidEmail('user@nodomain')).toBe(false);
  });

  // helpers.js: escapeHtml — apostrophe branch
  test('escapeHtml converts single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  // helpers.js: getStatusClass — 'completed' branch
  test('getStatusClass maps completed to resolved', () => {
    expect(getStatusClass('completed')).toBe('resolved');
  });

  // helpers.js: getStatusClass — 'in progress' (with space) branch
  test('getStatusClass maps "in progress" (with space) to progress', () => {
    expect(getStatusClass('in progress')).toBe('progress');
  });

  // helpers.js: generateFullCSV empty array returns only header
  test('generateFullCSV empty returns just the header line', () => {
    expect(generateFullCSV([])).toBe('ID,Category,Description,Status,Priority,Ward,Municipality');
  });

  // helpers.js: filterByCategory — category match
  test('filterByCategory filters correctly by matching category', () => {
    const reports = [
      { category: 'Water', status: 'pending' },
      { category: 'Waste', status: 'pending' },
    ];
    expect(filterByCategory(reports, 'Waste').length).toBe(1);
    expect(filterByCategory(reports, 'Waste')[0].category).toBe('Waste');
  });

  // helpers.js: buildReportWithLocation with invalid coords sets hasLocation false
  test('buildReportWithLocation sets hasLocation false for invalid coordinates', () => {
    const result = buildReportWithLocation(
      { category: 'Pothole' }, 'bad', 'bad', null, null
    );
    expect(result.hasLocation).toBe(false);
  });

});

describe('Coverage — final branch closure', () => {

  // app.js 108-109: category-only match (description does NOT match, category DOES)
  // This forces the right side of the || to be evaluated and return true
  test('applyRequestFilters matches keyword only in category, not description', () => {
    const reports = [
      { category: 'Electricity', description: 'nothing relevant', status: 'pending' },
      { category: 'Pothole',     description: 'nothing relevant', status: 'pending' },
    ];
    const result = applyRequestFilters(reports, '', 'pothole');
    expect(result.length).toBe(1);
    expect(result[0].category).toBe('Pothole');
  });

  // app.js 170: sanitisePublicReport — both ward and municipality present
  test('sanitisePublicReport includes ward and municipality when present', () => {
    const result = sanitisePublicReport({
      firestoreId: 'abc', category: 'Waste', status: 'resolved',
      description: 'bin overflowing', ward: 'Ward 7', municipality: 'Ekurhuleni',
      latitude: -26.1, longitude: 28.1, createdAt: '01/05/2026',
    });
    expect(result.ward).toBe('Ward 7');
    expect(result.municipality).toBe('Ekurhuleni');
    expect(result.latitude).toBe(-26.1);
    expect(result.createdAt).toBe('01/05/2026');
  });

  // app.js 257: buildCSVRow — both userEmail and createdAt missing (falsy branch)
  test('buildCSVRow handles missing userEmail and createdAt gracefully', () => {
    const row = buildCSVRow({
      id: '5', category: 'Pothole', description: 'crack',
      status: 'pending', priority: 'low', ward: 'Ward 1', municipality: 'CoJ',
      // no userEmail, no createdAt
    });
    expect(typeof row).toBe('string');
    expect(row.split(',').length).toBe(9); // 9 columns always
  });

});
