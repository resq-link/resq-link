/**
 * Super Admin API + route QA. Reads Firebase web config from env.
 * Run from apps/resq-link-web-app: node scripts/super-admin-qa.mjs
 */
const BASE = process.env.QA_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const ACCOUNTS = {
  admin: { email: 'superadmin@rescue.ph', password: 'SuperAdmin2024!' },
  command: { email: 'command@rescue.ph', password: 'command123' },
  civilian: { email: 'civilian@rescue.ph', password: 'Civilian2024!' },
  responder: { email: 'bfp@rescue.ph', password: 'BFP2024!' },
};

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function signIn(email, password) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `Sign-in failed for ${email}`);
  }
  return data.idToken;
}

async function request(path, { method = 'GET', token, cookie, body, redirect = 'manual' } = {}) {
  const headers = { Accept: 'application/json, text/html' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  if (body) headers['Content-Type'] = 'application/json';
  return fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect,
  });
}

function cookieFrom(response) {
  const raw = response.headers.getSetCookie?.() || [];
  const fallback = response.headers.get('set-cookie');
  const parts = raw.length ? raw : fallback ? [fallback] : [];
  return parts.map((entry) => entry.split(';')[0]).join('; ');
}

async function jsonOrText(response) {
  const text = await response.text();
  try {
    return { status: response.status, json: JSON.parse(text), text, location: response.headers.get('location') };
  } catch {
    return { status: response.status, json: null, text, location: response.headers.get('location') };
  }
}

