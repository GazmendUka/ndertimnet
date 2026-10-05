import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import JobRequestCreate from './JobRequestCreate';
import api from '../../api/axios';
import drafts from '../../services/jobRequestDraftService';
jest.mock('react-router-dom', () => { global.TextEncoder=require('util').TextEncoder; return jest.requireActual('react-router'); });
jest.mock('../../api/axios',()=>({get:jest.fn()}));
jest.mock('../../auth/AuthContext',()=>({useAuth:()=>({isEmailVerified:true})}));
jest.mock('../../services/jobRequestDraftService',()=>({getMyDrafts:jest.fn(),createDraft:jest.fn(),updateDraft:jest.fn()}));
jest.mock('../../components/payments/PlatformBilling',()=>({ListingPrice:()=>null}));
jest.mock('react-hot-toast',()=>({toast:{success:jest.fn(),error:jest.fn()}}));
beforeEach(()=>{
 api.get.mockImplementation(url=>Promise.resolve({data:url.includes('professions')?[{id:2,name:'Lyerje',industry_detail:{id:10,name:'Renovim'}}]:url.includes('cities')?[{id:1,name:'Prishtina'}]:{data:{}}}));
 drafts.getMyDrafts.mockResolvedValue([]);
 drafts.createDraft.mockResolvedValue({id:1,current_step:2,title:'Renovim shtepie',description:'Dua te rinovoj dhomen e ndenjes.',city:1,address:'Test',postal_code:'10000'});
 drafts.updateDraft.mockImplementation((id,data)=>Promise.resolve({id,...data}));
});
test('category is chosen in step two and persists without a specialty',async()=>{
 render(<MemoryRouter><JobRequestCreate/></MemoryRouter>);
 const unsure=await screen.findByRole('button',{name:/Nuk jam i sigurt/});
 fireEvent.click(unsure);
 fireEvent.click(screen.getByRole('button',{name:'Vazhdo'}));
 await waitFor(()=>expect(drafts.updateDraft).toHaveBeenCalledWith(1,expect.objectContaining({industry:null,profession:null,category_mode:'unsure',current_step:3})));
});
test('step four only asks for location, not category or specialty',async()=>{
 drafts.createDraft.mockResolvedValue({id:1,current_step:4,title:'Renovim shtepie',city:1,address:'Test',postal_code:'10000',industry:10});
 render(<MemoryRouter><JobRequestCreate/></MemoryRouter>);
 await screen.findByText('Hapi 4 nga 5');
 expect(screen.queryByText('Specialiteti *')).not.toBeInTheDocument();
 expect(screen.queryByText('Kategoria kryesore *')).not.toBeInTheDocument();
});
