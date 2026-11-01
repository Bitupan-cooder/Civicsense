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
      headers: { 'Content-Type': 'application/json' }
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

    // 1. Upload ID card to Cloudinary (authenticated type)
    var uploadResult = await uploadIdCardToCloudinary(file);
    var cloudinaryPublicId = uploadResult.public_id;

    var sb = getClient();
    if (!sb) throw new Error('Database connection unavailable.');

    // 2. Sign up user with Supabase Auth
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
    getViewableIdCardUrl: getViewableIdCardUrl
  };
})(window);

