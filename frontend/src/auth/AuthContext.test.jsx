import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { startSession, getSession } from './session';
import api from '../api/axios';
import { deactivateCurrentPushDevice } from '../services/notificationService';
jest.mock('../api/axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../services/notificationService', () => ({ deactivateCurrentPushDevice: jest.fn() }));
const user = { id: 42, role: 'customer' };
function Child() {
  const auth = useAuth();
  return <><span>{auth.loading ? 'loading' : auth.user ? 'signed in' : 'signed out'}</span><button onClick={auth.logout}>Logout</button></>;
}
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => require('crypto').randomUUID() } });
  startSession({ access: 'test-access', refresh: 'test-refresh' }, true);
  deactivateCurrentPushDevice.mockResolvedValue();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());
test.each([undefined, 503])('startup failure %s preserves login and offers retry', async status => {
  api.get.mockRejectedValueOnce(Object.assign(new Error('temporary'), { response: status ? { status } : undefined })).mockResolvedValueOnce({ data: user });
  render(<AuthProvider><Child /></AuthProvider>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Lidhja nuk mund të verifikohet');
  expect(getSession().refresh).toBe('test-refresh'); expect(deactivateCurrentPushDevice).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Provo përsëri' }));
  expect(await screen.findByText('signed in')).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledTimes(2);
});
test('confirmed unauthorized startup does not retain authenticated state', async () => {
  api.get.mockRejectedValueOnce(Object.assign(new Error('unauthorized'), { response: { status: 401 } }));
  render(<AuthProvider><Child /></AuthProvider>);
  expect(await screen.findByText('signed out')).toBeInTheDocument(); expect(getSession()).toBeNull();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
test('old profile response cannot populate another login', async () => {
  let resolve; api.get.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  render(<AuthProvider><Child /></AuthProvider>);
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  await act(async () => {
    startSession({ access: 'other', refresh: 'other-refresh' }, false);
    resolve({ data: user });
  });
  expect(await screen.findByText('signed out')).toBeInTheDocument();
  expect(sessionStorage.getItem('user')).toBeNull(); expect(getSession().access).toBe('other');
});
