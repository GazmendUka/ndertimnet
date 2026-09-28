import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CompanyOnboardingBanner from "./CompanyOnboardingBanner";
import { useAuth } from "../../auth/AuthContext";
import api from "../../api/axios";
import { COMPANY_PROFILE_KEYS, companyProfileProgress } from "../../utils/companyProfileProgress";

jest.mock("react-router-dom", () => {
  global.TextEncoder = require("util").TextEncoder;
  return jest.requireActual("react-router");
});
jest.mock("../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../api/axios", () => ({ post: jest.fn() }));
const sections = Object.fromEntries(COMPANY_PROFILE_KEYS.map(key => [key, true]));
beforeEach(() => { jest.resetAllMocks(); useAuth.mockReturnValue({ user: { email_verified: true } }); });
const view = (data, props = {}) => render(<MemoryRouter><CompanyOnboardingBanner company={{ profile_sections: data }} {...props} /><Routes><Route path="/" element={null} /><Route path="/company/profile" element={<p>Profile destination</p>} /></Routes></MemoryRouter>);

test("five first steps complete hides reminder although legacy completion is 80%", () => {
  view({ ...sections, verification: false }, { profileCompletion: 80 });
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
  expect(companyProfileProgress({ ...sections, verification: false })).toMatchObject({completed:5,total:6,percent:83,needsReminder:false});
});
test.each(COMPANY_PROFILE_KEYS.slice(0,4))("missing %s still shows reminder even when five other steps are complete", key => {
  view({ ...sections, [key]: false });
  expect(screen.getByText("5 nga 6 hapa")).toBeInTheDocument();
  expect(screen.getByRole("button", {name:"Plotëso Profilin"})).toBeInTheDocument();
});
test("complete required steps do not nag about optional offer text", () => {
  view({ ...sections, offer_text: false });
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
});
test("all six steps complete hides reminder and gives 100%", () => {
  view(sections);
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
  expect(companyProfileProgress(sections)).toMatchObject({completed:6,total:6,percent:100});
});
test("empty profile counts zero, not backend metadata", () => {
  expect(companyProfileProgress({completed:5,total:5})).toMatchObject({completed:0,total:6,percent:0,needsReminder:true});
});
test("profile CTA still navigates", () => {
  view({});
  fireEvent.click(screen.getByRole("button",{name:"Plotëso Profilin"}));
  expect(screen.getByText("Profile destination")).toBeInTheDocument();
});
test("email verification still takes priority and resend works", async () => {
  useAuth.mockReturnValue({user:{email_verified:false}});
  api.post.mockResolvedValue({});
  view(sections, {resendVerificationEndpoint:"/accounts/resend-verification/"});
  fireEvent.click(screen.getByRole("button",{name:"Verifiko Email-in"}));
  expect(await screen.findByText(/Email-i i verifikimit u dërgua/)).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith("/accounts/resend-verification/");
});
test("resend failure stays visible", async () => {
  useAuth.mockReturnValue({user:{email_verified:false}});
  api.post.mockRejectedValue({response:{data:{detail:"Please retry"}}});
  view(sections, {resendVerificationEndpoint:"/accounts/resend-verification/"});
  fireEvent.click(screen.getByRole("button",{name:"Verifiko Email-in"}));
  expect(await screen.findByText("Please retry")).toBeInTheDocument();
});
test("legacy percentage does not assume verification is the missing step", () => {
  view(undefined,{profileCompletion:80});
  expect(screen.getByRole("button",{name:"Plotëso Profilin"})).toBeInTheDocument();
});
