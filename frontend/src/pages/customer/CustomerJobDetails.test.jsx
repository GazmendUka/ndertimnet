import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CustomerJobDetails from './CustomerJobDetails';
import api from '../../api/axios';
import { useAuth } from '../../auth/AuthContext';

jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return jest.requireActual('react-router');
});
jest.mock('../../api/axios', () => ({ get: jest.fn() }));
jest.mock('../../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../components/payments/PlatformBilling', () => ({ PublicationBilling: () => null }));
const job = { id: 1, title: 'Test job', description: 'Test description', created_at: new Date().toISOString(), is_active: false, moderation_status: 'pending', status: 'open' };
function show(data = job, offers = []) {
  useAuth.mockReturnValue({ access: 'test', user: { id: 1 }, isCustomer: true, isEmailVerified: true });
  api.get.mockImplementation(url => Promise.resolve({ data: url.startsWith('jobrequests/') ? data : offers }));
  render(<MemoryRouter initialEntries={['/customer/jobrequests/1']}><Routes><Route path='/customer/jobrequests/:id' element={<CustomerJobDetails />} /></Routes></MemoryRouter>);
}
test.each(['pending', 'changes_requested', 'rejected', 'blocked'])('%s is not mislabeled closed without winner', async moderation_status => {
  show({ ...job, moderation_status });
  await screen.findByText('Test job');
  expect(screen.queryByText('Kjo kërkesë është mbyllur pa ofertë fituese.')).not.toBeInTheDocument();
});
test('accepted job stays in progress until explicit completion', async () => {
  show({ ...job, moderation_status: 'approved', status: 'in_progress', winner_offer: { id: 1 } }, [{ id: 1, status: 'accepted', company: { company_name: 'Test company' } }]);
  expect(await screen.findByText('Oferta u pranua — puna në vazhdim')).toBeInTheDocument();
  expect(screen.getByText('Në proces')).toBeInTheDocument();
  expect(screen.queryByText(/Kërkesa është përfunduar/)).not.toBeInTheDocument();
});
test('closed approved job without winner retains closed explanation', async () => {
  show({ ...job, moderation_status: 'approved' });
  expect(await screen.findByText('Kjo kërkesë është mbyllur pa ofertë fituese.')).toBeInTheDocument();
});
