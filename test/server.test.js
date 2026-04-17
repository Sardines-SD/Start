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

});