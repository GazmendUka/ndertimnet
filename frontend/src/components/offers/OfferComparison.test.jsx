import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OfferComparison, { offerPrice } from "./OfferComparison";
jest.mock("react-router-dom", () => {
  global.TextEncoder = require("util").TextEncoder;
  return jest.requireActual("react-router");
});
test.each([
  [null, "Pa çmim"],
  [{price_type:"fixed", price_amount:0}, "0 EUR · Çmim fiks"],
  [{price_type:"hourly", price_amount:"20.00",estimated_total:"400.00"}, "20.00 EUR/orë · Vlerësim: 400.00 EUR"],
  [{price_type:"hourly", price_amount:"20.00"}, "20.00 EUR/orë · Totali nuk është përcaktuar"],
])("prices distinguish totals, rates and missing data", (version, result) => expect(offerPrice(version)).toBe(result));
test("only signed offers, two to three columns, no acceptance action", () => {
  const offers = [1,2,3,4,5].map(id => ({id, company:{company_name:`Company ${id}`}, current_version:{is_signed:id<5, version_number:1, price_type:"fixed", price_amount:100}}));
  render(<MemoryRouter><OfferComparison offers={offers}/></MemoryRouter>);
  expect(screen.getAllByRole("checkbox")).toHaveLength(4);
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Company 1"));
  fireEvent.click(screen.getByLabelText("Company 2"));
  expect(screen.getByRole("table")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Company 3"));
  expect(screen.getByLabelText("Company 4")).toBeDisabled();
  fireEvent.click(screen.getByLabelText("Company 1"));
  expect(screen.getByLabelText("Company 4")).not.toBeDisabled();
  expect(screen.getByRole("link", {name:"Company 2"})).toHaveAttribute("href", "/customer/offers/2");
});
