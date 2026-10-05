import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

test.each([['draft', 'Projekt-ofertë'], ['signed', 'Në pritje të përgjigjes'], ['accepted', 'E pranuar'], ['rejected', 'E refuzuar'], ['locked', 'E bllokuar']])('offer %s has its own label', (status, label) => {
  render(<StatusBadge status={status} />);
  expect(screen.getByText(label)).toBeInTheDocument();
  expect(screen.queryByText('E mbyllur')).not.toBeInTheDocument();
});

test.each([[true, 'Aktiv'], [false, 'E mbyllur']])('existing active=%s job badge stays compatible', (active, label) => {
  render(<StatusBadge active={active} />);
  expect(screen.getByText(label)).toBeInTheDocument();
});
