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
