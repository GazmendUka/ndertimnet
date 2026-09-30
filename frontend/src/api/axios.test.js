jest.mock('axios', () => jest.requireActual(process.cwd() + '/node_modules/axios/dist/node/axios.cjs'));
jest.mock('../config/api', () => ({ API_BASE_URL: 'https://test.invalid/api/' }));

let api, sessions, axios, handler, redirect, logs;
const ok = (config, data = {}) => ({ config, data, status: 200, headers: {} });
const failure = (config, status) => Object.assign(new Error('Test failure'), { config, response: status ? { status } : undefined });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise(r => setTimeout(r, 0));
const originalLocation = window.location;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => require('crypto').randomUUID() } });
  delete window.location; window.location = { assign: jest.fn() }; redirect = window.location.assign;
  Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
  logs = jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.isolateModules(() => {
    axios = require('axios');
    const create = axios.create.bind(axios);
    jest.spyOn(axios, 'create').mockImplementation(options => {
      const instance = create(options);
      instance.defaults.adapter = config => handler(config);
      return instance;
    });
    sessions = require('../auth/session'); api = require('./axios').default;
  });
});
afterEach(() => { jest.restoreAllMocks(); window.location = originalLocation; });
function login(remember = true) { return sessions.startSession({ access: 'access-0', refresh: 'refresh-0' }, remember); }
function rotationServer() {
  let access = 'expired', refresh = 'refresh-0', count = 0;
  handler = async config => {
    if (config.url === 'token/refresh/') {
      if (JSON.parse(config.data).refresh !== refresh) throw failure(config, 401);
      count++; access = 'access-' + count; refresh = 'refresh-' + count;
      return ok(config, { access, refresh });
    }
    if (config.headers.Authorization !== 'Bearer ' + access) throw failure(config, 401);
    return ok(config);
  };
  return { expire: () => { access = 'expired'; }, count: () => count };
}
test.each([true, false])('saves rotated tokens for repeated renewal, remember=%s', async remember => {
  login(remember); const server = rotationServer();
  for (let i = 1; i <= 3; i++) {
    server.expire(); await api.get('protected/');
    const storage = remember ? localStorage : sessionStorage;
    expect(storage.getItem('refresh')).toBe('refresh-' + i);
    expect(storage.getItem('access')).toBe('access-' + i);
  }
  expect(server.count()).toBe(3); expect(redirect).not.toHaveBeenCalled();
  expect((remember ? sessionStorage : localStorage).getItem('access')).toBeNull();
});
test('simultaneous expired requests share one renewal', async () => {
  login(); const server = rotationServer();
  await Promise.all(Array.from({ length: 8 }, () => api.get('protected/')));
  expect(server.count()).toBe(1); expect(redirect).not.toHaveBeenCalled();
});
test.each([undefined, 500, 503, 429])('transient refresh failure %s preserves credentials and permits retry', async status => {
  login(); handler = async config => { throw failure(config, config.url === 'token/refresh/' ? status : 401); };
  await expect(api.get('protected/')).rejects.toThrow();
  expect(sessions.getSession().refresh).toBe('refresh-0'); expect(redirect).not.toHaveBeenCalled();
  rotationServer(); await expect(api.get('protected/')).resolves.toMatchObject({ status: 200 });
});
test('invalid refresh ends the session', async () => {
  login(); handler = async config => { throw failure(config, 401); };
  await expect(api.get('protected/')).rejects.toThrow();
  expect(sessions.getSession()).toBeNull(); expect(redirect).toHaveBeenCalledWith('/login');
});
test('missing refresh and a rejected renewed token do not loop', async () => {
  login(); let renewals = 0;
  handler = async config => { if (config.url === 'token/refresh/') { renewals++; return ok(config, { access: 'new', refresh: 'rotated' }); } throw failure(config, 401); };
  await expect(api.get('protected/')).rejects.toThrow(); expect(renewals).toBe(1); expect(sessions.getSession()).toBeNull();
  login(); localStorage.removeItem('refresh');
  await expect(api.get('protected/')).rejects.toThrow(); expect(renewals).toBe(1);
});
test('malformed refresh response preserves existing credentials', async () => {
  login(); handler = async config => { if (config.url === 'token/refresh/') return ok(config, { access: 'new' }); throw failure(config, 401); };
  await expect(api.get('protected/')).rejects.toThrow('Incomplete');
  expect(sessions.getSession().refresh).toBe('refresh-0'); expect(redirect).not.toHaveBeenCalled();
});
test.each(['logout', 'switch'])('late refresh cannot undo %s or replay an operation under another user', async action => {
  login(); const gate = deferred(); let started = false, protectedCalls = 0;
  handler = async config => {
    if (config.url === 'token/refresh/') { started = true; await gate.promise; return ok(config, { access: 'old-new', refresh: 'old-rotated' }); }
    protectedCalls++; throw failure(config, 401);
  };
  const pending = api.post('protected/', { test: true }).catch(e => e);
  while (!started) await tick();
  if (action === 'logout') sessions.clearSession(); else sessions.startSession({ access: 'other', refresh: 'other-refresh' }, false);
  gate.resolve(); expect(axios.isCancel(await pending)).toBe(true);
  expect(sessions.getSession()?.access || null).toBe(action === 'logout' ? null : 'other');
  expect(protectedCalls).toBe(1); expect(redirect).not.toHaveBeenCalled();
});
test('late failure from old account cannot log out the new account', async () => {
  login(); const gate = deferred(); let started = false;
  handler = async config => { if (config.url === 'token/refresh/') { started = true; await gate.promise; } throw failure(config, 401); };
  const pending = api.get('protected/').catch(e => e); while (!started) await tick();
  sessions.startSession({ access: 'other', refresh: 'other-refresh' }, true); gate.resolve(); await pending;
  expect(sessions.getSession().access).toBe('other'); expect(redirect).not.toHaveBeenCalled();
});
test('Web Lock rechecks credentials renewed by another tab', async () => {
  login(); let calls = 0;
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: jest.fn(async (name, callback) => {
    sessions.saveRenewedSession(sessions.getSession(), { access: 'from-tab', refresh: 'tab-refresh' });
    return callback();
  }) } });
  handler = async config => { calls++; if (config.headers.Authorization === 'Bearer from-tab') return ok(config); throw failure(config, 401); };
  await api.get('protected/'); expect(calls).toBe(2); expect(navigator.locks.request).toHaveBeenCalledTimes(1);
});
test('public request failures do not refresh or log sensitive payloads', async () => {
  login(); let calls = 0; handler = async config => { calls++; throw failure(config, 401); };
  await expect(api.post('login/', { password: 'synthetic-secret' }, { skipAuth: true })).rejects.toThrow();
  expect(calls).toBe(1); expect(redirect).not.toHaveBeenCalled();
  expect(JSON.stringify(logs.mock.calls)).not.toContain('synthetic-secret');
});

