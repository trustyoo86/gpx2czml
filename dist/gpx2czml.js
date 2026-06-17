import { DOMParser as D } from "@xmldom/xmldom";
function S() {
  const e = globalThis.DOMParser ?? D;
  return new e();
}
function P(t) {
  return S().parseFromString(t, "text/xml").getElementsByTagName("gpx")[0];
}
function x(t) {
  return t ? (t.textContent ?? "").trim() : null;
}
function y(t) {
  return (e) => t.getAttribute(e);
}
function f(t) {
  return (e) => t.getElementsByTagName(e)[0];
}
function A(t, e) {
  return {
    lat: parseFloat(t("lat") ?? ""),
    lon: parseFloat(t("lon") ?? ""),
    ele: x(e("ele")),
    time: x(e("time"))
  };
}
function v(t) {
  try {
    const e = y(t), o = f(t)("trk"), i = f(o)("trkseg").getElementsByTagName("trkpt");
    let r = null, s = 0, a = 0, g = null;
    const n = [
      {
        name: e("creator"),
        version: e("version"),
        clock: { interval: null, currentTime: null, multiplier: 1, range: "CLAMPED" }
      },
      { position: { cartographicDegrees: [] } }
    ];
    for (let u = 0; u < i.length; u++) {
      const c = i[u], { lat: E, lon: F, ele: m, time: p } = A(y(c), f(c)), d = new Date(p ?? "").getTime();
      u === 0 && (r = p, s = d);
      const h = u === 0 ? 0 : (d - s) / 1e3, T = m ? parseFloat(m) : a;
      m && (a = T), n[1].position.cartographicDegrees.push(h, F, E, T), g = p;
    }
    return r && g && (n[0].clock.interval = `${r}/${g}`, n[0].clock.currentTime = r, n[1].availability = `${r}/${g}`, n[1].position.epoch = r), { isError: !1, data: n };
  } catch (e) {
    return { isError: !0, errorType: "bindCzmlData", data: String(e) };
  }
}
function C(t) {
  try {
    return v(P(t));
  } catch (e) {
    return { isError: !0, errorType: "parseGpx", data: String(e) };
  }
}
function $(t, e) {
  var i;
  const o = (i = t == null ? void 0 : t.target) == null ? void 0 : i.files;
  if (!o || o.length === 0) {
    e == null || e(!0, { isError: !0, errorType: "asyncFromFile", data: "file is not defined" });
    return;
  }
  const l = new FileReader();
  l.onload = (r) => {
    var a;
    const s = C(String(((a = r.target) == null ? void 0 : a.result) ?? ""));
    e == null || e(s.isError, s);
  }, l.onerror = () => e == null ? void 0 : e(!0, { isError: !0, errorType: "asyncFromFile", data: "file read error" }), l.readAsText(o[0], "UTF-8");
}
export {
  $ as asyncFromFile,
  C as parseGpx
};
