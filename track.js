/* VANTOR Tracking mit Einwilligung.
 * IDs hier eintragen. Leer = kein Tracking, kein Banner, keine Cookies.
 * Google Ads: Konto > Ziele > Conversions > Tag einrichten > "Tag selbst installieren": AW-… und Conversion-Label.
 * Meta: Events Manager > Datenquellen > Pixel-ID (nur Ziffern).
 */
window.VX_TRACKING = window.VX_TRACKING || {
  ga4: "",            // z. B. "G-ABC123XYZ"
  googleAds: "",      // z. B. "AW-123456789"
  adsLeadLabel: "",   // Conversion-Label für "Anfrage gesendet", z. B. "AbCdEfGhIjk"
  adsContactLabel: "",// optional: Label für WhatsApp/Anruf/Termin
  metaPixel: ""       // z. B. "123456789012345"
};

(function () {
  var C = window.VX_TRACKING, on = !!(C.ga4 || C.googleAds || C.metaPixel);
  var lang = (document.documentElement.lang || "de").slice(0, 2);
  var T = {
    de: ["Wir möchten messen, welche Anzeigen dir geholfen haben, uns zu finden. Dafür nutzen wir mit deiner Einwilligung Google und Meta.", "Einverstanden", "Ablehnen", "Datenschutz", "Cookie-Einstellungen"],
    en: ["We'd like to measure which ads helped you find us. With your consent we use Google and Meta for this.", "Accept", "Decline", "Privacy", "Cookie settings"],
    it: ["Vorremmo misurare quali annunci ti hanno aiutato a trovarci. Con il tuo consenso usiamo Google e Meta.", "Accetto", "Rifiuto", "Privacy", "Impostazioni cookie"],
    pt: ["Gostaríamos de medir que anúncios o ajudaram a encontrar-nos. Com o seu consentimento usamos a Google e a Meta.", "Aceitar", "Recusar", "Privacidade", "Definições de cookies"],
    da: ["Vi vil gerne måle, hvilke annoncer der hjalp dig med at finde os. Med dit samtykke bruger vi Google og Meta.", "Accepter", "Afvis", "Privatliv", "Cookie-indstillinger"],
    es: ["Queremos medir qué anuncios te ayudaron a encontrarnos. Con tu consentimiento usamos Google y Meta.", "Aceptar", "Rechazar", "Privacidad", "Ajustes de cookies"],
    tr: ["Bizi bulmanıza hangi reklamların yardımcı olduğunu ölçmek istiyoruz. Onayınızla Google ve Meta kullanıyoruz.", "Kabul et", "Reddet", "Gizlilik", "Çerez ayarları"]
  }[lang] || null;
  T = T || ["We'd like to measure which ads helped you find us. With your consent we use Google and Meta for this.", "Accept", "Decline", "Privacy", "Cookie settings"];
  var KEY = "vx_consent";
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  /* Kampagnen-Parameter gehen bei jeder Anfrage mit (aus der aktuellen Adresse; mit Einwilligung über die Sitzung gemerkt). */
  var P = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
  function params() {
    var q = new URLSearchParams(location.search), o = {};
    P.forEach(function (k) { if (q.get(k)) o[k] = q.get(k).slice(0, 120); });
    if (get() === "yes") {
      try { var s = JSON.parse(sessionStorage.getItem("vx_utm") || "{}"); if (Object.keys(o).length) sessionStorage.setItem("vx_utm", JSON.stringify(o)); else o = s; } catch (e) {}
    }
    o.landing = location.pathname; o.lang = lang; return o;
  }
  document.addEventListener("submit", function (e) {
    var f = e.target; if (!f || !f.querySelector || !f.querySelector('input[name="_cc"],input[name="access_key"]')) return;
    var o = params();
    Object.keys(o).forEach(function (k) { if (f.querySelector('input[name="' + k + '"]')) return; var i = document.createElement("input"); i.type = "hidden"; i.name = k; i.value = o[k]; f.appendChild(i); });
  }, true);

  if (!on) return;

  /* Ereignisse */
  var loaded = false, queue = [];
  function fire(name, ads) {
    if (!loaded) { queue.push([name, ads]); return; }
    try {
      if (window.gtag) {
        window.gtag("event", name);
        if (C.googleAds && ads) window.gtag("event", "conversion", { send_to: C.googleAds + "/" + ads });
      }
      if (window.fbq) {
        var m = { generate_lead: "Lead", contact: "Contact", schedule: "Schedule", configurator_start: "ViewContent" }[name];
        if (m) window.fbq("track", m);
      }
    } catch (e) {}
  }
  window.vxTrack = fire;
  var once = {};
  function first(n, ads) { if (once[n]) return; once[n] = 1; fire(n, ads); }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a,button"); if (!a) return;
    var h = a.getAttribute("href") || "";
    if (/wa\.me|whatsapp/.test(h)) first("contact_wa", C.adsContactLabel), fire("contact");
    else if (/^tel:/.test(h)) first("contact_tel", C.adsContactLabel), fire("contact");
    else if (/zeeg\.me|calendar\.google|calendar\.app\.google/.test(h) || a.id === "zgate-b" || /book|termin/i.test(a.id || "")) fire("schedule", C.adsContactLabel);
  }, true);
  document.addEventListener("input", function (e) { if (e.target.closest && e.target.closest(".cfg-ctrl,#konfigurator")) first("configurator_start"); }, true);
  document.addEventListener("change", function (e) { if (e.target.closest && e.target.closest(".cfg-ctrl,#konfigurator")) first("configurator_start"); }, true);
  /* Formular erfolgreich gesendet (FormSubmit) */
  var of = window.fetch;
  if (of) window.fetch = function (u, o) {
    var p = of.apply(this, arguments);
    try { if (/api\.web3forms\.com|formsubmit\.co\/ajax/.test(String(u))) p.then(function (r) { if (r && r.ok) r.clone().json().then(function (j) { if (String(j.success) === "true") fire("generate_lead", C.adsLeadLabel); }).catch(function () {}); }); } catch (e) {}
    return p;
  };

  function load() {
    if (loaded) return; loaded = true;
    var id = C.ga4 || C.googleAds;
    if (id) {
      var s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + id; document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("consent", "default", { ad_storage: "granted", analytics_storage: "granted", ad_user_data: "granted", ad_personalization: "denied" });
      if (C.ga4) window.gtag("config", C.ga4, { anonymize_ip: true });
      if (C.googleAds) window.gtag("config", C.googleAds);
    }
    if (C.metaPixel) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", C.metaPixel); window.fbq("track", "PageView");
    }
    queue.splice(0).forEach(function (q) { fire(q[0], q[1]); });
  }

  /* Banner: beide Wahlmöglichkeiten gleich prominent */
  var css = ".vxc{position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:99999;max-width:40rem;margin:0 auto;background:rgba(12,16,22,.97);color:#e8eef3;border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:1rem 1.1rem;box-shadow:0 20px 50px rgba(0,0,0,.5);font:400 .92rem/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}.vxc p{margin:0 0 .8rem}.vxc a{color:inherit}.vxc .r{display:flex;gap:.5rem;flex-wrap:wrap}.vxc button{flex:1 1 9rem;min-height:2.8rem;border-radius:10px;font:600 .95rem system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;cursor:pointer;border:1px solid rgba(255,255,255,.3);background:#fff;color:#0a0f14}.vxc button+button{background:#fff;color:#0a0f14}.vxf{background:none;border:0;color:inherit;font:inherit;text-decoration:underline;cursor:pointer;padding:0;opacity:.8}";
  function banner() {
    if (document.querySelector(".vxc")) return;
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    var d = document.createElement("div"); d.className = "vxc"; d.setAttribute("role", "dialog"); d.setAttribute("aria-live", "polite");
    d.innerHTML = "<p>" + T[0] + ' <a href="/datenschutz#tracking">' + T[3] + "</a></p><div class=r><button type=button data-v=no>" + T[2] + "</button><button type=button data-v=yes>" + T[1] + "</button></div>";
    d.addEventListener("click", function (e) { var v = e.target.getAttribute && e.target.getAttribute("data-v"); if (!v) return; set(v); d.remove(); if (v === "yes") load(); else if (loaded) location.reload(); });
    document.body.appendChild(d);
  }
  window.vxConsent = function () { try { localStorage.removeItem(KEY); } catch (e) {} banner(); };
  function footerLink() {
    var f = document.querySelectorAll("footer"); if (!f.length) return; f = f[f.length - 1];
    var b = document.createElement("button"); b.type = "button"; b.className = "vxf"; b.textContent = T[4]; b.onclick = window.vxConsent;
    var w = document.createElement("div"); w.style.cssText = "text-align:center;padding:.4rem 0 1rem;font-size:.82rem"; w.appendChild(b); f.appendChild(w);
  }
  function init() { footerLink(); var c = get(); if (c === "yes") load(); else if (c !== "no") banner(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
