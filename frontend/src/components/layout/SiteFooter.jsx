import React from "react";
import { Link } from "react-router-dom";
import LegalLinks from "../LegalLinks";
import "./SiteFooter.css";

const cities = [
  ["/ndertim/prishtine", "Prishtinë"], ["/ndertim/tirane", "Tiranë"],
  ["/ndertim/durres", "Durrës"], ["/ndertim/vlore", "Vlorë"],
  ["/ndertim/prizren", "Prizren"], ["/ndertim/mitrovice", "Mitrovicë"],
];
const services = [
  ["/ndertime", "Ndërtim"], ["/renovime", "Renovime"],
  ["/renovim-banjo", "Renovim banjo"], ["/renovim-kuzhine", "Renovim kuzhine"],
  ["/elektricist", "Elektricist"], ["/lyerje", "Lyerje"],
  ["/fasada", "Fasada"], ["/cati", "Çati"],
  ["/pllakashtrues", "Pllakashtrues"], ["/dysheme", "Dysheme"],
];

function FooterGroup({ title, links, services = false }) {
  return (
    <nav className={services ? "site-footer__group site-footer__services" : "site-footer__group"} aria-label={title}>
      <h2>{title}</h2>
      <ul>{links.map(([to, label]) => <li key={to}><Link to={to}>{label}</Link></li>)}</ul>
    </nav>
  );
}

export default function SiteFooter({ isNativeApp = false }) {
  return (
    <footer className={`site-footer${isNativeApp ? " site-footer--native" : ""}`}>
      <div className="site-footer__inner">
        <div className="site-footer__main">
          <div className="site-footer__brand">
            <Link to="/" className="site-footer__logo" aria-label="Ndertimnet — Ballina">
              <img src="/ndertimnet-logo-full-width/ndertimnet-logo-search-transparent.png" alt="Ndertimnet" />
            </Link>
            <p>Platformë për të gjetur kompani ndërtimi dhe profesionistë për çdo projekt ndërtimi dhe renovimi në Kosovë dhe Shqipëri.</p>
            <span className="site-footer__region">Kosovë & Shqipëri</span>
          </div>
          <FooterGroup title="Qytetet" links={cities} />
          <FooterGroup title="Shërbimet" links={services} services />
        </div>
        <div className="site-footer__bottom">
          <p className="site-footer__copyright">© {new Date().getFullYear()} Ndertimnet. <span>Të gjitha të drejtat e rezervuara.</span></p>
          <LegalLinks variant="footer" />
        </div>
      </div>
    </footer>
  );
}
