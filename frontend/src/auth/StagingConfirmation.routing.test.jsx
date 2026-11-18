import React,{useState} from "react";
import {render,screen,fireEvent,waitFor} from "@testing-library/react";
import {MemoryRouter,Routes,Route} from "react-router-dom";
import {TestProvider} from "./AuthContext";
import Login from "./Login";
import PublicOnlyRoute from "./PublicOnlyRoute";
import AuthRedirect from "./AuthRedirect";
import StagingAccountConfirmation from "./StagingAccountConfirmation";
import api from "../api/axios";
let mockSandbox=true;
// CRA's older Jest resolver does not support react-router's /dom package export.
// These routes use the real core router, including its navigation effects.
jest.mock("react-router-dom",()=>{const {TextEncoder,TextDecoder}=require("util");Object.assign(global,{TextEncoder,TextDecoder});return jest.requireActual("react-router");});
jest.mock("./AuthContext",()=>{const React=require("react");const C=React.createContext();return {TestProvider:C.Provider,useAuth:()=>React.useContext(C)};});
jest.mock("../config/api",()=>({get IS_IOS_STORE_SANDBOX(){return mockSandbox;}}));
jest.mock("../api/axios",()=>({post:jest.fn()}));
jest.mock("../pages/landing_page",()=>()=> <p>Landing</p>);
jest.mock("../utils/guestProject",()=>({readGuestProject:()=>null}));
function TestApp(){
 const [user,setUser]=useState(null);
 const login=async()=>{const account={role:"company",email_verified:false};setUser(account);await Promise.resolve();return account;};
 return <TestProvider value={{user,loading:false,login,refreshMe:async()=>setUser({role:"company",email_verified:true})}}>
  <MemoryRouter initialEntries={["/login"]}><Routes>
   <Route path="/login" element={<PublicOnlyRoute><Login/></PublicOnlyRoute>}/>
   <Route path="/" element={<AuthRedirect/>}/>
   <Route path="/verify-email" element={<StagingAccountConfirmation/>}/>
   <Route path="/company" element={<p>Company dashboard</p>}/>
  </Routes></MemoryRouter>
 </TestProvider>;
}
async function signIn(){fireEvent.change(screen.getByLabelText("Email"),{target:{value:"synthetic@example.test"}});fireEvent.change(screen.getByLabelText("Fjalëkalimi"),{target:{value:"Synthetic-test-pass-18!"}});fireEvent.click(screen.getByRole("button",{name:"Hyni"}));}
beforeEach(()=>jest.clearAllMocks());
test("the public-route redirect cannot race test login back to the dashboard before confirmation",async()=>{
 mockSandbox=true;api.post.mockResolvedValue({data:{test_account:true}});render(<TestApp/>);await signIn();
 expect(await screen.findByRole("heading",{name:"Konfirmoni llogarinë testuese"})).toBeInTheDocument();
 expect(screen.queryByText("Company dashboard")).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Konfirmo llogarinë testuese"}));
 expect(await screen.findByText("Company dashboard")).toBeInTheDocument();
 expect(api.post).toHaveBeenCalledTimes(1);expect(api.post).toHaveBeenCalledWith("accounts/test/confirm-account/");
});
test("ordinary login still reaches the dashboard without staging confirmation",async()=>{
 mockSandbox=false;render(<TestApp/>);await signIn();
 expect(await screen.findByText("Company dashboard")).toBeInTheDocument();
 await waitFor(()=>expect(api.post).not.toHaveBeenCalled());
});
