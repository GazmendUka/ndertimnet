import { render, screen } from "@testing-library/react";
import { Capacitor } from "@capacitor/core";
import { billingService } from "../../services/billingService";
import { resetOfferIntroduction } from "./offerIntroductionSession";
import OfferIntroduction from "./OfferIntroduction";

jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: jest.fn(), getPlatform: jest.fn() } }));
jest.mock("../../services/billingService", () => ({ billingService: { subscription: jest.fn() } }));
beforeEach(() => {
  resetOfferIntroduction();
  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();
  billingService.subscription.mockResolvedValue({ data: { free_offers_remaining: 25 } });
});

test.each(["ios", "android", "web"])("%s onboarding keeps free offer guidance and only iOS removes plan promotion", async platform => {
  Capacitor.isNativePlatform.mockReturnValue(platform !== "web");
  Capacitor.getPlatform.mockReturnValue(platform);
  render(<OfferIntroduction userId="synthetic-company" />);
  expect(await screen.findByText("Ju kanë mbetur 25 oferta falas.")).toBeInTheDocument();
  expect(screen.getByText(/Leximi i kërkesave dhe përgatitja e ofertës/)).toBeInTheDocument();
  if (platform === "ios") {
    expect(screen.queryByText(/zgjidhni Standard/)).not.toBeInTheDocument();
    expect(screen.getByText(/Ofertat ekzistuese mbeten të disponueshme/)).toBeInTheDocument();
  } else expect(screen.getByText(/zgjidhni Standard/)).toBeInTheDocument();
});
