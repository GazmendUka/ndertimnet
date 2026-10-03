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
  const field=document.querySelector('textarea[name="default_offer_presentation"]');
  fireEvent.change(field,{target:{value:company.default_offer_presentation}});
  expect(refreshMe).not.toHaveBeenCalled();
  api.patch.mockResolvedValue({data:company});
  fireEvent.click(screen.getByRole("button",{name:/Ruaj dhe vazhdo/}));
  await waitFor(()=>expect(refreshMe).toHaveBeenCalledTimes(1));
  expect(api.patch.mock.calls[0][0]).toBe("/accounts/profile/company/");
  expect(api.patch.mock.calls[0][1].get("default_offer_presentation")).toBe(company.default_offer_presentation);
});

const uploadFailure = "Dokumenti nuk mund të ngarkohet tani. Provoni përsëri më vonë. Nëse problemi vazhdon, kontaktoni mbështetjen.";
async function chooseDocument() {
  await screen.findByText("Zgjidh dokumentin e regjistrimit");
  const file = new File(["synthetic document"], "registration.jpg", { type: "image/jpeg" });
  fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
  return file;
}

test.each([
  { response: { status: 500, data: '<!doctype html><html><h1>Server Error (500)</h1></html>' } },
  { response: { status: 503, data: { message: "Internal provider diagnostics" } } },
  { response: { status: 413, data: '<html><h1>Request too large</h1></html>' } },
  { message: "Network Error" },
])("failed document upload shows a safe message and retains the file for retry (%#)", async (failure) => {
  view();
  const file = await chooseDocument();
  api.patch.mockRejectedValueOnce(failure);
  fireEvent.click(screen.getByRole("button", { name: /Përfundo profilin/ }));
  expect(await screen.findByText(uploadFailure)).toBeInTheDocument();
  expect(screen.queryByText(/doctype|Internal provider diagnostics|Request too large/)).not.toBeInTheDocument();
  expect(screen.getByText("registration.jpg")).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "83");
  expect(refreshMe).not.toHaveBeenCalled();

  api.patch.mockResolvedValueOnce({ data: { data: {
    ...company, registration_document: "/registration.jpg",
    profile_sections: { ...company.profile_sections, verification: true },
  } } });
  fireEvent.click(screen.getByRole("button", { name: /Përfundo profilin/ }));
  expect(await screen.findByText("Profili juaj është i plotë")).toBeInTheDocument();
  expect(api.patch.mock.calls[1][1].get("registration_document")).toBe(file);
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
});

test("document validation errors remain readable", async () => {
  view();
  await chooseDocument();
  api.patch.mockRejectedValueOnce({ response: { status: 400, data: {
    message: { registration_document: ["Dokumenti duhet të jetë 5 MB ose më i vogël."] },
  } } });
  fireEvent.click(screen.getByRole("button", { name: /Përfundo profilin/ }));
  expect(await screen.findByText("Dokumenti duhet të jetë 5 MB ose më i vogël.")).toBeInTheDocument();
});
