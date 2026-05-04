/*describe('Municipal Service Portal — Sprint 2 Tests', () => {


  // ── US1: Create Report — field validation ─────────────────────────────
  test('report object has all required fields', () => {
    const report = {
      userId: 'user123',
      userEmail: 'resident@test.com',
      category: 'Pothole',
      description: 'Large pothole on Main Street',
      status: 'pending',
    };
    expect(report).toHaveProperty('userId');
    expect(report).toHaveProperty('category');
    expect(report).toHaveProperty('description');
    expect(report).toHaveProperty('status');
    expect(report.status).toBe('pending');
  });

  test('report without category is invalid', () => {
    const isValid = r => Boolean(r.category && r.description);
    expect(isValid({ description: 'test' })).toBe(false);
  });

  test('report without description is invalid', () => {
    const isValid = r => Boolean(r.category && r.description);
    expect(isValid({ category: 'Water' })).toBe(false);
  });

  test('report with both fields is valid', () => {
    const isValid = r => Boolean(r.category && r.description);
    expect(isValid({ category: 'Water', description: 'Burst pipe' })).toBe(true);
  });

  // ── US2/US3: Category and status validation ───────────────────────────
  const VALID_CATEGORIES = ['Pothole', 'Water', 'Electricity', 'Waste', 'Other'];
  const VALID_STATUSES   = ['pending', 'in-progress', 'resolved'];

  test('valid categories list has correct items', () => {
    expect(VALID_CATEGORIES).toContain('Pothole');
    expect(VALID_CATEGORIES).toContain('Water');
    expect(VALID_CATEGORIES).toContain('Electricity');
    expect(VALID_CATEGORIES).toContain('Waste');
  });

  test('invalid category is rejected', () => {
    const isValid = cat => VALID_CATEGORIES.includes(cat);
    expect(isValid('Pothole')).toBe(true);
    expect(isValid('Aliens')).toBe(false);
  });

  test('valid statuses are pending, in-progress, resolved', () => {
    expect(VALID_STATUSES).toContain('pending');
    expect(VALID_STATUSES).toContain('in-progress');
    expect(VALID_STATUSES).toContain('resolved');
  });

  test('invalid status is rejected', () => {
    const isValid = s => VALID_STATUSES.includes(s);
    expect(isValid('pending')).toBe(true);
    expect(isValid('done')).toBe(false);
    expect(isValid('')).toBe(false);
  });

  // ── US5: Filter & Search ──────────────────────────────────────────────
  const SAMPLE_REPORTS = [
    { id: 1, category: 'Pothole', description: 'Big pothole on Main St', status: 'pending'     },
    { id: 2, category: 'Water',   description: 'Burst pipe near school', status: 'in-progress' },
    { id: 3, category: 'Waste',   description: 'Overflowing bin',        status: 'resolved'    },
  ];

  test('filter by status returns only matching reports', () => {
    const result = SAMPLE_REPORTS.filter(r => r.status === 'pending');
    expect(result.length).toBe(1);
    expect(result[0].category).toBe('Pothole');
  });

  test('filter by in-progress returns correct report', () => {
    const result = SAMPLE_REPORTS.filter(r => r.status === 'in-progress');
    expect(result.length).toBe(1);
    expect(result[0].category).toBe('Water');
  });

  test('search by keyword matches description', () => {
    const kw = 'pipe';
    const result = SAMPLE_REPORTS.filter(r =>
      r.description.toLowerCase().includes(kw) ||
      r.category.toLowerCase().includes(kw)
    );
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(2);
  });

  test('search by keyword matches category', () => {
    const kw = 'waste';
    const result = SAMPLE_REPORTS.filter(r =>
      r.description.toLowerCase().includes(kw) ||
      r.category.toLowerCase().includes(kw)
    );
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(3);
  });

  test('search with no match returns empty array', () => {
    const kw = 'earthquake';
    const result = SAMPLE_REPORTS.filter(r =>
      r.description.toLowerCase().includes(kw) ||
      r.category.toLowerCase().includes(kw)
    );
    expect(result.length).toBe(0);
  });

  test('empty status filter returns all reports', () => {
    const status = '';
    const result = status
      ? SAMPLE_REPORTS.filter(r => r.status === status)
      : SAMPLE_REPORTS;
    expect(result.length).toBe(3);
  });

  // ── US2/US6: Role-based access and delete authorization ──────────────
  test('admin and worker can see all reports', () => {
    const canSeeAll = role => role === 'admin' || role === 'worker';
    expect(canSeeAll('admin')).toBe(true);
    expect(canSeeAll('worker')).toBe(true);
    expect(canSeeAll('user')).toBe(false);
  });

  test('regular user cannot see all reports', () => {
    const canSeeAll = role => role === 'admin' || role === 'worker';
    expect(canSeeAll('user')).toBe(false);
  });

  test('report owner can delete their own report', () => {
    const report   = { userId: 'user_A' };
    const canDelete = (uid, role) => report.userId === uid || role === 'admin';
    expect(canDelete('user_A', 'user')).toBe(true);
  });

  test('non-owner cannot delete another users report', () => {
    const report   = { userId: 'user_A' };
    const canDelete = (uid, role) => report.userId === uid || role === 'admin';
    expect(canDelete('user_B', 'user')).toBe(false);
  });

  test('admin can delete any report', () => {
    const report   = { userId: 'user_A' };
    const canDelete = (uid, role) => report.userId === uid || role === 'admin';
    expect(canDelete('user_B', 'admin')).toBe(true);
  });

  // ── Edge cases and security ───────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  test('escapeHtml prevents XSS in report output', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('escapeHtml converts ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  test('escapeHtml handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  test('image under 2MB size limit is accepted', () => {
    const limit = 2.5 * 1024 * 1024;
    expect(1_000_000 < limit).toBe(true);
  });

  test('image over 2MB size limit is rejected', () => {
    const limit = 2.5 * 1024 * 1024;
    expect(3_000_000 < limit).toBe(false);
  });

  test('password shorter than 6 chars is invalid', () => {
    expect('123'.length >= 6).toBe(false);
  });

  test('password of 6+ chars is valid', () => {
    expect('securepass'.length >= 6).toBe(true);
  });

  test('mismatched passwords fail confirmation', () => {
    expect('mypass' === 'wrongpass').toBe(false);
  });// ── Edge cases and security ───────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  test('escapeHtml prevents XSS in report output', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('escapeHtml converts ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  test('escapeHtml handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  test('image under 2MB size limit is accepted', () => {
    const limit = 2.5 * 1024 * 1024;
    expect(1_000_000 < limit).toBe(true);
  });

  test('image over 2MB size limit is rejected', () => {
    const limit = 2.5 * 1024 * 1024;
    expect(3_000_000 < limit).toBe(false);
  });

  test('password shorter than 6 chars is invalid', () => {
    expect('123'.length >= 6).toBe(false);
  });

  test('password of 6+ chars is valid', () => {
    expect('securepass'.length >= 6).toBe(true);
  });

  test('mismatched passwords fail confirmation', () => {
    expect('mypass' === 'wrongpass').toBe(false);
  });
});*/

