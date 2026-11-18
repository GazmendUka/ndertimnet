import {render,screen,fireEvent,waitFor} from "@testing-library/react";
import Login from "./Login";
const mockNavigate=jest.fn(), mockLogin=jest.fn();let mockSandbox=true;
jest.mock("./AuthContext",()=>({useAuth:()=>({login:mockLogin})}));
jest.mock("../config/api",()=>({get IS_IOS_STORE_SANDBOX(){return mockSandbox;}}));
jest.mock("react-router-dom",()=>({useNavigate:()=>mockNavigate,Link:({children,to})=><a href={to}>{children}</a>}));
jest.mock("../utils/guestProject",()=>({readGuestProject:()=>null}));
beforeEach(()=>{jest.clearAllMocks();mockSandbox=true;});
async function login(){render(<Login/>);fireEvent.change(screen.getByLabelText("Email"),{target:{value:"synthetic@example.test"}});fireEvent.change(screen.getByLabelText("Fjalëkalimi"),{target:{value:"Synthetic-only-18!pass"}});fireEvent.click(screen.getByRole("button",{name:"Hyni"}));await waitFor(()=>expect(mockNavigate).toHaveBeenCalled());}
test("unverified test user is taken to account confirmation",async()=>{mockLogin.mockResolvedValue({role:"company",email_verified:false});await login();expect(mockNavigate).toHaveBeenCalledWith("/verify-email");expect(screen.getByText(/Version testuese/)).toBeInTheDocument();});
test("verified test user continues normally",async()=>{mockLogin.mockResolvedValue({role:"company",email_verified:true});await login();expect(mockNavigate).toHaveBeenCalledWith("/");});
test("ordinary account keeps its existing login destination without test copy",async()=>{mockSandbox=false;mockLogin.mockResolvedValue({role:"company",email_verified:false});await login();expect(mockNavigate).toHaveBeenCalledWith("/");expect(screen.queryByText(/Version testuese/)).not.toBeInTheDocument();});
