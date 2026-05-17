// ALL TESTS IMPORT FROM app.js ONLY
// Coverage goes up automatically as you implement features in Server.js
// and update the corresponding function in app.js

const {
  validateLoginInput,
  validateRegistrationInput,
  getLoginErrorMessage,
  validateVerificationCode,
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
  DUPLICATE_RADIUS_KM,
  DUPLICATE_TIME_WINDOW_H,
} = require('../app');

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 1
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 1 US1 & US2 — Login', () => {
  test('valid login credentials accepted', () => {
    expect(validateLoginInput('user@test.com', 'password123').valid).toBe(true);
  });
  test('missing email returns error', () => {
    expect(validateLoginInput('', 'password123').valid).toBe(false);
  });
  test('missing password returns error', () => {
    expect(validateLoginInput('user@test.com', '').valid).toBe(false);
  });
  test('invalid email format is rejected', () => {
    expect(validateLoginInput('notanemail', 'password123').valid).toBe(false);
  });
  test('short password is rejected', () => {
    expect(validateLoginInput('user@test.com', '123').valid).toBe(false);
  });
  test('both fields missing returns error', () => {
    expect(validateLoginInput('', '').valid).toBe(false);
  });
});

describe('Sprint 1 US3 — Login Error Handling', () => {
  test('user-not-found message', () => {
    expect(getLoginErrorMessage('auth/user-not-found')).toBe('No account found with this email address.');
  });
  test('wrong-password message', () => {
    expect(getLoginErrorMessage('auth/wrong-password')).toBe('Incorrect password. Please try again.');
  });
  test('invalid-email message', () => {
    expect(getLoginErrorMessage('auth/invalid-email')).toBe('Please enter a valid email address.');
  });
  test('user-disabled message', () => {
    expect(getLoginErrorMessage('auth/user-disabled')).toBe('This account has been disabled.');
  });
  test('too-many-requests message', () => {
    expect(getLoginErrorMessage('auth/too-many-requests')).toBe('Too many failed attempts. Please try again later.');
  });
  test('invalid-credential message', () => {
    expect(getLoginErrorMessage('auth/invalid-credential')).toBe('Invalid email or password.');
  });
  test('unknown error returns fallback', () => {
    expect(getLoginErrorMessage('auth/unknown')).toBe('Login failed. Please try again.');
  });
});

