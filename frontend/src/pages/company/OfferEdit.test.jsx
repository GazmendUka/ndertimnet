import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import OfferEdit from './OfferEdit';
import api from '../../api/axios';
import { useAuth } from '../../auth/AuthContext';

jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return jest.requireActual('react-router');
});
jest.mock('../../api/axios', () => ({ get: jest.fn(), patch: jest.fn(), post: jest.fn() }));
jest.mock('../../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../components/payments/PlatformBilling', () => ({ OfferBilling: () => null }));
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const offer = { id: 1, status: 'draft', current_version: { version_number: 1, presentation_text: 'Presentation test', can_start_from: '2026-10-01', duration_text: '2026-10-10', price_type: 'fixed', price_amount: '1000', includes_text: 'Materials included', excludes_text: 'Extras not included' } };
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ access: 'test', user: { company: { website: '', profile_step: 1, can_access_marketplace: true } } });
  api.get.mockResolvedValue({ data: offer });
  api.patch.mockResolvedValue({ data: offer });
  api.post.mockResolvedValue({ data: { ...offer, status: 'signed' } });
});
function show(step = 5) {
  render(<MemoryRouter initialEntries={['/company/jobrequests/1/offer/edit?step=' + step]}><Routes><Route path='/company/jobrequests/:jobId/offer/edit' element={<OfferEdit />} /></Routes></MemoryRouter>);
}
test('ready company without website can sign even with old step value', async () => {
  show();
  const send = await screen.findByRole('button', { name: 'Nënshkruaj dhe dërgo ofertën' });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.change(screen.getByPlaceholderText('1234567890123'), { target: { value: '0000' } });
  expect(send).toBeEnabled();
  fireEvent.click(send);
  expect(await screen.findByText('Oferta u nënshkrua me sukses')).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('offers/1/sign/', { personal_number: '0000' });
  expect(screen.queryByText(/Nëse klienti e pranon/)).not.toBeInTheDocument();
});
test('missing marketplace requirements still prevent signing', async () => {
  useAuth.mockReturnValue({ access: 'test', user: { company: { profile_step: 4, can_access_marketplace: false } } });
  show();
  const send = await screen.findByRole('button', { name: 'Nënshkruaj dhe dërgo ofertën' });
  fireEvent.click(screen.getByRole('checkbox'));
  expect(send).toBeDisabled();
});
test('default offer presentation is sent using the profile API multipart format', async () => {
  show(1);
  const field = await screen.findByPlaceholderText('Prezantoni shkurt kompaninë tuaj...');
  fireEvent.change(field, { target: { value: 'New reusable presentation' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ruaj dhe vazhdo' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));
  const [url, data] = api.patch.mock.calls[1];
  expect(url).toBe('accounts/profile/company/');
  expect(data).toBeInstanceOf(FormData);
  expect(data.get('default_offer_presentation')).toBe('New reusable presentation');
});
