import { render, screen, fireEvent } from '@testing-library/react';
import CategoryPicker, { projectCategories } from './CategoryPicker';
test('categories group specialties and offer accessible broad choices', () => {
  const categories = projectCategories([{id:1,name:'Lyerje',industry_detail:{id:10,name:'Renovim'}},{id:2,name:'Dysheme',industry_detail:{id:10,name:'Renovim'}}]);
  expect(categories).toHaveLength(1);
  const select=jest.fn();
  render(<CategoryPicker categories={categories} value='10' onChange={select} />);
  expect(screen.getByRole('button',{name:/Renovim/})).toHaveAttribute('aria-pressed','true');
  fireEvent.click(screen.getByRole('button',{name:/Nuk jam i sigurt/}));
  expect(select).toHaveBeenCalledWith('unsure');
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});