describe('Sprint 1 US4 — Registration', () => {
  test('valid registration accepted', () => {
    expect(validateRegistrationInput('user@test.com', 'password123', 'password123').valid).toBe(true);
  });
  test('mismatched passwords fail', () => {
    const r = validateRegistrationInput('user@test.com', 'password123', 'different');
    expect(r.valid).toBe(false);
    expect(r.error).toBe('Passwords do not match');
  });
  test('invalid email fails registration', () => {
    expect(validateRegistrationInput('notvalid', 'password123', 'password123').valid).toBe(false);
  });
  test('short password fails registration', () => {
    expect(validateRegistrationInput('user@test.com', '123', '123').valid).toBe(false);
  });
  test('valid 6-digit verification code accepted', () => {
    expect(validateVerificationCode('123456')).toBe(true);
    expect(validateVerificationCode('000000')).toBe(true);
  });
  test('code with letters rejected', () => {
    expect(validateVerificationCode('abc123')).toBe(false);
  });
  test('short code rejected', () => {
    expect(validateVerificationCode('1234')).toBe(false);
  });
  test('empty code rejected', () => {
    expect(validateVerificationCode('')).toBe(false);
  });
  test('null code rejected', () => {
    expect(validateVerificationCode(null)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 2
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 2 US1 — Create Report', () => {
  test('valid report accepted', () => {
    expect(validateCreateRequest({ category: 'Pothole', description: 'Big hole' }).valid).toBe(true);
  });
  test('missing category fails', () => {
    expect(validateCreateRequest({ description: 'test' }).valid).toBe(false);
  });
  test('missing description fails', () => {
    expect(validateCreateRequest({ category: 'Pothole' }).valid).toBe(false);
  });
  test('invalid category fails', () => {
    expect(validateCreateRequest({ category: 'Aliens', description: 'test' }).valid).toBe(false);
  });
  test('all valid categories accepted', () => {
    ['Pothole', 'Water', 'Electricity', 'Waste', 'Other'].forEach(cat => {
      expect(validateCreateRequest({ category: cat, description: 'test' }).valid).toBe(true);
    });
  });
  test('oversized image fails', () => {
    const r = validateCreateRequest({ category: 'Pothole', description: 'test', image: 'x'.repeat(16 * 1024 * 1024) });
    expect(r.valid).toBe(false);
    expect(r.error).toContain('too large');
  });
});

describe('Sprint 2 US2 — Delete Account', () => {
  test('admin can delete another user', () => {
    expect(canAdminDeleteUser('admin_uid', 'user_uid', 'admin')).toBe(true);
  });
  test('admin cannot delete self', () => {
    expect(canAdminDeleteUser('admin_uid', 'admin_uid', 'admin')).toBe(false);
  });
  test('non-admin cannot delete accounts', () => {
    expect(canAdminDeleteUser('user_uid', 'other_uid', 'user')).toBe(false);
  });
  test('valid role update accepted', () => {
    expect(validateRoleUpdate('user').valid).toBe(true);
    expect(validateRoleUpdate('worker').valid).toBe(true);
    expect(validateRoleUpdate('admin').valid).toBe(true);
  });
  test('invalid role update rejected', () => {
    expect(validateRoleUpdate('superadmin').valid).toBe(false);
    expect(validateRoleUpdate('').valid).toBe(false);
  });
});

describe('Sprint 2 US3 — Delete Report', () => {
  test('owner can delete own report', () => {
    expect(canUserDelete('uid_A', 'uid_A', 'user')).toBe(true);
  });
  test('non-owner cannot delete report', () => {
    expect(canUserDelete('uid_A', 'uid_B', 'user')).toBe(false);
  });
  test('admin can delete any report', () => {
    expect(canUserDelete('uid_A', 'uid_B', 'admin')).toBe(true);
  });
});

describe('Sprint 2 US4 — Filter and Search', () => {
  const REPORTS = [
    { category: 'Pothole', description: 'Big hole',   status: 'pending'     },
    { category: 'Water',   description: 'Burst pipe', status: 'in-progress' },
    { category: 'Waste',   description: 'Full bin',   status: 'resolved'    },
    { category: 'Pothole', description: 'Crack',      status: 'resolved'    },
  ];
  test('filter by pending', () => {
    expect(applyRequestFilters(REPORTS, 'pending', '').length).toBe(1);
  });
  test('filter by resolved', () => {
    expect(applyRequestFilters(REPORTS, 'resolved', '').length).toBe(2);
  });
  test('filter by in-progress', () => {
    expect(applyRequestFilters(REPORTS, 'in-progress', '').length).toBe(1);
  });
  test('empty filter returns all', () => {
    expect(applyRequestFilters(REPORTS, '', '').length).toBe(4);
  });
  test('search by keyword in description', () => {
    expect(applyRequestFilters(REPORTS, '', 'pipe').length).toBe(1);
  });
  test('search by keyword in category', () => {
    expect(applyRequestFilters(REPORTS, '', 'pothole').length).toBe(2);
  });
  test('search with no match returns empty', () => {
    expect(applyRequestFilters(REPORTS, '', 'earthquake').length).toBe(0);
  });
  test('status and keyword combined', () => {
    expect(applyRequestFilters(REPORTS, 'resolved', 'pothole').length).toBe(1);
  });
});

describe('Sprint 2 US5 — Update Status', () => {
  test('valid statuses accepted', () => {
    expect(validateStatusUpdate('pending').valid).toBe(true);
    expect(validateStatusUpdate('in-progress').valid).toBe(true);
    expect(validateStatusUpdate('resolved').valid).toBe(true);
  });
  test('invalid status rejected', () => {
    expect(validateStatusUpdate('done').valid).toBe(false);
    expect(validateStatusUpdate('').valid).toBe(false);
  });
  test('admin can update status', () => {
    expect(canUserUpdateStatus('admin')).toBe(true);
  });
  test('worker can update status', () => {
    expect(canUserUpdateStatus('worker')).toBe(true);
  });
  test('user cannot update status', () => {
    expect(canUserUpdateStatus('user')).toBe(false);
  });
  test('admin can see all reports', () => {
    expect(canUserSeeAllReports('admin')).toBe(true);
  });
  test('worker can see all reports', () => {
    expect(canUserSeeAllReports('worker')).toBe(true);
  });
  test('user cannot see all reports', () => {
    expect(canUserSeeAllReports('user')).toBe(false);
  });
});

describe('Sprint 2 US6 — Email Notification', () => {
  test('email sent for in-progress', () => {
    expect(shouldNotifyOnStatusChange('in-progress')).toBe(true);
  });
  test('email sent for resolved', () => {
    expect(shouldNotifyOnStatusChange('resolved')).toBe(true);
  });
  test('email not sent for pending', () => {
    expect(shouldNotifyOnStatusChange('pending')).toBe(false);
  });
  test('subject includes category for resolved', () => {
    const s = buildStatusEmailSubject('resolved', 'Pothole');
    expect(s).toContain('Pothole');
    expect(s).toContain('resolved');
  });
  test('subject includes category for in-progress', () => {
    expect(buildStatusEmailSubject('in-progress', 'Water')).toContain('Water');
  });
  test('subject has fallback for unknown status', () => {
    expect(buildStatusEmailSubject('unknown', 'Waste')).toContain('Waste');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 3 US1 — Geolocation and Ward Detection
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 3 US1 — Geolocation', () => {
  test('valid SA coordinates pass', () => {
    expect(validateCoordinates(-26.2041, 28.0473).valid).toBe(true);
  });
  test('latitude above 90 fails', () => {
    expect(validateCoordinates(91, 28).valid).toBe(false);
  });
  test('latitude below -90 fails', () => {
    expect(validateCoordinates(-91, 28).valid).toBe(false);
  });
  test('longitude above 180 fails', () => {
    expect(validateCoordinates(-26, 181).valid).toBe(false);
  });
  test('longitude below -180 fails', () => {
    expect(validateCoordinates(-26, -181).valid).toBe(false);
  });
  test('non-numeric latitude fails', () => {
    expect(validateCoordinates('abc', 28).valid).toBe(false);
  });
  test('non-numeric longitude fails', () => {
    expect(validateCoordinates(-26, 'xyz').valid).toBe(false);
  });
  test('Johannesburg is within SA', () => {
    expect(isCoordinateWithinSouthAfrica(-26.2041, 28.0473)).toBe(true);
  });
  test('Cape Town is within SA', () => {
    expect(isCoordinateWithinSouthAfrica(-33.9249, 18.4241)).toBe(true);
  });
  test('Durban is within SA', () => {
    expect(isCoordinateWithinSouthAfrica(-29.8587, 31.0218)).toBe(true);
  });
  test('London is outside SA', () => {
    expect(isCoordinateWithinSouthAfrica(51.5074, -0.1278)).toBe(false);
  });
  test('New York is outside SA', () => {
    expect(isCoordinateWithinSouthAfrica(40.7128, -74.006)).toBe(false);
  });
  test('buildLocationData with wardInfo', () => {
    const r = buildLocationData(-26.2041, 28.0473, { ward: 'Ward 5', wardNo: 5, municipality: 'CoJ', province: 'Gauteng' });
    expect(r.latitude).toBe(-26.2041);
    expect(r.ward).toBe('Ward 5');
    expect(r.municipality).toBe('CoJ');
    expect(r.province).toBe('Gauteng');
  });
  test('buildLocationData with null wardInfo', () => {
    const r = buildLocationData(-26.2041, 28.0473, null);
    expect(r.ward).toBeNull();
    expect(r.municipality).toBeNull();
  });
  test('formatWardDisplay both values', () => {
    expect(formatWardDisplay('Ward 5', 'CoJ')).toBe('Ward 5, CoJ');
  });
  test('formatWardDisplay only ward', () => {
    expect(formatWardDisplay('Ward 5', null)).toBe('Ward 5');
  });
  test('formatWardDisplay only municipality', () => {
    expect(formatWardDisplay(null, 'CoJ')).toBe('CoJ');
  });
  test('formatWardDisplay neither returns unknown', () => {
    expect(formatWardDisplay(null, null)).toBe('Location unknown');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 3 US2 — Public Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 3 US2 — Public Dashboard', () => {
  test('pending visible to public', () => {
    expect(isReportVisibleToPublic({ status: 'pending' })).toBe(true);
  });
  test('in-progress visible to public', () => {
    expect(isReportVisibleToPublic({ status: 'in-progress' })).toBe(true);
  });
  test('resolved visible to public', () => {
    expect(isReportVisibleToPublic({ status: 'resolved' })).toBe(true);
  });
  test('draft not visible to public', () => {
    expect(isReportVisibleToPublic({ status: 'draft' })).toBe(false);
  });
  test('empty status not visible', () => {
    expect(isReportVisibleToPublic({ status: '' })).toBe(false);
  });
  test('sanitisePublicReport removes userEmail', () => {
    const r = sanitisePublicReport({ id: '1', category: 'Pothole', status: 'pending', description: 'hole', userEmail: 'private@test.com' });
    expect(r).not.toHaveProperty('userEmail');
    expect(r).toHaveProperty('category');
  });
  test('sanitisePublicReport truncates description to 100 chars', () => {
    const r = sanitisePublicReport({ category: 'Water', status: 'pending', description: 'x'.repeat(200) });
    expect(r.description.length).toBe(100);
  });
  test('sanitisePublicReport keeps short description', () => {
    const r = sanitisePublicReport({ category: 'Water', status: 'pending', description: 'Short' });
    expect(r.description).toBe('Short');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 3 US3 — Assign and Priority
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 3 US3 — Assign and Priority', () => {
  test('admin can assign requests', () => {
    expect(canAssignToWorker('admin')).toBe(true);
  });
  test('worker cannot assign', () => {
    expect(canAssignToWorker('worker')).toBe(false);
  });
  test('user cannot assign', () => {
    expect(canAssignToWorker('user')).toBe(false);
  });
  test('low priority valid', () => {
    expect(validatePriority('low').valid).toBe(true);
  });
  test('medium priority valid', () => {
    expect(validatePriority('medium').valid).toBe(true);
  });
  test('high priority valid', () => {
    expect(validatePriority('high').valid).toBe(true);
  });
  test('invalid priority rejected', () => {
    const r = validatePriority('urgent');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('low, medium, or high');
  });
  test('empty priority rejected', () => {
    expect(validatePriority('').valid).toBe(false);
  });
  test('only admin can set priority', () => {
    expect(canSetPriority('admin')).toBe(true);
    expect(canSetPriority('worker')).toBe(false);
    expect(canSetPriority('user')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 3 US4 — Worker Claim Request
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 3 US4 — Worker Claim', () => {
  test('worker can claim', () => {
    expect(canClaimRequest('worker')).toBe(true);
  });
  test('admin cannot claim', () => {
    expect(canClaimRequest('admin')).toBe(false);
  });
  test('user cannot claim', () => {
    expect(canClaimRequest('user')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 3 US5 — Satisfaction Feedback
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 3 US5 — Satisfaction Feedback', () => {
  const resolved = { userId: 'user_A', status: 'resolved', feedback: null };
  test('rating 1 valid', () => {
    expect(validateFeedback(1, resolved, 'user_A').valid).toBe(true);
  });
  test('rating 5 valid', () => {
    expect(validateFeedback(5, resolved, 'user_A').valid).toBe(true);
  });
  test('rating 3 valid', () => {
    expect(validateFeedback(3, resolved, 'user_A').valid).toBe(true);
  });
  test('rating 0 rejected', () => {
    expect(validateFeedback(0, resolved, 'user_A').valid).toBe(false);
  });
  test('rating 6 rejected', () => {
    const r = validateFeedback(6, resolved, 'user_A');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('between 1 and 5');
  });
  test('non-owner rejected', () => {
    const r = validateFeedback(4, resolved, 'user_B');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('own reports');
  });
  test('pending report rejected', () => {
    const r = validateFeedback(4, { userId: 'user_A', status: 'pending', feedback: null }, 'user_A');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('resolved');
  });
  test('in-progress report rejected', () => {
    expect(validateFeedback(4, { userId: 'user_A', status: 'in-progress', feedback: null }, 'user_A').valid).toBe(false);
  });
  test('cannot submit twice', () => {
    const r = validateFeedback(4, { userId: 'user_A', status: 'resolved', feedback: { rating: 5 } }, 'user_A');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('already been submitted');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 3 US6 — Analytics and CSV Export
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 3 US6 — Analytics and CSV', () => {
  const AR = [
    { id: '1', category: 'Pothole',     status: 'pending',     assignedTo: null,      priority: 'high',   ward: 'Ward 1', municipality: 'CoJ', userEmail: 'a@b.com', createdAt: '01/05/2026', description: 'Hole'     },
    { id: '2', category: 'Water',       status: 'resolved',    assignedTo: 'worker1', priority: 'medium', ward: 'Ward 2', municipality: 'CoJ', userEmail: 'b@c.com', createdAt: '02/05/2026', description: 'Pipe'     },
    { id: '3', category: 'Pothole',     status: 'in-progress', assignedTo: 'worker1', priority: 'low',    ward: 'Ward 3', municipality: 'CoJ', userEmail: 'c@d.com', createdAt: '03/05/2026', description: 'Crack'    },
    { id: '4', category: 'Electricity', status: 'resolved',    assignedTo: 'worker2', priority: 'high',   ward: 'Ward 4', municipality: 'CoJ', userEmail: 'd@e.com', createdAt: '04/05/2026', description: 'No power' },
    { id: '5', category: 'Waste',       status: 'pending',     assignedTo: null,      priority: 'low',    ward: 'Ward 5', municipality: 'CoJ', userEmail: 'e@f.com', createdAt: '05/05/2026', description: 'Bin full' },
  ];
  test('total request count', () => {
    expect(calculateAnalytics(AR).totalRequests).toBe(5);
  });
  test('counts Pothole correctly', () => {
    expect(calculateAnalytics(AR).byCategory['Pothole']).toBe(2);
  });
  test('counts Water correctly', () => {
    expect(calculateAnalytics(AR).byCategory['Water']).toBe(1);
  });
  test('counts pending status', () => {
    expect(calculateAnalytics(AR).byStatus['pending']).toBe(2);
  });
  test('counts resolved status', () => {
    expect(calculateAnalytics(AR).byStatus['resolved']).toBe(2);
  });
  test('counts in-progress status', () => {
    expect(calculateAnalytics(AR).byStatus['in-progress']).toBe(1);
  });
  test('worker1 assigned count', () => {
    expect(calculateAnalytics(AR).workerPerformance['worker1'].assigned).toBe(2);
  });
  test('worker1 resolved count', () => {
    expect(calculateAnalytics(AR).workerPerformance['worker1'].resolved).toBe(1);
  });
  test('worker2 counts', () => {
    expect(calculateAnalytics(AR).workerPerformance['worker2'].assigned).toBe(1);
    expect(calculateAnalytics(AR).workerPerformance['worker2'].resolved).toBe(1);
  });
  test('resolution rate 40%', () => {
    expect(calculateAnalytics(AR).resolutionRate).toBe(40);
  });
  test('empty array returns 0', () => {
    const r = calculateAnalytics([]);
    expect(r.totalRequests).toBe(0);
    expect(r.resolutionRate).toBe(0);
  });
  test('buildCSVRow produces string', () => {
    const row = buildCSVRow(AR[0]);
    expect(typeof row).toBe('string');
    expect(row).toContain('Pothole');
    expect(row).toContain('high');
    expect(row).toContain('Ward 1');
  });
  test('buildCSVRow missing priority shows none', () => {
    expect(buildCSVRow({ id: '1', category: 'Water', description: 'test', status: 'pending' })).toContain('none');
  });
  test('buildCSVRow escapes quotes', () => {
    expect(buildCSVRow({ ...AR[0], description: 'Pipe "broken" badly' })).toContain('""');
  });
  test('buildFullCSV has header', () => {
    const csv = buildFullCSV(AR);
    expect(csv).toContain('Category');
    expect(csv).toContain('Status');
    expect(csv).toContain('Priority');
  });
  test('buildFullCSV has data', () => {
    const csv = buildFullCSV(AR);
    expect(csv).toContain('Pothole');
    expect(csv).toContain('Water');
  });
  test('buildFullCSV empty array returns only header', () => {
    const lines = buildFullCSV([]).split('\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('Category');
  });
});
// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 4 US1 — Escalate an Unresolved Service Request
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 4 US1 — canEscalateRequest', () => {
  const base = { userId: 'user_A', status: 'pending', escalated: false };

  // ── Equivalence classes: who can escalate ────────────────────────────────
  test('owner can escalate a pending request', () => {
    expect(canEscalateRequest(base, 'user_A').valid).toBe(true);
  });
  test('owner can escalate an in-progress request', () => {
    expect(canEscalateRequest({ ...base, status: 'in-progress' }, 'user_A').valid).toBe(true);
  });
  test('different user cannot escalate', () => {
    const r = canEscalateRequest(base, 'user_B');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('own');
  });
  test('worker cannot escalate a resident request', () => {
    expect(canEscalateRequest(base, 'worker_uid').valid).toBe(false);
  });

  // ── Boundary: escalation state ───────────────────────────────────────────
  test('already-escalated request is rejected', () => {
    const r = canEscalateRequest({ ...base, escalated: true }, 'user_A');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('already');
  });
  test('resolved request cannot be escalated', () => {
    const r = canEscalateRequest({ ...base, status: 'resolved' }, 'user_A');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('resolved');
  });
});

describe('Sprint 4 US1 — validateEscalationReason (boundary testing)', () => {
  // ── Equivalence class: optional field ───────────────────────────────────
  test('undefined reason is valid (field optional)', () => {
    expect(validateEscalationReason(undefined).valid).toBe(true);
  });
  test('null reason is valid', () => {
    expect(validateEscalationReason(null).valid).toBe(true);
  });
  test('empty string reason is valid', () => {
    expect(validateEscalationReason('').valid).toBe(true);
  });

  // ── Equivalence class: valid string ─────────────────────────────────────
  test('short reason is valid', () => {
    expect(validateEscalationReason('Still not fixed after 2 weeks').valid).toBe(true);
  });
  test('reason at exactly 200 chars is valid (upper boundary)', () => {
    expect(validateEscalationReason('a'.repeat(200)).valid).toBe(true);
  });

  // ── Boundary: too long ───────────────────────────────────────────────────
  test('reason at 201 chars is invalid (one over boundary)', () => {
    const r = validateEscalationReason('a'.repeat(201));
    expect(r.valid).toBe(false);
    expect(r.error).toContain('200');
  });
  test('reason of 500 chars is invalid', () => {
    expect(validateEscalationReason('a'.repeat(500)).valid).toBe(false);
  });

  // ── Equivalence class: wrong type ───────────────────────────────────────
  test('numeric reason is invalid', () => {
    expect(validateEscalationReason(42).valid).toBe(false);
  });
  test('whitespace-only reason is invalid', () => {
    expect(validateEscalationReason('   ').valid).toBe(false);
  });
});

describe('Sprint 4 US1 — buildEscalationPayload', () => {
  test('sets escalated to true', () => {
    expect(buildEscalationPayload('reason').escalated).toBe(true);
  });
  test('stores escalation reason', () => {
    expect(buildEscalationPayload('Road is dangerous').escalationReason).toBe('Road is dangerous');
  });
  test('no reason stores null', () => {
    expect(buildEscalationPayload('').escalationReason).toBeNull();
  });
  test('includes escalatedAt timestamp', () => {
    const before = Date.now();
    expect(buildEscalationPayload('').escalatedAt).toBeGreaterThanOrEqual(before);
  });
  test('does not mutate any external state', () => {
    const p1 = buildEscalationPayload('A');
    const p2 = buildEscalationPayload('B');
    expect(p1.escalationReason).toBe('A');
    expect(p2.escalationReason).toBe('B');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 4 US2 — Escalated Request Highlighting on Public Map
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 4 US2 — getMarkerColour', () => {
  // ── Equivalence class: normal status colours ──────────────────────────────
  test('pending → orange marker', () => {
    expect(getMarkerColour('pending', false)).toBe('orange');
  });
  test('in-progress → blue marker', () => {
    expect(getMarkerColour('in-progress', false)).toBe('blue');
  });
  test('resolved → green marker', () => {
    expect(getMarkerColour('resolved', false)).toBe('green');
  });
  test('unknown status → grey fallback', () => {
    expect(getMarkerColour('draft', false)).toBe('grey');
  });
  test('empty status → grey fallback', () => {
    expect(getMarkerColour('', false)).toBe('grey');
  });

  // ── Equivalence class: escalated overrides all statuses ──────────────────
  test('escalated pending → red', () => {
    expect(getMarkerColour('pending', true)).toBe('red');
  });
  test('escalated in-progress → red', () => {
    expect(getMarkerColour('in-progress', true)).toBe('red');
  });
  test('escalated resolved → red', () => {
    expect(getMarkerColour('resolved', true)).toBe('red');
  });
  test('escalated unknown status → red', () => {
    expect(getMarkerColour('draft', true)).toBe('red');
  });

  // ── Boundary: default escalated parameter ────────────────────────────────
  test('escalated defaults to false when omitted', () => {
    expect(getMarkerColour('pending')).toBe('orange');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 4 US3 — Release (Unclaim) a Previously Claimed Request
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 4 US3 — canUnclaimRequest', () => {
  const claimed = { assignedTo: 'worker_A', claimedAt: Date.now(), status: 'in-progress', userId: 'user_X' };

  // ── Equivalence class: valid unclaim ─────────────────────────────────────
  test('assigned worker can unclaim their own request', () => {
    expect(canUnclaimRequest(claimed, 'worker_A').valid).toBe(true);
  });

  // ── Equivalence class: wrong worker ──────────────────────────────────────
  test('different worker cannot unclaim', () => {
    const r = canUnclaimRequest(claimed, 'worker_B');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('claimed');
  });

  // ── Equivalence class: not yet claimed ───────────────────────────────────
  test('unclaimed request (no assignedTo) cannot be unclaimed', () => {
    const r = canUnclaimRequest({ assignedTo: null, claimedAt: null, status: 'pending' }, 'worker_A');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('not been claimed');
  });
  test('request with assignedTo but no claimedAt cannot be unclaimed', () => {
    const r = canUnclaimRequest({ assignedTo: 'worker_A', claimedAt: null, status: 'pending' }, 'worker_A');
    expect(r.valid).toBe(false);
  });

  // ── Boundary: resolved requests ──────────────────────────────────────────
  test('resolved request cannot be unclaimed', () => {
    const r = canUnclaimRequest({ ...claimed, status: 'resolved' }, 'worker_A');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('resolved');
  });

  // ── Boundary: null workerUid ─────────────────────────────────────────────
  test('null workerUid cannot unclaim', () => {
    expect(canUnclaimRequest(claimed, null).valid).toBe(false);
  });
  test('undefined workerUid cannot unclaim', () => {
    expect(canUnclaimRequest(claimed, undefined).valid).toBe(false);
  });
});

describe('Sprint 4 US3 — buildUnclaimPayload', () => {
  test('sets assignedTo to null', () => {
    expect(buildUnclaimPayload().assignedTo).toBeNull();
  });
  test('sets claimedAt to null', () => {
    expect(buildUnclaimPayload().claimedAt).toBeNull();
  });
  test('reverts status to pending', () => {
    expect(buildUnclaimPayload().status).toBe('pending');
  });
  test('includes unclaimedAt timestamp', () => {
    const before = Date.now();
    expect(buildUnclaimPayload().unclaimedAt).toBeGreaterThanOrEqual(before);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 4 US4 — Duplicate Detection
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 4 US4 — haversineDistanceKm (boundary cases)', () => {
  test('same point returns 0 km', () => {
    expect(haversineDistanceKm(-26.2041, 28.0473, -26.2041, 28.0473)).toBeCloseTo(0, 3);
  });
  test('Joburg CBD to Sandton (~22 km) is > 0', () => {
    expect(haversineDistanceKm(-26.2041, 28.0473, -26.1076, 28.0567)).toBeGreaterThan(5);
  });
  test('adjacent points within 500 m are < 0.5 km', () => {
    // ~100 m apart
    expect(haversineDistanceKm(-26.2041, 28.0473, -26.2050, 28.0473)).toBeLessThan(0.5);
  });
  test('distance is always non-negative', () => {
    expect(haversineDistanceKm(-33.9, 18.4, -26.2, 28.0)).toBeGreaterThan(0);
  });
  test('result is symmetric (A→B equals B→A)', () => {
    const ab = haversineDistanceKm(-26.2, 28.0, -29.8, 31.0);
    const ba = haversineDistanceKm(-29.8, 31.0, -26.2, 28.0);
    expect(ab).toBeCloseTo(ba, 5);
  });
});

describe('Sprint 4 US4 — isWithinTimeWindow (boundary cases)', () => {
  const ONE_HOUR = 3_600_000;

  test('same timestamp is within window', () => {
    const now = Date.now();
    expect(isWithinTimeWindow(now, now, 24)).toBe(true);
  });
  test('exactly at window boundary is within (inclusive)', () => {
    const now = Date.now();
    expect(isWithinTimeWindow(now, now - 24 * ONE_HOUR, 24)).toBe(true);
  });
  test('one ms beyond boundary is outside window', () => {
    const now = Date.now();
    expect(isWithinTimeWindow(now, now - 24 * ONE_HOUR - 1, 24)).toBe(false);
  });
  test('within 1-hour window passes', () => {
    const now = Date.now();
    expect(isWithinTimeWindow(now, now - 30 * 60_000, 1)).toBe(true);
  });
  test('beyond 1-hour window fails', () => {
    const now = Date.now();
    expect(isWithinTimeWindow(now, now - 2 * ONE_HOUR, 1)).toBe(false);
  });
  test('works in either time direction (order independent)', () => {
    const t = Date.now();
    expect(isWithinTimeWindow(t - ONE_HOUR, t, 24)).toBe(true);
    expect(isWithinTimeWindow(t, t - ONE_HOUR, 24)).toBe(true);
  });
});

describe('Sprint 4 US4 — findPotentialDuplicates', () => {
  const NOW = Date.now();
  const ONE_HOUR = 3_600_000;

  const existing = [
    // Same category, nearby, recent — DUPLICATE
    { id: 'r1', category: 'Pothole', latitude: -26.2050, longitude: 28.0474, createdAtMs: NOW - ONE_HOUR },
    // Same category, too far away — NOT duplicate
    { id: 'r2', category: 'Pothole', latitude: -26.3000, longitude: 28.1000, createdAtMs: NOW - ONE_HOUR },
    // Different category, nearby — NOT duplicate
    { id: 'r3', category: 'Water',   latitude: -26.2050, longitude: 28.0474, createdAtMs: NOW - ONE_HOUR },
    // Same category, nearby, too old — NOT duplicate
    { id: 'r4', category: 'Pothole', latitude: -26.2050, longitude: 28.0474, createdAtMs: NOW - 30 * ONE_HOUR },
  ];

  const newReport = {
    category:    'Pothole',
    latitude:    -26.2041,
    longitude:   28.0473,
    createdAtMs: NOW,
  };

  test('finds one nearby same-category recent report', () => {
    const dups = findPotentialDuplicates(newReport, existing);
    expect(dups).toHaveLength(1);
    expect(dups[0].id).toBe('r1');
  });
  test('far-away same-category report is not a duplicate', () => {
    const dups = findPotentialDuplicates(newReport, existing);
    expect(dups.map(d => d.id)).not.toContain('r2');
  });
  test('nearby different-category report is not a duplicate', () => {
    const dups = findPotentialDuplicates(newReport, existing);
    expect(dups.map(d => d.id)).not.toContain('r3');
  });
  test('nearby same-category but too old is not a duplicate', () => {
    const dups = findPotentialDuplicates(newReport, existing);
    expect(dups.map(d => d.id)).not.toContain('r4');
  });
  test('returns empty array when no existing reports', () => {
    expect(findPotentialDuplicates(newReport, [])).toHaveLength(0);
  });
  test('returns empty array when new report has no coordinates', () => {
    expect(findPotentialDuplicates({ category: 'Pothole' }, existing)).toHaveLength(0);
  });
  test('ignores existing reports with non-numeric coordinates', () => {
    const weird = [{ id: 'r9', category: 'Pothole', latitude: 'bad', longitude: 'bad', createdAtMs: NOW }];
    expect(findPotentialDuplicates(newReport, weird)).toHaveLength(0);
  });
  test('multiple duplicates are all returned', () => {
    const extra = [
      { id: 'r5', category: 'Pothole', latitude: -26.2043, longitude: 28.0471, createdAtMs: NOW - ONE_HOUR },
      { id: 'r6', category: 'Pothole', latitude: -26.2045, longitude: 28.0472, createdAtMs: NOW - 2 * ONE_HOUR },
    ];
    expect(findPotentialDuplicates(newReport, [...existing, ...extra]).length).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 4 US5 (Bonus) — Dark Mode Support
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 4 US5 (Bonus) — Dark mode helpers', () => {
  // ── isValidTheme ─────────────────────────────────────────────────────────
  test('"light" is a valid theme', () => {
    expect(isValidTheme('light')).toBe(true);
  });
  test('"dark" is a valid theme', () => {
    expect(isValidTheme('dark')).toBe(true);
  });
  test('empty string is not a valid theme', () => {
    expect(isValidTheme('')).toBe(false);
  });
  test('"auto" is not a supported theme', () => {
    expect(isValidTheme('auto')).toBe(false);
  });
  test('null is not a valid theme', () => {
    expect(isValidTheme(null)).toBe(false);
  });

  // ── toggleTheme ──────────────────────────────────────────────────────────
  test('toggling dark returns light', () => {
    expect(toggleTheme('dark')).toBe('light');
  });
  test('toggling light returns dark', () => {
    expect(toggleTheme('light')).toBe('dark');
  });
  test('toggling twice returns original', () => {
    expect(toggleTheme(toggleTheme('dark'))).toBe('dark');
  });

  // ── getThemeClass ────────────────────────────────────────────────────────
  test('dark theme returns "dark-mode" class', () => {
    expect(getThemeClass('dark')).toBe('dark-mode');
  });
  test('light theme returns "light-mode" class', () => {
    expect(getThemeClass('light')).toBe('light-mode');
  });
  test('unknown theme defaults to light-mode class', () => {
    expect(getThemeClass('system')).toBe('light-mode');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 4 — Constants validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 4 — Duplicate detection constants', () => {
  test('DUPLICATE_RADIUS_KM is 0.5 (500 m)', () => {
    expect(DUPLICATE_RADIUS_KM).toBe(0.5);
  });
  test('DUPLICATE_TIME_WINDOW_H is 24 hours', () => {
    expect(DUPLICATE_TIME_WINDOW_H).toBe(24);
  });
});