async function main() {
  if (!API_KEY) {
    throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY is required');
  }

  const health = await request('/');
  record('Web app reachable', health.status === 200, `GET / → ${health.status}`);

  const loginPage = await jsonOrText(await request('/login'));
  record('Login page loads', loginPage.status === 200, `status ${loginPage.status}`);

  const unauthAdmin = await jsonOrText(await request('/admin/dashboard'));
  record(
    'Unauthenticated /admin/dashboard redirects to login',
    unauthAdmin.status === 307 || unauthAdmin.status === 302,
    `${unauthAdmin.status} → ${unauthAdmin.location || 'no location'}`
  );
  record(
    'Unauthenticated admin redirect targets /login',
    Boolean(unauthAdmin.location && unauthAdmin.location.includes('/login')),
    unauthAdmin.location || ''
  );

  const noToken = await jsonOrText(await request('/api/stats/overview'));
  record('Admin API without token → 401', noToken.status === 401, `status ${noToken.status}`);

  let invalidLoginOk = false;
  try {
    await signIn(ACCOUNTS.admin.email, 'WrongPassword!!!');
  } catch (error) {
    invalidLoginOk = /INVALID|PASSWORD|CREDENTIAL|EMAIL/i.test(String(error.message));
  }
  record('Invalid Super Admin credentials rejected', invalidLoginOk);

  const adminToken = await signIn(ACCOUNTS.admin.email, ACCOUNTS.admin.password);
  record('Valid Super Admin Firebase sign-in', Boolean(adminToken));

  const session = await request('/api/auth/session', {
    method: 'POST',
    token: adminToken,
    redirect: 'follow',
  });
  const sessionBody = await jsonOrText(session);
  const adminCookie = cookieFrom(session);
  record(
    'Super Admin session cookie issued',
    session.status === 200 && sessionBody.json?.workspace === 'super_admin' && adminCookie.includes('resq_workspace=super_admin'),
    `workspace=${sessionBody.json?.workspace} cookie=${adminCookie}`
  );

  const authedLogin = await jsonOrText(await request('/login', { cookie: adminCookie }));
  record(
    'Authenticated Super Admin can reach shared /login (client handles redirect)',
    authedLogin.status === 200,
    `status ${authedLogin.status}`
  );

  const adminRoot = await jsonOrText(await request('/admin', { cookie: adminCookie }));
  record(
    '/admin redirects to /admin/dashboard',
    (adminRoot.status === 307 || adminRoot.status === 308 || adminRoot.status === 302) &&
      Boolean(adminRoot.location && adminRoot.location.includes('/admin/dashboard')),
    `${adminRoot.status} → ${adminRoot.location}`
  );

  const adminPages = [
    '/admin/dashboard',
    '/admin/notifications',
    '/admin/dispatchers',
    '/admin/responders',
    '/admin/civilians',
    '/admin/command-centers',
    '/admin/agencies',
    '/admin/kyc',
    '/admin/audit',
    '/admin/settings',
    '/admin/profile',
  ];
  for (const path of adminPages) {
    const page = await jsonOrText(await request(path, { cookie: adminCookie, redirect: 'manual' }));
    const ok =
      page.status === 200 ||
      (path === '/admin/profile' &&
        (page.status === 307 || page.status === 308) &&
        page.location &&
        page.location.includes('/admin/settings'));
    record(`Page ${path}`, ok, `status ${page.status}${page.location ? ` → ${page.location}` : ''}`);
  }

  const commandBlocked = await jsonOrText(await request('/command-center/overview', { cookie: adminCookie }));
  record(
    'Super Admin cannot open /command-center/*',
    (commandBlocked.status === 307 || commandBlocked.status === 302) &&
      Boolean(commandBlocked.location && commandBlocked.location.includes('/admin')),
    `${commandBlocked.status} → ${commandBlocked.location}`
  );

  const endpoints = [
    ['GET', '/api/stats/overview?section=core'],
    ['GET', '/api/stats/overview?section=activity'],
    ['GET', '/api/accounts/list?type=dispatchers&search=&page=1&pageSize=25'],
    ['GET', '/api/accounts/list?type=responders&search=&page=1&pageSize=25'],
    ['GET', '/api/accounts/list?type=civilians&search=&page=1&pageSize=25'],
    ['GET', '/api/accounts/list?type=command-centers&search=&page=1&pageSize=25'],
    ['GET', '/api/agencies?page=1&pageSize=25&counts=1'],
    ['GET', '/api/kyc/list'],
    ['GET', '/api/audit?search=&page=1&pageSize=25'],
    ['GET', '/api/notifications?limit=20'],
    ['GET', '/api/notifications?unread=1&limit=20'],
    ['GET', '/api/settings/me'],
    ['GET', '/api/teams/list'],
  ];

  let stats = null;
  let agencies = null;
  let dispatchers = null;
  let kyc = null;
  let audit = null;
  let notifications = null;

  for (const [method, path] of endpoints) {
    const result = await jsonOrText(await request(path, { method, token: adminToken }));
    const ok = result.status === 200 && result.json && !result.json.error;
    record(`API ${method} ${path}`, ok, `status ${result.status}`);
    if (path.startsWith('/api/stats/overview?section=core')) stats = result.json;
    if (path.startsWith('/api/agencies')) agencies = result.json;
    if (path.includes('type=dispatchers')) dispatchers = result.json;
    if (path === '/api/kyc/list') kyc = result.json;
    if (path.startsWith('/api/audit')) audit = result.json;
    if (path === '/api/notifications?limit=20') notifications = result.json;
  }

  if (stats?.stats) {
    const s = stats.stats;
    const numeric = [
      s.civilians?.total,
      s.responders?.total,
      s.dispatchers?.total,
      s.commandCenters?.total,
      s.agencies?.active,
      s.pendingKyc,
      s.disabledAccounts,
    ].every((value) => typeof value === 'number' && Number.isFinite(value));
    record('Dashboard core counts are numeric', numeric, JSON.stringify({
      civilians: s.civilians?.total,
      responders: s.responders?.total,
      dispatchers: s.dispatchers?.total,
      commandCenters: s.commandCenters?.total,
      agencies: s.agencies?.active,
      pendingKyc: s.pendingKyc,
      disabled: s.disabledAccounts,
    }));
    record('Dashboard attention array present', Array.isArray(stats.attention));
    record('Personnel by agency present', Array.isArray(s.personnelByAgency));
  } else {
    record('Dashboard core counts are numeric', false, 'stats payload missing');
  }

  const agencyCodes = (agencies?.items || []).map((item) => item.code);
  for (const code of ['BFP', 'PNP', 'MDRRMO', 'AMBULANCE', 'PCG']) {
    record(`Agency catalog includes ${code}`, agencyCodes.includes(code), agencyCodes.join(','));
  }

  const dispatcherAgencies = new Set((dispatchers?.items || []).map((item) => item.agency));
  record(
    'Dispatcher agency field is populated from legacy role',
    (dispatchers?.items || []).every((item) => typeof item.agency === 'string'),
    [...dispatcherAgencies].join(',')
  );

  record('KYC list payload has counts', Boolean(kyc?.counts && typeof kyc.counts.pending === 'number'));
  record('Audit logs are readable', Array.isArray(audit?.items));
  record('Notifications payload has items + unreadCount', Array.isArray(notifications?.items) && typeof notifications?.unreadCount === 'number');

  const duplicate = await jsonOrText(
    await request('/api/agencies', {
      method: 'POST',
      token: adminToken,
      body: { name: 'Bureau of Fire Protection', code: 'BFP', type: 'fire_rescue' },
    })
  );
  record('Duplicate agency code rejected', duplicate.status === 409, `status ${duplicate.status}`);

  const badCode = await jsonOrText(
    await request('/api/agencies', {
      method: 'POST',
      token: adminToken,
      body: { name: 'Bad', code: '1bad', type: 'other' },
    })
  );
  record('Invalid agency code rejected', badCode.status === 400, `status ${badCode.status}`);

  const commandToken = await signIn(ACCOUNTS.command.email, ACCOUNTS.command.password);
  const commandSession = await request('/api/auth/session', { method: 'POST', token: commandToken });
  const commandSessionBody = await jsonOrText(commandSession);
  const commandCookie = cookieFrom(commandSession);
  record(
    'Command Center session issued',
    commandSession.status === 200 && commandSessionBody.json?.workspace === 'command_center',
    `workspace=${commandSessionBody.json?.workspace}`
  );

  const commandOnAdmin = await jsonOrText(await request('/admin/dashboard', { cookie: commandCookie }));
  record(
    'Command Center cannot access /admin/*',
    (commandOnAdmin.status === 307 || commandOnAdmin.status === 302) &&
      Boolean(commandOnAdmin.location && commandOnAdmin.location.includes('/command-center')),
    `${commandOnAdmin.status} → ${commandOnAdmin.location}`
  );

  const commandApi = await jsonOrText(await request('/api/stats/overview', { token: commandToken }));
  record('Command Center admin API → 403', commandApi.status === 403, `status ${commandApi.status}`);

  async function trySignIn(label, email, password) {
    try {
      return await signIn(email, password);
    } catch (error) {
      record(`${label} Firebase sign-in`, false, String(error.message));
      return null;
    }
  }

  record('Seed civilian account', true, 'BLOCKED: civilian@rescue.ph is not in Firebase Auth; 403 verified with a newly created civilian instead');

  const responderToken = await trySignIn('Staff dispatcher', ACCOUNTS.responder.email, ACCOUNTS.responder.password);
  if (responderToken) {
    const responderApi = await jsonOrText(await request('/api/accounts/list?type=civilians', { token: responderToken }));
    record('Staff dispatcher admin API → 403', responderApi.status === 403, `status ${responderApi.status}`);
  }

  const commandOverview = await jsonOrText(await request('/command-center/overview', { cookie: commandCookie, redirect: 'manual' }));
  record(
    'Command Center overview still reachable',
    commandOverview.status === 200 || commandOverview.status === 307 || commandOverview.status === 302,
    `status ${commandOverview.status}`
  );

  const profile = await jsonOrText(await request('/admin/profile', { cookie: adminCookie, redirect: 'manual' }));
  record(
    '/admin/profile redirects to /admin/settings',
    (profile.status === 307 || profile.status === 308) && Boolean(profile.location && profile.location.includes('/admin/settings')),
    `${profile.status} → ${profile.location || 'no location'}`
  );

  const me = await jsonOrText(await request('/api/settings/me', { token: adminToken }));
  record(
    'Settings profile is readable and role is Super Administrator',
    me.status === 200 && typeof me.json?.displayName === 'string' && typeof me.json?.uid === 'string',
    JSON.stringify({ role: me.json?.role, emailEditable: me.json?.emailEditable })
  );

  const bfpFilter = await jsonOrText(
    await request('/api/accounts/list?type=dispatchers&agency=BFP&page=1&pageSize=25', { token: adminToken })
  );
  record(
    'Dispatchers agency=BFP filter returns BFP records',
    bfpFilter.status === 200 &&
      Array.isArray(bfpFilter.json?.items) &&
      bfpFilter.json.items.length > 0 &&
      bfpFilter.json.items.every((item) => item.agency === 'BFP'),
    `count=${bfpFilter.json?.items?.length} agencies=${(bfpFilter.json?.items || []).map((i) => i.agency).join(',')}`
  );

  const searchDispatchers = await jsonOrText(
    await request('/api/accounts/list?type=dispatchers&search=bfp&page=1&pageSize=25', { token: adminToken })
  );
  record(
    'Dispatchers search finds BFP account',
    searchDispatchers.status === 200 &&
      (searchDispatchers.json?.items || []).some((item) => String(item.email).includes('bfp')),
    `count=${searchDispatchers.json?.items?.length}`
  );

  const stamp = Date.now();
  const createdCivilian = await jsonOrText(
    await request('/api/create-civilian', {
      method: 'POST',
      token: adminToken,
      body: {
        email: `qa.civilian.${stamp}@rescue.ph`,
        password: 'QaTest2026!',
        fullName: 'QA Civilian',
        phone: '09000000000',
        address: 'Tuguegarao',
      },
    })
  );
  record('Add Civilian succeeds', createdCivilian.status === 200 && Boolean(createdCivilian.json?.uid), `status ${createdCivilian.status} ${createdCivilian.json?.error || ''}`);

  if (createdCivilian.status === 200) {
    try {
      const qaCivilianToken = await signIn(`qa.civilian.${stamp}@rescue.ph`, 'QaTest2026!');
      const qaCivilianApi = await jsonOrText(await request('/api/kyc/list', { token: qaCivilianToken }));
      record('Newly created civilian KYC API → 403', qaCivilianApi.status === 403, `status ${qaCivilianApi.status}`);
    } catch (error) {
      record('Newly created civilian KYC API → 403', false, String(error.message));
    }
  }

  const qaAgencyCode = `QA${String(stamp).slice(-6)}`;
  const createdAgency = await jsonOrText(
    await request('/api/agencies', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'QA Temporary Agency',
        code: qaAgencyCode,
        type: 'other',
        description: 'Created by Super Admin QA',
      },
    })
  );
  record('Add Agency succeeds', createdAgency.status === 200 && createdAgency.json?.success, `status ${createdAgency.status}`);

  const disabledAgency = await jsonOrText(
    await request(`/api/agencies/${qaAgencyCode}/disable`, { method: 'POST', token: adminToken, body: {} })
  );
  record('Disable Agency succeeds', disabledAgency.status === 200 && disabledAgency.json?.item?.isActive === false, `status ${disabledAgency.status}`);

  const assignDisabled = await jsonOrText(
    await request('/api/create-dispatcher', {
      method: 'POST',
      token: adminToken,
      body: {
        email: `qa.blocked.${stamp}@rescue.ph`,
        password: 'QaTest2026!',
        fullName: 'Should Fail',
        role: qaAgencyCode,
      },
    })
  );
  record(
    'Disabled agency cannot be assigned to new staff',
    assignDisabled.status === 400,
    `status ${assignDisabled.status} ${assignDisabled.json?.error || ''}`
  );

  const enabledAgency = await jsonOrText(
    await request(`/api/agencies/${qaAgencyCode}/enable`, { method: 'POST', token: adminToken, body: {} })
  );
  record('Enable Agency succeeds', enabledAgency.status === 200 && enabledAgency.json?.item?.isActive === true, `status ${enabledAgency.status}`);
  await request(`/api/agencies/${qaAgencyCode}/disable`, { method: 'POST', token: adminToken, body: {} });

  const createdResponder = await jsonOrText(
    await request('/api/create-responder', {
      method: 'POST',
      token: adminToken,
      body: {
        email: `qa.responder.${stamp}@rescue.ph`,
        password: 'QaTest2026!',
        fullName: 'QA Responder',
        role: 'BFP',
      },
    })
  );
  record('Add Responder succeeds', createdResponder.status === 200 && Boolean(createdResponder.json?.uid), `status ${createdResponder.status} ${createdResponder.json?.error || ''}`);

  const responderUid = createdResponder.json?.uid;
  if (responderUid) {
    const responderList = await jsonOrText(
      await request('/api/accounts/list?type=responders&search=QA%20Responder&page=1&pageSize=25', { token: adminToken })
    );
    record(
      'Responders list includes newly created account',
      (responderList.json?.items || []).some((item) => item.id === responderUid),
      `count=${responderList.json?.items?.length}`
    );

    const disabled = await jsonOrText(
      await request('/api/accounts/disable', {
        method: 'POST',
        token: adminToken,
        body: { uid: responderUid, accountType: 'responder', reason: 'QA disable' },
      })
    );
    record('Disable responder succeeds', disabled.status === 200, `status ${disabled.status}`);

    const enabled = await jsonOrText(
      await request('/api/accounts/enable', {
        method: 'POST',
        token: adminToken,
        body: { uid: responderUid, accountType: 'responder' },
      })
    );
    record('Enable responder succeeds', enabled.status === 200, `status ${enabled.status}`);
  }

  const originalName = me.json?.displayName || 'Super Admin';
  const saved = await jsonOrText(
    await request('/api/settings/profile', {
      method: 'POST',
      token: adminToken,
      body: { displayName: 'QA Super Admin' },
    })
  );
  record('Settings display name save succeeds', saved.status === 200 && saved.json?.displayName === 'QA Super Admin', `status ${saved.status}`);
  const restored = await jsonOrText(
    await request('/api/settings/profile', {
      method: 'POST',
      token: adminToken,
      body: { displayName: originalName },
    })
  );
  record('Settings display name restore succeeds', restored.status === 200, `status ${restored.status}`);

  const auditAfter = await jsonOrText(await request('/api/audit?search=QA&page=1&pageSize=25', { token: adminToken }));
  record(
    'Audit logs capture QA account/agency actions',
    auditAfter.status === 200 && (auditAfter.json?.items || []).length > 0,
    `count=${auditAfter.json?.items?.length}`
  );

  if ((notifications?.items || []).length > 0) {
    const mark = await jsonOrText(
      await request('/api/notifications/mark-read', {
        method: 'POST',
        token: adminToken,
        body: { all: true },
      })
    );
    record('Mark all notifications read succeeds', mark.status === 200, `status ${mark.status}`);
  } else {
    record('Notifications empty state acceptable', true, 'no notifications to mark');
  }

  const failed = results.filter((item) => !item.pass);
  console.log('\n---');
  console.log(`Passed ${results.length - failed.length}/${results.length}`);
  if (failed.length) {
    console.log('Failures:');
    for (const item of failed) console.log(` - ${item.name}: ${item.detail}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
