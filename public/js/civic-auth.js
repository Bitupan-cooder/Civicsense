/**
 * CivicSense Authentication and Role Management Engine
 * Supabase Auth integration with role guards, rate limiting, and forced password change
 */
(function (global) {
  'use strict';

  var SUPABASE_URL = 'https://mdywamyrxuuookaxksyv.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_97gBSZ3CLy6r0E3thRZ85Q_b7xyQxj_';

  var client = null;
  var currentProfile = null;
  var currentSession = null;

  // ── RATE LIMITER CONFIGURATION ─────────────────────────────────
  var RATE_LIMIT_KEY_PREFIX = 'civic_ratelimit_';
  var MAX_FAILED_ATTEMPTS = 5;
  var LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  function getRateLimitState(email) {
    try {
      var key = RATE_LIMIT_KEY_PREFIX + (email || 'global').toLowerCase().trim();
      var raw = localStorage.getItem(key);
      if (!raw) return { count: 0, lockedUntil: 0 };
      var data = JSON.parse(raw);
      var now = Date.now();
      if (data.lockedUntil && now > data.lockedUntil) {
        localStorage.removeItem(key);
        return { count: 0, lockedUntil: 0 };
      }
      return data;
    } catch (e) {
      return { count: 0, lockedUntil: 0 };
    }
  }

  function recordFailedAttempt(email) {
    try {
      var key = RATE_LIMIT_KEY_PREFIX + (email || 'global').toLowerCase().trim();
      var state = getRateLimitState(email);
      var now = Date.now();
      state.count = (state.count || 0) + 1;
      state.lastAttempt = now;
      if (state.count >= MAX_FAILED_ATTEMPTS) {
        state.lockedUntil = now + LOCKOUT_DURATION_MS;
      }
      localStorage.setItem(key, JSON.stringify(state));
      return state;
    } catch (e) {
      return { count: 1, lockedUntil: 0 };
    }
  }

  function clearRateLimit(email) {
    try {
      var key = RATE_LIMIT_KEY_PREFIX + (email || 'global').toLowerCase().trim();
      localStorage.removeItem(key);
    } catch (e) {}
  }

  function checkRateLimit(email) {
    var state = getRateLimitState(email);
    var now = Date.now();
    if (state.lockedUntil && state.lockedUntil > now) {
      var remainingMin = Math.ceil((state.lockedUntil - now) / 60000);
      return {
        allowed: false,
        error: 'Too many failed login attempts. Account temporarily locked for ' + remainingMin + ' minute(s).'
      };
    }
    return { allowed: true };
  }

  // ── CLIENT INITIALIZATION ─────────────────────────────────────
  function getClient() {
    if (!client) {
      if (typeof global.supabase !== 'undefined' && global.supabase.createClient) {
        client = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
      } else {
        console.error('Supabase library not loaded. Ensure supabase-js script is included.');
      }
    }
    return client;
  }

  // ── PROFILE RETRIEVAL ─────────────────────────────────────────
  async function fetchProfile(userId) {
    var sb = getClient();
    if (!sb) return null;
    var res = await sb
      .from('profiles')
      .select('id, role, name, email, unit_name, must_change_password, is_active, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (res.error) {
      console.error('Failed to load profile:', res.error);
      return null;
    }
    return res.data;
  }

  // ── CORE LOGIN HANDLER ────────────────────────────────────────
  async function login(email, password, expectedRoles) {
    var normalizedEmail = (email || '').trim().toLowerCase();
    var rate = checkRateLimit(normalizedEmail);
    if (!rate.allowed) {
      throw new Error(rate.error);
    }

    var sb = getClient();
    if (!sb) throw new Error('Authentication service unavailable.');

    var authResult = await sb.auth.signInWithPassword({
      email: normalizedEmail,
      password: password
    });

    if (authResult.error) {
      recordFailedAttempt(normalizedEmail);
      throw new Error(authResult.error.message || 'Invalid email or password.');
    }

    var user = authResult.data.user;
    var profile = await fetchProfile(user.id);

    if (!profile) {
      recordFailedAttempt(normalizedEmail);
      await sb.auth.signOut();
      throw new Error('Authorized profile not found for this account.');
    }

    if (!profile.is_active) {
      recordFailedAttempt(normalizedEmail);
      await sb.auth.signOut();
      throw new Error('This account has been deactivated by the administration.');
    }

    // Role check against expected roles for the specific portal entry
    if (expectedRoles && expectedRoles.length > 0) {
      var isAllowed = expectedRoles.indexOf(profile.role) !== -1;
      if (!isAllowed) {
        recordFailedAttempt(normalizedEmail);
        await sb.auth.signOut();
        throw new Error('Unauthorized role access. This portal requires: ' + expectedRoles.join(' or ') + '.');
      }
    }

    clearRateLimit(normalizedEmail);
    currentSession = authResult.data.session;
    currentProfile = profile;

    // Log login activity
    try {
      await sb.from('activity_log').insert({
        actor_id: user.id,
        action: 'user_login',
        target: profile.role + ' login via ' + window.location.pathname
      });
    } catch (logErr) {
      // Non-blocking log write
    }

    return { user: user, profile: profile, session: currentSession };
  }

  // ── PASSWORD CHANGE HANDLER ───────────────────────────────────
  async function changePassword(newPassword) {
    var sb = getClient();
    if (!sb) throw new Error('Supabase client unavailable.');

    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    var updateRes = await sb.auth.updateUser({
      password: newPassword
    });

    if (updateRes.error) {
      throw new Error(updateRes.error.message);
    }

    var user = updateRes.data.user;
    var profileRes = await sb
      .from('profiles')
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (profileRes.error) {
      console.warn('Could not reset must_change_password flag:', profileRes.error);
    }

    if (currentProfile) {
      currentProfile.must_change_password = false;
    }

    try {
      await sb.from('activity_log').insert({
        actor_id: user.id,
        action: 'password_change',
        target: 'Initial temporary password replaced with permanent password'
      });
    } catch (e) {}

    return true;
  }

  // ── LOGOUT ────────────────────────────────────────────────────
  async function logout() {
    var sb = getClient();
    if (sb) {
      await sb.auth.signOut();
    }
    currentProfile = null;
    currentSession = null;
  }

  // ── ROLE GUARD ────────────────────────────────────────────────
  async function enforceRoleGuard(options) {
    options = options || {};
    var allowedRoles = options.allowedRoles || [];
    var redirectUrl = options.redirectUrl || 'index.html';
    var onAllowed = options.onAllowed;
    var onDenied = options.onDenied;

    var sb = getClient();
    if (!sb) return false;

    var sessionRes = await sb.auth.getSession();
    var session = sessionRes.data ? sessionRes.data.session : null;

    if (!session || !session.user) {
      if (onDenied) onDenied('unauthenticated');
      else window.location.href = redirectUrl;
      return false;
    }

    var profile = await fetchProfile(session.user.id);
    if (!profile || !profile.is_active) {
      await sb.auth.signOut();
      if (onDenied) onDenied('inactive');
      else window.location.href = redirectUrl;
      return false;
    }

    currentProfile = profile;
    currentSession = session;

    if (allowedRoles.length > 0 && allowedRoles.indexOf(profile.role) === -1) {
      if (onDenied) onDenied('forbidden', profile);
      else window.location.href = redirectUrl;
      return false;
    }

    if (onAllowed) onAllowed(profile, session);
    return true;
  }

  // ── FORCED PASSWORD CHANGE DIALOG (INSTITUTIONAL UI) ───────────
  function ensurePasswordChangeModal() {
    var existing = document.getElementById('forcePasswordModal');
    if (existing) return existing;

    var modal = document.createElement('div');
    modal.id = 'forcePasswordModal';
    modal.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:rgba(18,20,16,0.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;';

    modal.innerHTML =
      '<div style="background:#ffffff;border:1.5px solid #1a7a3a;border-radius:16px;max-width:460px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,0.2);overflow:hidden;">' +
      '  <div style="background:#1a7a3a;color:#ffffff;padding:16px 20px;font-weight:700;font-size:15px;letter-spacing:-0.01em;">' +
      '    Security Notice: Set Permanent Password' +
      '  </div>' +
      '  <div style="padding:22px 20px;">' +
      '    <p style="font-size:13px;color:#334155;line-height:1.5;margin-bottom:16px;">' +
      '      Your account was provisioned with a temporary password by administration. You must set a personal password before accessing campus records.' +
      '    </p>' +
      '    <div style="margin-bottom:14px;">' +
      '      <label style="display:block;font-size:12px;font-weight:700;color:#1a7a3a;margin-bottom:6px;text-transform:uppercase;">New Password</label>' +
      '      <input type="password" id="forceNewPw" placeholder="Minimum 8 characters" style="width:100%;height:40px;padding:0 12px;border:1.5px solid #e0f0d0;border-radius:8px;font-size:13.5px;box-sizing:border-box;" />' +
      '    </div>' +
      '    <div style="margin-bottom:16px;">' +
      '      <label style="display:block;font-size:12px;font-weight:700;color:#1a7a3a;margin-bottom:6px;text-transform:uppercase;">Confirm New Password</label>' +
      '      <input type="password" id="forceConfirmPw" placeholder="Re-enter password" style="width:100%;height:40px;padding:0 12px;border:1.5px solid #e0f0d0;border-radius:8px;font-size:13.5px;box-sizing:border-box;" />' +
      '    </div>' +
      '    <div id="forcePwError" style="display:none;color:#b91c1c;font-size:12px;font-weight:600;margin-bottom:14px;"></div>' +
      '    <button id="forcePwSubmitBtn" style="width:100%;height:42px;background:#1a7a3a;color:#ffffff;border:none;border-radius:8px;font-size:13.5px;font-weight:700;cursor:pointer;">' +
      '      Update Password and Continue' +
      '    </button>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(modal);

    var btn = modal.querySelector('#forcePwSubmitBtn');
    btn.onclick = async function () {
      var p1 = modal.querySelector('#forceNewPw').value;
      var p2 = modal.querySelector('#forceConfirmPw').value;
      var errBox = modal.querySelector('#forcePwError');

      if (!p1 || p1.length < 8) {
        errBox.style.display = 'block';
        errBox.textContent = 'Password must be at least 8 characters long.';
        return;
      }
      if (p1 !== p2) {
        errBox.style.display = 'block';
        errBox.textContent = 'Passwords do not match.';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Updating password...';
      errBox.style.display = 'none';

      try {
        await changePassword(p1);
        modal.parentNode.removeChild(modal);
        if (typeof global.showToast === 'function') {
          global.showToast('Password updated successfully.', 'success');
        }
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Update Password and Continue';
        errBox.style.display = 'block';
        errBox.textContent = err.message || 'Failed to update password.';
      }
    };

    return modal;
  }

  // ── CLOUDINARY AUTHENTICATED UPLOAD ─────────────────────────
  async function uploadIdCardToCloudinary(file) {
    if (!file) throw new Error('Student ID card file is required.');

    var MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      throw new Error('ID card file size exceeds the 5 MB limit. Please select a file under 5 MB.');
    }

    var allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.indexOf(file.type) === -1 && !file.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i)) {
      throw new Error('Invalid file format. Only JPG, PNG, WEBP, or PDF student ID cards are accepted.');
    }

    var signRes = await fetch('/api/cloudinary/sign-upload', {
      method: 'POST',
      headers: await getAdminAuthHeader()
    });

    if (!signRes.ok) {
      var errData = await signRes.json().catch(function() { return {}; });
      throw new Error(errData.error || 'Server rejected upload signature request.');
    }

    var signData = await signRes.json();

    var formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signData.apiKey);
    formData.append('timestamp', signData.timestamp);
    formData.append('signature', signData.signature);
    formData.append('folder', signData.folder);
    formData.append('type', signData.type);

    var uploadUrl = 'https://api.cloudinary.com/v1_1/' + signData.cloudName + '/auto/upload';
    var cldRes = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!cldRes.ok) {
      var cldErr = await cldRes.json().catch(function() { return {}; });
      throw new Error((cldErr.error && cldErr.error.message) || 'Failed to upload ID card to storage.');
    }

    var cldData = await cldRes.json();
    return {
      public_id: cldData.public_id,
      format: cldData.format
    };
  }

  // ── STUDENT SIGNUP WITH ID CARD ─────────────────────────────
  async function signUpStudent(options) {
    var name = (options.name || '').trim();
    var email = (options.email || '').trim().toLowerCase();
    var password = options.password || '';
    var file = options.file;

    if (!name || name.length < 2) {
      throw new Error('Please enter your full name as printed on your university ID.');
    }
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid student email address.');
    }
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (!file) {
      throw new Error('Please attach your student ID card image or PDF (max 5 MB).');
    }

    var rate = checkRateLimit('signup_' + email);
    if (!rate.allowed) {
      throw new Error(rate.error);
    }

    var sb = getClient();
    if (!sb) throw new Error('Database connection unavailable.');

    // 1. Sign up user with Supabase Auth (the upload signature below requires a signed-in session)
    var authRes = await sb.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { name: name, role: 'student' }
      }
    });

    if (authRes.error) {
      recordFailedAttempt('signup_' + email);
      throw new Error(authRes.error.message);
    }

    var user = authRes.data.user;
    if (!user) {
      throw new Error('Registration failed. Please try again.');
    }
    if (!authRes.data.session) {
      // Email confirmation is on: profile and ID card rows need a session (RLS), so they can't be created yet.
      throw new Error('Account created, but no session was returned because email confirmation is enabled in Supabase. Registration needs "Confirm email" turned off (Supabase -> Authentication -> Providers -> Email).');
    }

    // 2. Upload ID card to Cloudinary (authenticated type)
    var uploadResult = await uploadIdCardToCloudinary(file);
    var cloudinaryPublicId = uploadResult.public_id;

    // 3. Insert row into profiles table
    var profileRes = await sb.from('profiles').insert({
      id: user.id,
      role: 'student',
      name: name,
      email: email,
      unit_name: null,
      must_change_password: false,
      is_active: true
    });

    if (profileRes.error) {
      console.error('Failed to create student profile:', profileRes.error);
    }

    // 4. Insert row into id_cards table (storing only public_id)
    var idCardRes = await sb.from('id_cards').insert({
      user_id: user.id,
      cloudinary_public_id: cloudinaryPublicId,
      status: 'pending'
    });

    if (idCardRes.error) {
      console.error('Failed to register student ID card:', idCardRes.error);
    }

    try {
      await sb.from('activity_log').insert({
        actor_id: user.id,
        action: 'student_signup',
        target: 'Student registration with ID card verification pending'
      });
    } catch (e) {}

    clearRateLimit('signup_' + email);
    return { user: user, public_id: cloudinaryPublicId };
  }

  // ── STUDENT ID CARD RE-UPLOAD ────────────────────────────────
  async function reuploadIdCard(file) {
    var sb = getClient();
    if (!sb) throw new Error('Database connection unavailable.');

    var sessionRes = await sb.auth.getSession();
    var session = sessionRes.data ? sessionRes.data.session : null;
    if (!session || !session.user) {
      throw new Error('You must be signed in to re-upload your student ID card.');
    }

    var uploadResult = await uploadIdCardToCloudinary(file);

    var updateRes = await sb
      .from('id_cards')
      .update({
        cloudinary_public_id: uploadResult.public_id,
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', session.user.id);

    if (updateRes.error) {
      throw new Error(updateRes.error.message || 'Failed to update ID card record.');
    }

    try {
      await sb.from('activity_log').insert({
        actor_id: session.user.id,
        action: 'id_card_reupload',
        target: 'Student re-uploaded ID card after previous invalid mark'
      });
    } catch (e) {}

    return uploadResult;
  }

  // ── VIEW ID CARD (SHORT-LIVED SIGNED URL) ────────────────────
  async function getViewableIdCardUrl(userId) {
    var sb = getClient();
    if (!sb) throw new Error('Database connection unavailable.');

    var sessionRes = await sb.auth.getSession();
    var session = sessionRes.data ? sessionRes.data.session : null;
    if (!session) {
      throw new Error('Authentication required to view student ID cards.');
    }

    var res = await fetch('/api/id-card/view?userId=' + encodeURIComponent(userId), {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + session.access_token
      }
    });

    if (!res.ok) {
      var errData = await res.json().catch(function() { return {}; });
      throw new Error(errData.error || 'Access denied or ID card not found.');
    }

    return await res.json();
  }

  // ── UPLOAD COMPLAINT EVIDENCE FILE ────────────────────────────
  async function uploadEvidenceFile(file) {
    if (!file) throw new Error('Evidence file is required.');

    var MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      throw new Error('Evidence file size exceeds the 5 MB limit.');
    }

    var signRes = await fetch('/api/cloudinary/sign-upload', {
      method: 'POST',
      headers: await getAdminAuthHeader(),
      body: JSON.stringify({ folder: 'civicsense/complaint_evidence' })
    });

    if (!signRes.ok) {
      var errData = await signRes.json().catch(function() { return {}; });
      throw new Error(errData.error || 'Server rejected evidence upload signature request.');
    }

    var signData = await signRes.json();
    var formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signData.apiKey);
    formData.append('timestamp', signData.timestamp);
    formData.append('signature', signData.signature);
    formData.append('folder', signData.folder);
    formData.append('type', signData.type);

    var uploadUrl = 'https://api.cloudinary.com/v1_1/' + signData.cloudName + '/auto/upload';
    var cldRes = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!cldRes.ok) {
      var cldErr = await cldRes.json().catch(function() { return {}; });
      throw new Error((cldErr.error && cldErr.error.message) || 'Failed to upload evidence file.');
    }

    var cldData = await cldRes.json();
    return {
      public_id: cldData.public_id,
      format: cldData.format
    };
  }

  // ── SUBMIT STUDENT COMPLAINT ──────────────────────────────────
  async function submitStudentComplaint(options) {
    var sb = getClient();
    if (!sb) throw new Error('Database service unavailable.');

    var sessionRes = await sb.auth.getSession();
    var session = sessionRes.data ? sessionRes.data.session : null;
    if (!session || !session.user) {
      throw new Error('You must be signed in with your student account to submit a complaint.');
    }

    var title = (options.title || '').trim();
    var description = (options.description || '').trim();
    var category = (options.category || '').trim();
    var visibility = options.visibility || 'department';
    var targetUnitId = options.targetUnitId || null;
    var evidenceFiles = options.evidenceFiles || [];

    if (!title || title.length < 5) {
      throw new Error('Please enter a descriptive complaint title (minimum 5 characters).');
    }
    if (!description || description.length < 8) {
      throw new Error('Please describe the issue in detail (minimum 8 characters).');
    }
    if (!category) {
      throw new Error('Please select an issue category.');
    }
    if (visibility === 'department' && !targetUnitId) {
      throw new Error('Please select the targeted university department unit.');
    }

    // 1. Upload evidence files (Cloudinary authenticated delivery)
    var uploadedPublicIds = [];
    if (evidenceFiles.length > 0) {
      for (var i = 0; i < evidenceFiles.length; i++) {
        var up = await uploadEvidenceFile(evidenceFiles[i]);
        uploadedPublicIds.push(up.public_id);
      }
    }

    // 2. Insert complaint record
    var compRes = await sb
      .from('complaints')
      .insert({
        student_id: session.user.id,
        title: title,
        description: description,
        category: category,
        visibility: visibility,
        target_unit_id: visibility === 'department' ? targetUnitId : null,
        status: 'submitted'
      })
      .select()
      .single();

    if (compRes.error || !compRes.data) {
      throw new Error((compRes.error && compRes.error.message) || 'Failed to register complaint in database.');
    }

    var complaint = compRes.data;

    // 3. Insert complaint evidence records
    if (uploadedPublicIds.length > 0) {
      var evRows = uploadedPublicIds.map(function(pid) {
        return {
          complaint_id: complaint.id,
          cloudinary_public_id: pid
        };
      });

      var evRes = await sb.from('complaint_evidence').insert(evRows);
      if (evRes.error) {
        console.error('Failed to link evidence records:', evRes.error);
      }
    }

    // 4. Insert initial status history record (Submitted)
    var histRes = await sb.from('complaint_status_history').insert({
      complaint_id: complaint.id,
      status: 'submitted',
      remark: 'Complaint registered by student',
      changed_by: session.user.id
    });

    if (histRes.error) {
      console.error('Failed to create status history entry:', histRes.error);
    }

    // 5. Activity log
    try {
      await sb.from('activity_log').insert({
        actor_id: session.user.id,
        action: 'complaint_submitted',
        target: 'Complaint #' + complaint.id.slice(0, 8) + ' (' + title.slice(0, 30) + ') submitted'
      });
    } catch (e) {}

    return complaint;
  }

  // ── FETCH STUDENT COMPLAINTS ──────────────────────────────────
  async function fetchStudentComplaints() {
    var sb = getClient();
    if (!sb) throw new Error('Database service unavailable.');

    var sessionRes = await sb.auth.getSession();
    var session = sessionRes.data ? sessionRes.data.session : null;
    if (!session || !session.user) {
      return [];
    }

    var res = await sb
      .from('complaints')
      .select('id, student_id, title, description, category, visibility, target_unit_id, status, created_at, updated_at, complaint_evidence(id, complaint_id, cloudinary_public_id, created_at), complaint_status_history(id, complaint_id, status, remark, changed_by, created_at)')
      .eq('student_id', session.user.id)
      .order('created_at', { ascending: false });

    if (res.error) {
      throw new Error(res.error.message || 'Failed to fetch complaints list.');
    }

    return res.data || [];
  }

  // ── FETCH COMPLAINT BY ID (FOR TRACKER) ───────────────────────
  async function fetchComplaintById(complaintId) {
    var sb = getClient();
    if (!sb) throw new Error('Database service unavailable.');

    var cleanId = (complaintId || '').trim();
    if (!cleanId) return null;

    var query = sb
      .from('complaints')
      .select('id, student_id, title, description, category, visibility, target_unit_id, status, created_at, updated_at, complaint_evidence(id, complaint_id, cloudinary_public_id, created_at), complaint_status_history(id, complaint_id, status, remark, changed_by, created_at)');

    // Check if cleanId looks like a UUID
    if (cleanId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      query = query.eq('id', cleanId);
    } else {
      // Short reference "CS-E703D748" = first 8 hex digits of the UUID. `id` is a uuid column, so
      // ilike (text matching) fails in Postgres; match the prefix as a UUID range instead.
      var prefix = cleanId.replace(/^CS-?/i, '').toLowerCase();
      if (!/^[0-9a-f]{1,8}$/.test(prefix)) return null;
      var pad = function (ch) { return (prefix + ch.repeat(8)).slice(0, 8); };
      query = query
        .gte('id', pad('0') + '-0000-0000-0000-000000000000')
        .lte('id', pad('f') + '-ffff-ffff-ffff-ffffffffffff');
    }

    var res = await query.maybeSingle();
    if (res.error) {
      console.error('Failed to query complaint:', res.error);
      return null;
    }
    return res.data;
  }

  // ── FETCH DEPARTMENT UNITS LIST ───────────────────────────────
  async function fetchDepartmentUnits() {
    var sb = getClient();
    if (sb) {
      var res = await sb
        .from('profiles')
        .select('id, name, unit_name, role')
        .in('role', ['department', 'social_service'])
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!res.error && res.data && res.data.length > 0) {
        return res.data;
      }
    }

    var fallbackRes = await fetch('/api/department-units');
    if (fallbackRes.ok) {
      var json = await fallbackRes.json();
      return json.units || [];
    }
    return [];
  }

  // ── VIEW COMPLAINT EVIDENCE FILE ──────────────────────────────
  async function getViewableEvidenceUrl(complaintId, publicId) {
    var sb = getClient();
    if (!sb) throw new Error('Database service unavailable.');

    var sessionRes = await sb.auth.getSession();
    var session = sessionRes.data ? sessionRes.data.session : null;
    if (!session) {
      throw new Error('Authentication required to view complaint evidence files.');
    }

    var url = '/api/complaint-evidence/view?complaintId=' + encodeURIComponent(complaintId) + '&publicId=' + encodeURIComponent(publicId);
    var res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + session.access_token
      }
    });

    if (!res.ok) {
      var errData = await res.json().catch(function() { return {}; });
      throw new Error(errData.error || 'Access denied to evidence file.');
    }

    return await res.json();
  }

  // ── FETCH COMPLAINTS FOR OFFICIALS ────────────────────────────
  async function fetchOfficialComplaints() {
    var sb = getClient();
    if (!sb) throw new Error('Database service unavailable.');

    var sessionRes = await sb.auth.getSession();
    var session = sessionRes.data ? sessionRes.data.session : null;
    if (!session) {
      throw new Error('Official login required to load redressal queue.');
    }

    var res = await sb
      .from('complaints')
      .select(`
        id,
        student_id,
        title,
        description,
        category,
        visibility,
        target_unit_id,
        status,
        created_at,
        updated_at,
        student:profiles!student_id(id, name, email),
        target_unit:profiles!target_unit_id(id, name, unit_name),
        evidence:complaint_evidence(id, cloudinary_public_id, created_at),
        history:complaint_status_history(id, status, remark, created_at, changed_by, actor:profiles!changed_by(name, role, unit_name))
      `)
      .order('created_at', { ascending: false });

    if (res.error) {
      console.error('Failed to load official complaints:', res.error);
      throw new Error(res.error.message || 'Failed to retrieve grievances from database.');
    }

    var complaints = res.data || [];

    // Also fetch matching id_cards for all students in the complaints list
    if (complaints.length > 0) {
      var studentIds = [];
      complaints.forEach(function (c) {
        if (c.student_id && studentIds.indexOf(c.student_id) === -1) {
          studentIds.push(c.student_id);
        }
      });

      if (studentIds.length > 0) {
        var idRes = await sb
          .from('id_cards')
          .select('id, user_id, cloudinary_public_id, status, reviewed_by, reviewed_at')
          .in('user_id', studentIds);

        if (!idRes.error && idRes.data) {
          var idCardMap = {};
          idRes.data.forEach(function (card) {
            idCardMap[card.user_id] = card;
          });
          complaints.forEach(function (c) {
            c.idCard = idCardMap[c.student_id] || null;
          });
        }
      }
    }

    return complaints;
  }

  // ── FETCH STUDENT ID CARD DETAILS ──────────────────────────────
  async function fetchStudentIdCard(userId) {
    var sb = getClient();
    if (!sb) return null;
    var res = await sb
      .from('id_cards')
      .select('id, user_id, cloudinary_public_id, status, reviewed_by, reviewed_at, created_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (res.error) {
      console.warn('ID card query:', res.error);
      return null;
    }
    return res.data;
  }

  // ── UPDATE COMPLAINT WORKFLOW STATUS ──────────────────────────
  async function updateComplaintWorkflow(complaintId, status, remark, idCardStatus) {
    var sb = getClient();
    if (!sb) throw new Error('Database service unavailable.');

    var sessionRes = await sb.auth.getSession();
    var session = sessionRes.data ? sessionRes.data.session : null;
    if (!session) {
      throw new Error('Authentication required to perform official redressal actions.');
    }

    var res = await fetch('/api/complaints/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token
      },
      body: JSON.stringify({
        complaintId: complaintId,
        status: status || null,
        remark: remark || null,
        idCardStatus: idCardStatus || null
      })
    });

    var data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update complaint workflow.');
    }
    return data;
  }

  // ── REVIEW STUDENT ID CARD ────────────────────────────────────
  async function reviewStudentIdCard(userId, status) {
    var sb = getClient();
    if (!sb) throw new Error('Database service unavailable.');

    var sessionRes = await sb.auth.getSession();
    var session = sessionRes.data ? sessionRes.data.session : null;
    if (!session) {
      throw new Error('Authentication required to review ID cards.');
    }

    var res = await fetch('/api/id-card/review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token
      },
      body: JSON.stringify({
        userId: userId,
        status: status
      })
    });

    var data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to record ID card review.');
    }
    return data;
  }

  // ── PHASE 6: ADMIN OFFICIAL PROFILE MANAGEMENT & ACTIVITY LOGS ──
  async function getAdminAuthHeader() {
    var sb = getClient();
    if (!sb) throw new Error('Database service unavailable.');
    var sessionRes = await sb.auth.getSession();
    var session = sessionRes.data ? sessionRes.data.session : null;
    if (!session) throw new Error('You must be signed in to do this.');
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + session.access_token
    };
  }

  // ── PRD AI ANALYSIS, ROUTING AND ROUTE TRACKER ──────────────
  // These never throw for "not set up yet" (migration 001 not run): callers then simply show nothing extra.

  var featuresPromise = null;
  /** Which PRD features the server has switched on: { routing, gemini }. */
  function fetchFeatures() {
    if (!featuresPromise) {
      featuresPromise = fetch('/api/features').then(function (r) { return r.ok ? r.json() : { routing: false, gemini: false }; })
        .catch(function () { return { routing: false, gemini: false }; });
    }
    return featuresPromise;
  }

  async function postJson(path, body) {
    var headers = await getAdminAuthHeader();
    var res = await fetch(path, { method: 'POST', headers: headers, body: JSON.stringify(body) });
    var json = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(json.error || 'Request failed.');
    return json;
  }

  async function getJson(path) {
    var headers = await getAdminAuthHeader();
    var res = await fetch(path, { method: 'GET', headers: headers });
    var json = await res.json().catch(function () { return {}; });
    if (!res.ok) { var e = new Error(json.error || 'Request failed.'); e.notInstalled = !!json.notInstalled; throw e; }
    return json;
  }

  /** Administration: dashboard statistics (PRD: by status, category, place; average resolution time). */
  function fetchStats() { return getJson('/api/admin/stats'); }
  /** Administration: possible duplicate pairs { pairs: [{ complaint, original, score }] }. */
  function fetchDuplicates() { return getJson('/api/admin/duplicates'); }
  function mergeComplaint(complaintId, intoId) { return postJson('/api/admin/merge', { complaintId: complaintId, intoId: intoId || null }); }
  function dismissDuplicate(complaintId) { return postJson('/api/admin/dismiss-duplicate', { complaintId: complaintId }); }
  /** Administration: posts and routing rules { authorities, rules, categories }. */
  function fetchRoutingConfig() { return getJson('/api/admin/routing'); }
  async function saveRoutingConfig(config) {
    var headers = await getAdminAuthHeader();
    var res = await fetch('/api/admin/routing', { method: 'PUT', headers: headers, body: JSON.stringify(config) });
    var json = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(json.error || 'Failed to save routing.');
    return json;
  }

  /** Official: a reply to the reporter ('public') or an internal note ('internal'). */
  function postReply(complaintId, body, visibility) {
    return postJson('/api/complaints/replies', { complaintId: complaintId, body: body, visibility: visibility });
  }

  /** Reporter: 'confirm' that a resolved complaint is fixed, or 'reopen' it with a note. */
  function confirmComplaint(complaintId, action, note) {
    return postJson('/api/complaints/confirm', { complaintId: complaintId, action: action, note: note || '' });
  }

  async function fetchNotifications() {
    var sb = getClient();
    if (!sb) return [];
    var res = await sb.from('notifications').select('id, complaint_id, message_en, message_as, read, created_at').order('created_at', { ascending: false }).limit(30);
    return res.error ? [] : (res.data || []);
  }

  async function markNotificationsRead(ids) {
    var sb = getClient();
    if (!sb || !ids.length) return;
    await sb.from('notifications').update({ read: true }).in('id', ids);
  }

  var notificationChannelSeq = 0;

  /** Live notifications (Supabase Realtime). Returns an unsubscribe function. */
  function subscribeNotifications(userId, onInsert) {
    var sb = getClient();
    if (!sb || !userId) return function () {};
    // unique topic: sb.channel() hands back a still-registered channel of the same name (removeChannel is async),
    // and adding callbacks to an already-subscribed channel throws, e.g. when the bell remounts
    var channel = sb.channel('notifications-' + userId + '-' + (++notificationChannelSeq))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId }, function (payload) { onInsert(payload.new); })
      .subscribe();
    return function () { sb.removeChannel(channel); };
  }

  /** The language complaint summaries and replies are shown in ('en' or 'as'). */
  async function setPreferredLanguage(userId, lang) {
    var sb = getClient();
    if (!sb) return;
    await sb.from('profiles').update({ preferred_language: lang }).eq('id', userId);
  }

  /** Runs the AI analysis and routing for a complaint just filed. Returns null when unavailable. */
  async function analyseComplaint(complaintId, location, hideName) {
    try {
      var headers = await getAdminAuthHeader();
      var res = await fetch('/api/complaints/analyse', {
        method: 'POST', headers: headers, body: JSON.stringify({ complaintId: complaintId, location: location || null, hideName: !!hideName })
      });
      var json = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        if (!json.notInstalled) console.error('Complaint analysis failed:', json.error || res.status);
        return null;
      }
      return json;
    } catch (e) {
      console.error('Complaint analysis failed:', e);
      return null;
    }
  }

  /** Marks the complaint seen for the posts the signed-in official holds (route tracker). */
  async function markComplaintSeen(complaintId) {
    try {
      var headers = await getAdminAuthHeader();
      await fetch('/api/complaints/seen', { method: 'POST', headers: headers, body: JSON.stringify({ complaintId: complaintId }) });
    } catch (e) { /* best effort */ }
  }

  /** Administration: routes a complaint from the review queue by hand. */
  async function routeComplaintByHand(complaintId, category) {
    var headers = await getAdminAuthHeader();
    var res = await fetch('/api/admin/route-complaint', {
      method: 'POST', headers: headers, body: JSON.stringify({ complaintId: complaintId, category: category })
    });
    var json = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(json.error || 'Failed to route complaint.');
    return json;
  }

  /** AI fields and route tracker rows for the given complaints, keyed by complaint id ({} when unavailable). */
  async function fetchRouting(complaintIds) {
    var sb = getClient();
    if (!sb || !complaintIds || !complaintIds.length) return {};
    var ai = await sb.from('complaints')
      .select('id, location_id, duplicate_of, possible_duplicate_of, hide_name_from_union, ai_category, priority, is_sensitive, location_text, summary_en, summary_as, image_findings, confidence, ai_source, input_language, human_edited, analysed_at, resolved_at')
      .in('id', complaintIds);
    if (ai.error) return {};
    var routes = await sb.from('complaint_routes')
      .select('complaint_id, kind, delivered_at, seen_at, replied_at, resolved_at, authority:authorities(post_title, person_name)')
      .in('complaint_id', complaintIds);
    var replies = await sb.from('complaint_replies')
      .select('id, complaint_id, visibility, body_original, body_language, body_en, body_as, created_at, author:profiles(name), authority:authorities(post_title)')
      .in('complaint_id', complaintIds)
      .order('created_at', { ascending: true });
    var out = {};
    (ai.data || []).forEach(function (row) { out[row.id] = Object.assign({}, row, { routes: [], replies: [] }); });
    (replies.data || []).forEach(function (r) {
      if (!out[r.complaint_id]) return;
      out[r.complaint_id].replies.push({
        id: r.id, visibility: r.visibility, body_original: r.body_original, body_language: r.body_language, body_en: r.body_en, body_as: r.body_as,
        created_at: r.created_at, from: (r.authority && r.authority.post_title) || (r.author && r.author.name) || 'University official'
      });
    });
    (routes.data || []).forEach(function (r) {
      if (!out[r.complaint_id]) return;
      out[r.complaint_id].routes.push({
        kind: r.kind, delivered_at: r.delivered_at, seen_at: r.seen_at, replied_at: r.replied_at, resolved_at: r.resolved_at,
        post_title: r.authority ? r.authority.post_title : 'Unknown post', person_name: r.authority ? r.authority.person_name : null
      });
    });
    Object.keys(out).forEach(function (id) {
      out[id].routes.sort(function (a, b) { return (a.kind === 'primary' ? 0 : 1) - (b.kind === 'primary' ? 0 : 1); });
    });
    return out;
  }

  async function fetchAdminOfficials() {
    var headers = await getAdminAuthHeader();
    var res = await fetch('/api/admin/list-officials', { method: 'GET', headers: headers });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch officials list.');
    return data.officials || [];
  }

  async function createOfficialAccount(data) {
    var headers = await getAdminAuthHeader();
    var res = await fetch('/api/admin/create-official', {
      method: 'POST',
      headers: headers,
      // the API names the password field temporaryPassword
      body: JSON.stringify({ name: data.name, email: data.email, role: data.role, unitName: data.unitName, temporaryPassword: data.password })
    });
    var json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create official account.');
    return json;
  }

  async function editOfficialProfile(userId, name, unitName) {
    var headers = await getAdminAuthHeader();
    var res = await fetch('/api/admin/edit-official', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ userId: userId, name: name, unitName: unitName })
    });
    var json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update official profile.');
    return json;
  }

  async function toggleOfficialActive(userId, isActive) {
    var headers = await getAdminAuthHeader();
    var res = await fetch('/api/admin/toggle-active', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ userId: userId, isActive: isActive })
    });
    var json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update account status.');
    return json;
  }

  async function deleteOfficialAccount(userId) {
    var headers = await getAdminAuthHeader();
    var res = await fetch('/api/admin/delete-official', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ userId: userId })
    });
    var json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete official account.');
    return json;
  }

  async function resetOfficialPassword(userId, newTemporaryPassword) {
    var headers = await getAdminAuthHeader();
    var res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ userId: userId, newTemporaryPassword: newTemporaryPassword })
    });
    var json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to reset official password.');
    return json;
  }

  async function reassignComplaint(complaintId, targetUnitId, remark) {
    var headers = await getAdminAuthHeader();
    var res = await fetch('/api/admin/reassign-complaint', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ complaintId: complaintId, targetUnitId: targetUnitId, remark: remark })
    });
    var json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to reassign complaint.');
    return json;
  }

  async function fetchActivityLogs(limit) {
    var headers = await getAdminAuthHeader();
    var res = await fetch('/api/activity-logs?limit=' + (limit || 100), { method: 'GET', headers: headers });
    var json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch activity logs.');
    return json.logs || [];
  }

  async function fetchAdminStats() {
    var headers = await getAdminAuthHeader();
    var res = await fetch('/api/admin/stats', { method: 'GET', headers: headers });
    var json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load admin stats.');
    return json;
  }

  // ── PUBLIC API EXPORT ─────────────────────────────────────────
  global.CivicAuth = {
    getClient: getClient,
    getProfile: function () {
      return currentProfile;
    },
    getSession: function () {
      return currentSession;
    },
    login: login,
    loginStudent: function (email, password) {
      return login(email, password, ['student']);
    },
    loginDepartmentOrSocial: function (email, password) {
      return login(email, password, ['department', 'social_service']);
    },
    loginAdministration: function (email, password) {
      return login(email, password, ['administration']);
    },
    logout: logout,
    changePassword: changePassword,
    enforceRoleGuard: enforceRoleGuard,
    ensurePasswordChangeModal: ensurePasswordChangeModal,
    checkRateLimit: checkRateLimit,
    clearRateLimit: clearRateLimit,
    uploadIdCardToCloudinary: uploadIdCardToCloudinary,
    signUpStudent: signUpStudent,
    reuploadIdCard: reuploadIdCard,
    getViewableIdCardUrl: getViewableIdCardUrl,
    uploadEvidenceFile: uploadEvidenceFile,
    submitStudentComplaint: submitStudentComplaint,
    fetchStudentComplaints: fetchStudentComplaints,
    fetchComplaintById: fetchComplaintById,
    fetchDepartmentUnits: fetchDepartmentUnits,
    getViewableEvidenceUrl: getViewableEvidenceUrl,
    fetchOfficialComplaints: fetchOfficialComplaints,
    fetchStudentIdCard: fetchStudentIdCard,
    updateComplaintWorkflow: updateComplaintWorkflow,
    reviewStudentIdCard: reviewStudentIdCard,
    fetchAdminOfficials: fetchAdminOfficials,
    createOfficialAccount: createOfficialAccount,
    editOfficialProfile: editOfficialProfile,
    toggleOfficialActive: toggleOfficialActive,
    deleteOfficialAccount: deleteOfficialAccount,
    resetOfficialPassword: resetOfficialPassword,
    reassignComplaint: reassignComplaint,
    fetchFeatures: fetchFeatures,
    fetchStats: fetchStats,
    fetchDuplicates: fetchDuplicates,
    mergeComplaint: mergeComplaint,
    dismissDuplicate: dismissDuplicate,
    fetchRoutingConfig: fetchRoutingConfig,
    saveRoutingConfig: saveRoutingConfig,
    postReply: postReply,
    confirmComplaint: confirmComplaint,
    fetchNotifications: fetchNotifications,
    markNotificationsRead: markNotificationsRead,
    subscribeNotifications: subscribeNotifications,
    setPreferredLanguage: setPreferredLanguage,
    analyseComplaint: analyseComplaint,
    markComplaintSeen: markComplaintSeen,
    routeComplaintByHand: routeComplaintByHand,
    fetchRouting: fetchRouting,
    fetchActivityLogs: fetchActivityLogs,
    fetchAdminStats: fetchAdminStats
  };
})(window);

