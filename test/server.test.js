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
} = require('./helpers');

describe('Municipal Service Portal — Sprint 2 Tests', () => {

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

  // ── US2: Delete Report — authorization logic ───────────────────────────
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

  // ── US3: Filter and Search Reports by Category ─────────────────────────
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

  test('empty status filter returns all reports', () => {
    const result = filterByStatus(SAMPLE_REPORTS, '');
    expect(result.length).toBe(3);
  });

  test('empty keyword returns all reports', () => {
    const result = filterByKeyword(SAMPLE_REPORTS, '');
    expect(result.length).toBe(3);
  });

  test('filter by category returns correct reports', () => {
    const result = SAMPLE_REPORTS.filter(r => r.category === 'Water');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(2);
  });

  // ── US4: Update Report Status ──────────────────────────────────────────
  test('valid statuses include pending in-progress resolved', () => {
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
    expect(canSeeAllReports('user')).toBe(false);
  });

  // ── US7: Reset Password — password validation ──────────────────────────
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

  // ── US8: Image Upload — size and format validation ─────────────────────
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

  // ── Security: XSS escaping ─────────────────────────────────────────────
  test('escapeHtml prevents XSS script injection', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('escapeHtml converts ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  test('escapeHtml handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  test('escapeHtml handles null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  test('escapeHtml converts quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  // ── Status class helper ────────────────────────────────────────────────
  test('getStatusClass returns pending for pending status', () => {
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

  test('getStatusClass returns pending for unknown', () => {
    expect(getStatusClass('')).toBe('pending');
    expect(getStatusClass(null)).toBe('pending');
  });

  // ── Category validation ────────────────────────────────────────────────
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

});

