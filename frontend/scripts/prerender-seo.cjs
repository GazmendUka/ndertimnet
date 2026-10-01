/* Render the existing, data-independent SEO pages at build time.
 * No browser session, API requests, user data, or duplicate marketing copy.
 * Hosting must serve these files before its SPA fallback (see deployment notes).
 */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const babel = require("@babel/core");
const React = require("react");
const { renderToString } = require("react-dom/server");
const { StaticRouter } = require("react-router");
const { Helmet } = require("react-helmet");
const root = path.resolve(__dirname, "..");
const build = path.join(root, "build");
const template = fs.readFileSync(path.join(build, "index.html"), "utf8");
const routes = [
  ["/ndertim/prishtine", "NdertimPrishtine"], ["/ndertim/tirane", "NdertimTirane"],
  ["/ndertim/prizren", "NdertimPrizren"], ["/ndertim/mitrovice", "NdertimMitrovice"],
  ["/ndertim/durres", "NdertimDurres"], ["/ndertim/vlore", "NdertimVlore"],
  ["/renovim-kuzhine", "services/RenovimKuzhine"], ["/renovim-banjo", "services/RenovimBanjo"],
  ["/renovime", "services/Renovime"], ["/ndertime", "services/Ndertime"],
  ["/elektricist", "services/Elektricist"], ["/lyerje", "services/Lyerje"],
  ["/fasada", "services/Fasada"], ["/cati", "services/Cati"],
  ["/pllakashtrues", "services/Pllakashtrues"], ["/dysheme", "services/Dysheme"],
];
const escape = text => String(text).replace(/[&<>"']/g, ch => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[ch]));
Helmet.canUseDOM = false;
for (const [route, source] of routes) {
  const filename = path.join(root, "src/pages/seo", source + ".jsx");
  const compiled = babel.transformFileSync(filename, {
    babelrc: false, configFile: false,
    presets: [[require.resolve("@babel/preset-env"), {targets:{node:"current"},modules:"commonjs"}], [require.resolve("@babel/preset-react"), {runtime:"automatic"}]],
  }).code;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(compiled, filename);
  const body = renderToString(React.createElement(StaticRouter, {location:route}, React.createElement(loaded.exports.default)));
  const helmet = Helmet.renderStatic();
  const metas = helmet.meta.toComponent().map(element => element.props);
  const description = metas.find(meta => meta.name === "description")?.content;
  const canonical = helmet.link.toComponent().find(element => element.props.rel === "canonical")?.props.href;
  if (!description || canonical !== `https://ndertimnet.com${route}` || !body.includes("<h1")) throw new Error(`Incomplete SEO page: ${route}`);
  const title = helmet.title.toComponent()[0].props.children;
  let head = helmet.title.toString() + helmet.meta.toString() + helmet.link.toString();
  const fallback = {"og:title":title, "og:description":description, "og:url":canonical, "og:type":"website", "og:image":"https://ndertimnet.com/og-image.jpg", "twitter:card":"summary_large_image", "twitter:title":title, "twitter:description":description, "twitter:image":"https://ndertimnet.com/og-image.jpg"};
  for (const [name, content] of Object.entries(fallback)) {
    if (!metas.some(meta => meta.property === name || meta.name === name)) head += `<meta data-react-helmet="true" ${name.startsWith("og:") ? "property" : "name"}="${name}" content="${escape(content)}"/>`;
  }
  const html = template.replace(/<head>([\s\S]*?)<\/head>/, (_, existing) => `<head>${existing.replace(/<title>[\s\S]*?<\/title>/g, "").replace(/<(?:meta|link)\b[^>]*data-react-helmet="true"[^>]*>/g, "")}${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  const target = path.join(build, route.slice(1));
  fs.mkdirSync(target, {recursive:true});
  fs.writeFileSync(path.join(target, "index.html"), html);
}
console.log(`Prerendered ${routes.length} public SEO pages with unique titles, descriptions and sharing metadata.`);