const {
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
} = require('./helpers');

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 2 TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 2 — Municipal Service Portal Tests', () => {

  // ── US1: Create Report — field validation ──────────────────────────────
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

  // ── US2: Delete Report ─────────────────────────────────────────────────
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

  // ── US3: Filter and Search ─────────────────────────────────────────────
  const SAMPLE_REPORTS = [
    { id: 1, category: 'Pothole', description: 'Big pothole on Main St', status: 'pending'     },
    { id: 2, category: 'Water',   description: 'Burst pipe near school', status: 'in-progress' },
    { id: 3, category: 'Waste',   description: 'Overflowing bin',        status: 'resolved'    },
  ];

  test('filter by status returns only matching reports', () => {
    const result = filterByStatus(SAMPLE_REPORTS, 'pending');
    expect(result.length).toBe(1);
    expect(result[0].category).toBe('Pothole');
  });

  test('filter by in-progress returns correct report', () => {
    const result = filterByStatus(SAMPLE_REPORTS, 'in-progress');
    expect(result.length).toBe(1);
    expect(result[0].category).toBe('Water');
  });

  test('empty status filter returns all reports', () => {
    const result = filterByStatus(SAMPLE_REPORTS, '');
    expect(result.length).toBe(3);
  });

  test('search by keyword matches description', () => {
    const result = filterByKeyword(SAMPLE_REPORTS, 'pipe');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(2);
  });

  test('search by keyword matches category', () => {
    const result = filterByKeyword(SAMPLE_REPORTS, 'waste');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(3);
  });

  test('search with no match returns empty array', () => {
    const result = filterByKeyword(SAMPLE_REPORTS, 'earthquake');
    expect(result.length).toBe(0);
  });

  test('empty keyword returns all reports', () => {
    const result = filterByKeyword(SAMPLE_REPORTS, '');
    expect(result.length).toBe(3);
  });

  test('filter by category returns correct reports', () => {
    const result = filterByCategory(SAMPLE_REPORTS, 'Water');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(2);
  });

  test('empty category filter returns all reports', () => {
    const result = filterByCategory(SAMPLE_REPORTS, '');
    expect(result.length).toBe(3);
  });

  // ── US4: Update Report Status ──────────────────────────────────────────
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

  // ── US5: View All Reports ──────────────────────────────────────────────
  test('admin and worker can see all reports', () => {
    expect(canSeeAllReports('admin')).toBe(true);
    expect(canSeeAllReports('worker')).toBe(true);
  });

  test('regular user cannot see all reports', () => {
    expect(canSeeAllReports('user')).toBe(false);
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

  // ── Status class helper ────────────────────────────────────────────────
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

  // ── US1: Create Report with Geolocation ───────────────────────────────
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

  // ── Ward Detection — South Africa boundary check ───────────────────────
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

  test('coordinates on South Africa boundary are accepted', () => {
    expect(isWithinSouthAfrica(-22, 16)).toBe(true);
    expect(isWithinSouthAfrica(-35, 33)).toBe(true);
  });

  // ── Build Report with Location ─────────────────────────────────────────
  test('buildReportWithLocation attaches coordinates to report', () => {
    const base   = { category: 'Pothole', description: 'Big hole' };
    const result = buildReportWithLocation(base, -26.2041, 28.0473, 'Ward 5', 'City of Joburg');
    expect(result.latitude).toBe(-26.2041);
    expect(result.longitude).toBe(28.0473);
    expect(result.ward).toBe('Ward 5');
    expect(result.municipality).toBe('City of Joburg');
    expect(result.hasLocation).toBe(true);
  });

  test('buildReportWithLocation with null ward still works', () => {
    const base   = { category: 'Water', description: 'Pipe burst' };
    const result = buildReportWithLocation(base, -26.2041, 28.0473, null, null);
    expect(result.ward).toBeNull();
    expect(result.municipality).toBeNull();
    expect(result.hasLocation).toBe(true);
  });

  test('buildReportWithLocation preserves original report fields', () => {
    const base   = { category: 'Pothole', description: 'Crack in road', userId: 'user1' };
    const result = buildReportWithLocation(base, -26.2041, 28.0473, 'Ward 1', 'City of Joburg');
    expect(result.category).toBe('Pothole');
    expect(result.userId).toBe('user1');
  });

  // ── Ward and Municipality Validation ──────────────────────────────────
  test('valid ward string is accepted', () => {
    expect(isValidWard('Ward 5')).toBe(true);
    expect(isValidWard('Ward 12')).toBe(true);
  });

  test('empty ward string is rejected', () => {
    expect(isValidWard('')).toBe(false);
  });

  test('valid municipality is accepted', () => {
    expect(isValidMunicipality('City of Johannesburg')).toBe(true);
    expect(isValidMunicipality('City of Cape Town')).toBe(true);
  });

  test('empty municipality is rejected', () => {
    expect(isValidMunicipality('')).toBe(false);
  });

  // ── Format Ward Label ──────────────────────────────────────────────────
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

  // ── Report Has Geolocation Check ───────────────────────────────────────
  test('report with coordinates has geolocation', () => {
    const report = { latitude: -26.2041, longitude: 28.0473 };
    expect(reportHasGeolocation(report)).toBe(true);
  });

  test('report without coordinates has no geolocation', () => {
    const report = { category: 'Pothole' };
    expect(reportHasGeolocation(report)).toBe(false);
  });

  test('report with null coordinates has no geolocation', () => {
    const report = { latitude: null, longitude: null };
    expect(reportHasGeolocation(report)).toBe(false);
  });

});