test('a late 401 reuses the already renewed credential', async () => {
  login(); const gate = deferred(); let slowStarted = false, renewals = 0;
  handler = async config => {
    if (config.url === 'token/refresh/') { renewals++; return ok(config, { access: 'new', refresh: 'rotated' }); }
    if (config.headers.Authorization === 'Bearer new') return ok(config);
    if (config.url === 'slow/') { slowStarted = true; await gate.promise; }
    throw failure(config, 401);
  };
  const slow = api.get('slow/'); while (!slowStarted) await tick();
  await api.get('fast/'); gate.resolve(); await slow;
  expect(renewals).toBe(1); expect(redirect).not.toHaveBeenCalled();
});
test('a successful old-account response is discarded after account switch', async () => {
  login(); const gate = deferred(); let started = false;
  handler = async config => { started = true; await gate.promise; return ok(config, { privateData: 'synthetic' }); };
  const pending = api.get('protected/').catch(e => e); while (!started) await tick();
  sessions.startSession({ access: 'other', refresh: 'other-refresh' }, false); gate.resolve();
  expect(axios.isCancel(await pending)).toBe(true); expect(sessions.getSession().access).toBe('other');
});
test.each([true, false])('legacy sessions without IDs are renewed, remember=%s', async remember => {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('access', 'access-0'); storage.setItem('refresh', 'refresh-0');
  rotationServer(); await api.get('protected/');
  expect(storage.getItem('refresh')).toBe('refresh-1'); expect(sessions.getSession().id).toBeTruthy();
});
