import { render, screen, waitFor } from "@testing-library/react";
import CompanyIntroduction from "./CompanyIntroduction";
import { OfferAllowanceSummary } from "./CompanyOfferAllowance";
import api from "../../api/axios";
jest.mock("../../api/axios", () => ({ get: jest.fn() }));
jest.mock("../../services/billingService", () => ({ billingService: { subscription: jest.fn() } }));
test.each([20, 15, 10, 5, 3])("registration displays configured allowance %s", async allowance => {
  api.get.mockResolvedValue({ data: { introductory_offers: allowance } });
  render(<CompanyIntroduction />);
  expect(await screen.findByText(`Filloni me ${allowance} oferta falas`)).toBeInTheDocument();
});
test("disabled introduction and catalog failure never advertise a guessed allowance", async () => {
  api.get.mockResolvedValue({ data: { introductory_offers: 0 } });
  const { unmount } = render(<CompanyIntroduction />);
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  expect(screen.queryByLabelText("Oferta hyrëse")).not.toBeInTheDocument();
  unmount(); api.get.mockRejectedValue(new Error("Offline"));
  render(<CompanyIntroduction />);
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  expect(screen.queryByLabelText("Oferta hyrëse")).not.toBeInTheDocument();
});
test("existing company shows its granted quota rather than current signup policy", () => {
  render(<OfferAllowanceSummary overview={{ free_offers_remaining: 17, introductory_offers_granted: 20 }} />);
  expect(screen.getByText("17 nga 20 të mbetura")).toBeInTheDocument();
});
test("exhausted allowance remains visible without implying a renewal", () => {
  render(<OfferAllowanceSummary overview={{ free_offers_remaining: 0, introductory_offers_granted: 20 }} />);
  expect(screen.getByText("0 nga 20 të mbetura")).toBeInTheDocument();
  expect(screen.getByText(/Pa abonim automatik/)).toBeInTheDocument();
});