describe('Sprint 3 — Feature Tests', () => {

  // ── US1: Public Dashboard ──────────────────────────────────────────────
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
    const report = {
      id: '1', category: 'Pothole',
      userId: 'user123', userEmail: 'private@email.com',
      status: 'pending',
    };
    const result = stripSensitiveFields(report);
    expect(result).not.toHaveProperty('userEmail');
    expect(result).not.toHaveProperty('userId');
    expect(result).toHaveProperty('category');
    expect(result).toHaveProperty('status');
  });

  // ── US2: Analytics ─────────────────────────────────────────────────────
  const ANALYTICS_REPORTS = [
    { id: 1, category: 'Pothole',     status: 'pending',     assignedTo: null        },
    { id: 2, category: 'Water',       status: 'resolved',    assignedTo: 'worker1'   },
    { id: 3, category: 'Pothole',     status: 'in-progress', assignedTo: 'worker1'   },
    { id: 4, category: 'Electricity', status: 'resolved',    assignedTo: 'worker2'   },
    { id: 5, category: 'Waste',       status: 'pending',     assignedTo: null        },
  ];

  test('calcVolumeByCategory counts Pothole correctly', () => {
    const result = calcVolumeByCategory(ANALYTICS_REPORTS);
    expect(result['Pothole']).toBe(2);
  });

  test('calcVolumeByCategory counts Water correctly', () => {
    const result = calcVolumeByCategory(ANALYTICS_REPORTS);
    expect(result['Water']).toBe(1);
  });

  test('calcVolumeByCategory counts all categories', () => {
    const result = calcVolumeByCategory(ANALYTICS_REPORTS);
    expect(result['Electricity']).toBe(1);
    expect(result['Waste']).toBe(1);
  });

  test('calcVolumeByStatus counts pending correctly', () => {
    const result = calcVolumeByStatus(ANALYTICS_REPORTS);
    expect(result['pending']).toBe(2);
  });

  test('calcVolumeByStatus counts in-progress correctly', () => {
    const result = calcVolumeByStatus(ANALYTICS_REPORTS);
    expect(result['in-progress']).toBe(1);
  });

  test('calcVolumeByStatus counts resolved correctly', () => {
    const result = calcVolumeByStatus(ANALYTICS_REPORTS);
    expect(result['resolved']).toBe(2);
  });

  test('calcWorkerPerformance counts assigned correctly', () => {
    const result = calcWorkerPerformance(ANALYTICS_REPORTS);
    expect(result['worker1'].assigned).toBe(2);
    expect(result['worker2'].assigned).toBe(1);
  });

  test('calcWorkerPerformance counts resolved correctly', () => {
    const result = calcWorkerPerformance(ANALYTICS_REPORTS);
    expect(result['worker1'].resolved).toBe(1);
    expect(result['worker2'].resolved).toBe(1);
  });

  test('calcResolutionRate returns correct percentage', () => {
    const result = calcResolutionRate(ANALYTICS_REPORTS);
    expect(result).toBe(40);
  });

  test('calcResolutionRate returns 0 for empty array', () => {
    expect(calcResolutionRate([])).toBe(0);
  });

  test('only admin can access analytics', () => {
    expect(canAssignRequest('admin')).toBe(true);
    expect(canAssignRequest('worker')).toBe(false);
    expect(canAssignRequest('user')).toBe(false);
  });

  // ── US3: Assign Request ────────────────────────────────────────────────
  test('admin can assign requests to workers', () => {
    expect(canAssignRequest('admin')).toBe(true);
  });

  test('worker cannot assign requests', () => {
    expect(canAssignRequest('worker')).toBe(false);
  });

  test('regular user cannot assign requests', () => {
    expect(canAssignRequest('user')).toBe(false);
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

  test('rating of 3 is valid', () => {
    expect(isValidRating(3)).toBe(true);
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
    const report = { status: 'resolved', userId: 'user_A', feedback: null };
    expect(canSubmitFeedback(report, 'user_A')).toBe(true);
  });

  test('citizen cannot submit feedback on pending report', () => {
    const report = { status: 'pending', userId: 'user_A', feedback: null };
    expect(canSubmitFeedback(report, 'user_A')).toBe(false);
  });

  test('citizen cannot submit feedback on another users report', () => {
    const report = { status: 'resolved', userId: 'user_A', feedback: null };
    expect(canSubmitFeedback(report, 'user_B')).toBe(false);
  });

  test('citizen cannot submit feedback twice', () => {
    const report = { status: 'resolved', userId: 'user_A', feedback: { rating: 5 } };
    expect(canSubmitFeedback(report, 'user_A')).toBe(false);
  });

  test('formatFeedback creates correct structure', () => {
    const result = formatFeedback(4, 'Great service');
    expect(result.rating).toBe(4);
    expect(result.comment).toBe('Great service');
    expect(result.submitted).toBe(true);
  });

  test('formatFeedback with no comment defaults to empty string', () => {
    const result = formatFeedback(5);
    expect(result.comment).toBe('');
  });

  // ── US6: Mid-Sprint — Priority Levels ─────────────────────────────────
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
    expect(isValidPriority('critical')).toBe(false);
  });

  test('high priority has highest score', () => {
    expect(getPriorityScore('high')).toBe(3);
    expect(getPriorityScore('medium')).toBe(2);
    expect(getPriorityScore('low')).toBe(1);
  });

  test('unknown priority has score of 0', () => {
    expect(getPriorityScore('urgent')).toBe(0);
    expect(getPriorityScore('')).toBe(0);
  });

  test('sortByPriority orders high before medium before low', () => {
    const reports = [
      { id: 1, priority: 'low'    },
      { id: 2, priority: 'high'   },
      { id: 3, priority: 'medium' },
    ];
    const sorted = sortByPriority(reports);
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

  // ── CSV Export ─────────────────────────────────────────────────────────
  test('generateCSVRow produces comma separated values', () => {
    const report = {
      id: '123', category: 'Pothole', description: 'Big hole',
      status: 'pending', priority: 'high', ward: 'Ward 5',
      municipality: 'City of Joburg',
    };
    const row = generateCSVRow(report);
    expect(row).toContain('Pothole');
    expect(row).toContain('pending');
    expect(row).toContain('high');
    expect(row).toContain('Ward 5');
    expect(row).toContain('City of Joburg');
  });

  test('generateCSVRow handles missing priority with none', () => {
    const row = generateCSVRow({ id: '1', category: 'Water', description: 'test', status: 'pending' });
    expect(row).toContain('none');
  });

  test('generateCSVRow escapes quotes in description', () => {
    const report = {
      id: '1', category: 'Water', description: 'Pipe "broken" badly',
      status: 'pending', priority: 'medium', ward: 'Ward 1',
    };
    const row = generateCSVRow(report);
    expect(row).toContain('""');
  });

  test('generateCSVHeader returns correct column names', () => {
    const header = generateCSVHeader();
    expect(header).toContain('Category');
    expect(header).toContain('Status');
    expect(header).toContain('Priority');
    expect(header).toContain('Ward');
    expect(header).toContain('Municipality');
  });

  test('generateFullCSV includes header and rows', () => {
    const reports = [
      { id: '1', category: 'Pothole', description: 'Big hole', status: 'pending', priority: 'high', ward: 'Ward 1', municipality: 'CoJ' },
      { id: '2', category: 'Water',   description: 'Pipe burst', status: 'resolved', priority: 'low', ward: 'Ward 2', municipality: 'CoJ' },
    ];
    const csv = generateFullCSV(reports);
    expect(csv).toContain('Category');
    expect(csv).toContain('Pothole');
    expect(csv).toContain('Water');
  });

  test('generateFullCSV with empty array returns only header', () => {
    const csv = generateFullCSV([]);
    expect(csv).toBe(generateCSVHeader());
  });

});