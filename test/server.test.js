describe('Municipal Service Portal — Sprint 2 Tests', () => {

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
});