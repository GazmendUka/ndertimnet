import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CompanyProfile from "./CompanyProfile";
import { useAuth } from "../../auth/AuthContext";
import api from "../../api/axios";

jest.mock("react-router-dom", () => {
  global.TextEncoder = require("util").TextEncoder;
  return jest.requireActual("react-router");
});
jest.mock("../../auth/AuthContext", () => ({useAuth:jest.fn()}));
jest.mock("../../api/axios", () => ({get:jest.fn(),patch:jest.fn()}));
const refreshMe=jest.fn();
const company={company_name:"Example company",org_number:"TEST",phone:"000000",address:"Example address",email_verified:true,description:"Example description of company services.",default_offer_presentation:"Example offer introduction.",professions_detail:[{id:1}],cities_detail:[{id:1}],registration_document:null,is_verified:false,profile_sections:{basic:true,professions:true,service_areas:true,description:true,offer_text:true,verification:false}};
function view(data=company) {
  api.get.mockImplementation(url=>Promise.resolve({data:url.includes("profile/company")?data:[]}));
  return render(<MemoryRouter><CompanyProfile /></MemoryRouter>);
}
beforeEach(()=>{jest.resetAllMocks();refreshMe.mockResolvedValue(undefined);useAuth.mockReturnValue({access:"test-only",user:{email_verified:true},refreshMe});});
test("five complete steps show 5/6 and 83%, with verification still incomplete",async()=>{
  view();
  expect(await screen.findByText("5 nga 6 hapa të plotësuar")).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow","83");
  expect(screen.getByText("Zgjidh dokumentin e regjistrimit")).toBeInTheDocument();
});
test("document uploaded completes sixth step without requiring or granting admin approval",async()=>{
  view({...company,registration_document:"/example.pdf",profile_sections:{...company.profile_sections,verification:true}});
  expect(await screen.findByText("6 nga 6 hapa të plotësuar")).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow","100");
  expect(api.patch).not.toHaveBeenCalled();
});
test("optional offer text is included in six-step display but not made mandatory",async()=>{
  view({...company,default_offer_presentation:"",registration_document:"/example.pdf",profile_sections:{...company.profile_sections,offer_text:false,verification:true}});
  expect(await screen.findByText("5 nga 6 hapa të plotësuar")).toBeInTheDocument();
  expect(screen.getByText("Hapi 5 është opsional.")).toBeInTheDocument();
});
test("saving offer presentation refreshes shared saved profile state",async()=>{
  view({...company,default_offer_presentation:"",profile_sections:{...company.profile_sections,offer_text:false}});
  await screen.findByText("4 nga 6 hapa të plotësuar");
  // Navigate explicitly so the test does not depend on initial step selection.
  fireEvent.click(screen.getByRole("button",{name:/Hapi 5 Oferta/}));
  const field=screen.getByRole("textbox");
  fireEvent.change(field,{target:{value:company.default_offer_presentation}});
  expect(refreshMe).not.toHaveBeenCalled();
  api.patch.mockResolvedValue({data:company});
  fireEvent.click(screen.getByRole("button",{name:/Ruaj dhe vazhdo/}));
  await waitFor(()=>expect(refreshMe).toHaveBeenCalledTimes(1));
  expect(api.patch.mock.calls[0][0]).toBe("/accounts/profile/company/");
  expect(api.patch.mock.calls[0][1].get("default_offer_presentation")).toBe(company.default_offer_presentation);
});
