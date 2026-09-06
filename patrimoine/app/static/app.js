/* =====================================================================
   Front. Il ne connaît qu'une seule origine : le backend local.
   Aucune clé ici, aucun appel externe, donc aucun problème de CORS.
   ===================================================================== */

const CAT = {
  invest:{label:"Compte d'investissement",c:"#4DA3FF"}, crypto:{label:"Crypto",c:"#A78BFA"},
  pokemon:{label:"Pokémon",c:"#FF4FD8"}, montre:{label:"Montres",c:"#F0C077"},
  courant:{label:"Compte courant",c:"#34E7C8"}, epargne:{label:"Compte d'épargne",c:"#A3E635"},
  autre:{label:"Autres",c:"#8FA0B3"}
};
const PERIODES = [
  {k:"1H",h:1,lib:"sur une heure"},{k:"24H",h:24,lib:"sur 24 heures"},
  {k:"7J",h:168,lib:"sur 7 jours"},{k:"1M",h:720,lib:"sur un mois"},
  {k:"3M",h:2160,lib:"sur trois mois"},{k:"6M",h:4320,lib:"sur six mois"},
  {k:"1A",h:8760,lib:"sur un an"},{k:"Max",h:262800,lib:"depuis l'origine"}
];
const SOURCES = {
  coingecko:{nom:"CoinGecko",quoi:"Cours crypto en euros, sans clé."},
  kraken:{nom:"Kraken",quoi:"Quantités réelles détenues, lecture seule."},
  yfinance:{nom:"Yahoo Finance",quoi:"Cours ETF, différés d'environ 15 minutes."},
  pokemontcg:{nom:"PokemonTCG.io",quoi:"Images officielles et prix Cardmarket des cartes."},
  tcgapi:{nom:"TCG API",quoi:"Prix des produits scellés, clé gratuite (tcgapi.dev)."},
  pricecharting:{nom:"PriceCharting",quoi:"Alternative scellé, sur abonnement."},
  gocardless:{nom:"GoCardless",quoi:"Soldes bancaires LCL et Fortuneo, DSP2."}
};

let P = null, iPer = 6, vue = "apercu", deplies = new Set(["poke"]), q = "";
let ouvert = null, marque = "Toutes", modeRech = "cartes", derniersResultats = [];

/* ------------------------------------------------------------ utilitaires */
const eur  = n => (n||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const eur2 = n => (n||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2});
const eurP = n => n>=1000?eur2(n):(n||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:4});
const pc   = n => (n>0?"+":"")+(n||0).toFixed(2).replace(".",",")+" %";
const sg   = n => n>0?"up":n<0?"down":"";
const ech  = s => String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const perf = (v,i) => i?(v/i-1)*100:0;
const $ = s => document.querySelector(s);

function toast(txt, type="ok"){
  const t = document.createElement("div");
  t.className = "toast "+type; t.textContent = txt;
  $("#toasts").appendChild(t);
  setTimeout(()=>{t.style.opacity=0;setTimeout(()=>t.remove(),300);}, 3600);
}
async function api(chemin, options){
  const r = await fetch(chemin, options);
  if(!r.ok) throw new Error((await r.text()).slice(0,120) || r.status);
  return r.json();
}
const lignes = () => (P?.comptes||[]).flatMap(c => c.lignes.map(l => ({...l, compte:c})));

/* ------------------------------------------------------------ chargement */
async function recharger(){
  try{
    P = await api("/api/portefeuille");
    majFlux(true);
    rendreTout();
  }catch(e){
    majFlux(false);
    toast("Backend injoignable — lance uvicorn", "ko");
  }
}
function majFlux(ok){
  const f = $("#flux");
  f.className = "etat-flux " + (ok?"ok":"ko");
  $("#flux-txt").textContent = ok
    ? "en direct · " + new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})
    : "hors ligne";
}

/* ------------------------------------------------------------ héros */
function rendrePeriodes(){
  $("#periodes").innerHTML = PERIODES.map((p,i)=>
    `<button class="pe" data-i="${i}" aria-pressed="${i===iPer}">${p.k}</button>`).join("");
}
async function rendreHeros(){
  const t = P.total, inv = P.investi;
  $("#total").textContent = eur2(t);
  $("#j-total").textContent = eur(t);

  let h = [];
  try{ h = await api(`/api/historique?heures=${PERIODES[iPer].h}&points=64`); }catch(e){}
  const base = h.length > 1 ? h[0].v : inv;
  const g = t - base;
  const pi = $("#pilule");
  pi.className = "pilule" + (g<0?" bas":"");
  pi.innerHTML = `<span class="${sg(g)}">${g>0?"▲":"▼"} ${g>0?"+":""}${eur(g)}</span><span class="${sg(g)}">${pc(perf(t,base))}</span>`;
  $("#lib-periode").textContent = PERIODES[iPer].lib;

  if(h.length < 2){
    $("#courbe").innerHTML = `<text x="500" y="110" text-anchor="middle" fill="#55555F" font-size="13">
      Historique en construction — chaque collecte ajoute un point.</text>`;
    $("#e-g").textContent = ""; window._g = null; return;
  }
  const vals = h.map(p=>p.v), mi = Math.min(...vals), ma = Math.max(...vals), d = (ma-mi)||1;
  const X = i => i/(h.length-1)*1000, Y = v => 192-(v-mi)/d*164;
  const path = vals.map((v,i)=>`${i?"L":"M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const ombre = vals.map((v,i)=>`${i?"L":"M"}${(X(i)+6).toFixed(1)},${(Y(v)+8).toFixed(1)}`).join(" ");
  $("#courbe").innerHTML = `
    <defs>
      <linearGradient id="aire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF3B9A" stop-opacity=".32"/><stop offset="1" stop-color="#FF3B9A" stop-opacity="0"/></linearGradient>
      <linearGradient id="trait" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF3B9A"/><stop offset=".5" stop-color="#8B5CF6"/><stop offset="1" stop-color="#FF4FD8"/></linearGradient>
      <filter id="neon" x="-20%" y="-40%" width="140%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <path d="${path} L1000,216 L0,216 Z" fill="url(#aire)"/>
    <path d="${ombre}" fill="none" stroke="#000" stroke-width="3" opacity=".35"/>
    <path id="ligne" d="${path}" fill="none" stroke="url(#trait)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" filter="url(#neon)" vector-effect="non-scaling-stroke"/>
    <line id="vise" y1="0" y2="216" stroke="#FF3B9A" stroke-width="1" stroke-dasharray="3 4" vector-effect="non-scaling-stroke" opacity="0"/>
    <circle id="pt" r="5" fill="#000000" stroke="#FF3B9A" stroke-width="2.5" opacity="0"/>
    <circle cx="1000" cy="${Y(vals[vals.length-1]).toFixed(1)}" r="5" fill="#FF3B9A" filter="url(#neon)"/>`;
  const li = $("#ligne");
  if(li?.getTotalLength && !matchMedia("(prefers-reduced-motion: reduce)").matches){
    const L = li.getTotalLength();
    li.animate([{strokeDasharray:L,strokeDashoffset:L},{strokeDasharray:L,strokeDashoffset:0}],
               {duration:1200,easing:"cubic-bezier(.4,0,.2,1)"});
  }
  const fmt = t => new Date(t).toLocaleString("fr-FR", PERIODES[iPer].h<=24
    ? {hour:"2-digit",minute:"2-digit"} : {day:"numeric",month:"short"});
  $("#e-g").textContent = fmt(h[0].t);
  window._g = {X,Y,h,fmt};
}

function rendreDonut(){
  const t = P.total, par = {};
  P.comptes.forEach(c => par[c.categorie] = (par[c.categorie]||0) + c.valeur);
  const R = 64, C = 2*Math.PI*R;
  let off = 0, arcs = "", prof = "", leg = "", jauge = "";
  Object.entries(par).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{
    const part = t ? v/t : 0, col = (CAT[k]||CAT.autre).c;
    prof += `<circle cx="93" cy="101" r="${R}" fill="none" stroke="${col}" stroke-width="22" opacity=".28"
      stroke-dasharray="${(part*C-3).toFixed(2)} ${C}" stroke-dashoffset="${(-off*C).toFixed(2)}" transform="rotate(-90 93 93)"/>`;
    arcs += `<circle cx="93" cy="93" r="${R}" fill="none" stroke="${col}" stroke-width="22"
      stroke-dasharray="${(part*C-3).toFixed(2)} ${C}" stroke-dashoffset="${(-off*C).toFixed(2)}" transform="rotate(-90 93 93)"/>`;
    leg += `<div class="dl-r"><i class="pt" style="background:${col};box-shadow:0 0 10px ${col}"></i>
      <span>${(CAT[k]||CAT.autre).label}<i>${(part*100).toFixed(2).replace(".",",")} %</i></span><b>${eur(v)}</b></div>`;
    jauge += `<i style="width:${part*100}%;background:${col}"></i>`;
    off += part;
  });
  $("#donut").innerHTML = prof + arcs;
  $("#donut-leg").innerHTML = leg;
  $("#j-barre").innerHTML = jauge;
}

function rendreMouv(){
  const tri = lignes().filter(l=>l.investi && l.valeur!==l.investi)
                      .sort((a,b)=>perf(b.valeur,b.investi)-perf(a.valeur,a.investi));
  $("#mouv").innerHTML = [...tri.slice(0,3),...tri.slice(-2)].map(l=>`
    <div class="mv"><div class="ecu s">${ecussonPour(l,l.compte)}</div>
      <div class="txt"><div>${ech(l.nom)}</div><span>${ech(l.compte.nom)}</span></div>
      <div class="val ${sg(l.valeur-l.investi)}">${pc(perf(l.valeur,l.investi))}<span>${eur(l.valeur)}</span></div></div>`).join("");
}

/* ------------------------------------------------------------ comptes */
function badgeDirect(l){
  if(l.source === "manuel" || !l.source) return "";
  const frais = l.maj && (Date.now()-new Date(l.maj)) < 36e5*24;
  return `<span class="direct ${frais?"":"gris"}"><i></i>${ech(SOURCES[l.source]?.nom || l.source)}</span>`;
}
function rendreComptes(){
  const t = P.total;
  const ok = c => !q || (c.nom+c.institution).toLowerCase().includes(q)
                  || c.lignes.some(l=>(l.nom+(l.sous_titre||"")).toLowerCase().includes(q));
  $("#tb-comptes").innerHTML = P.comptes.filter(ok).map(c=>{
    const g = c.valeur - c.investi, part = t ? c.valeur/t*100 : 0;
    const o = deplies.has(c.id), dash = 2*Math.PI*7, col = (CAT[c.categorie]||CAT.autre).c;
    return `<div>
      <button class="rangee grid-cpt ${o?"ouvert":""}" data-cpt="${c.id}">
        <div class="rg-nom"><div class="ecu">${ecussonPour({},c)}</div>
          <div class="t"><div>${ech(c.nom)}</div><span>${ech(c.institution||"")}</span></div></div>
        <div class="col-cat"><span class="tag"><i class="pt" style="background:${col}"></i>${(CAT[c.categorie]||CAT.autre).label}</span></div>
        <div class="col-part part"><svg width="17" height="17" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="3.2"/>
          <circle cx="9" cy="9" r="7" fill="none" stroke="${col}" stroke-width="3.2" stroke-dasharray="${(part/100*dash).toFixed(2)} ${dash}" transform="rotate(-90 9 9)" stroke-linecap="round"/></svg>
          ${part.toFixed(1).replace(".",",")} %</div>
        <div class="rg-val">${eur(c.valeur)}</div>
        <div class="col-pv rg-pv ${sg(g)}">${c.investi?((g>0?"+":"")+eur(g)):"—"}<span>${c.investi?pc(perf(c.valeur,c.investi)):""}</span></div>
        <svg class="chev" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 4l4 4-4 4"/></svg>
      </button>
      <div class="enfants">${c.lignes.map(l=>{
        const gl = l.valeur - l.investi;
        return `<button class="enf grid-lig" data-ligne="${l.id}">
          <div class="enf-nom"><div class="ecu s">${ecussonPour(l,c)}</div>
            <div><div>${ech(l.nom)}${badgeDirect(l)}</div><span>${ech(l.sous_titre||"")}</span></div></div>
          <div class="col-spark" style="color:var(--txt-3);font-size:12px">${l.quantite!==1?l.quantite.toLocaleString("fr-FR",{maximumFractionDigits:6}):""}</div>
          <div class="rg-val" style="font-size:13.5px">${eur2(l.valeur)}</div>
          <div class="col-pv rg-pv ${sg(gl)}">${l.investi?((gl>0?"+":"")+eur2(gl)):"—"}
            <span>${l.investi?pc(perf(l.valeur,l.investi)):""}</span></div></button>`;
      }).join("")}</div></div>`;
  }).join("") || `<div style="padding:30px 0;color:var(--txt-3);text-align:center">Aucun résultat.</div>`;
  $("#n-cpt").textContent = P.comptes.length;
}

/* ------------------------------------------------------------ cartes cours */
function carteCours(l){
  const g = l.valeur - l.investi;
  return `<div class="t3d"><button class="verre cc" data-ligne="${l.id}">
    <div class="cc-lueur" style="background:${g>=0?"#2FE39B":"#FF6B6B"}"></div>
    <div class="cc-haut"><div class="ecu l">${ecussonPour(l,l.compte)}</div>
      <div class="t"><div>${ech(l.nom)}</div><span>${ech(l.sous_titre||"")}</span></div></div>
    <div class="cc-cours">${l.prix_unite?`Cours ${eurP(l.prix_unite)} · ${l.quantite.toLocaleString("fr-FR",{maximumFractionDigits:6})} ${ech(l.sous_titre||"")}`
      :`<span style="color:var(--txt-3)">cours non chargé</span>`}
      ${l.maj?`<br><span style="color:var(--txt-3);font-size:11.5px">maj ${new Date(l.maj).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>`:""}</div>
    <div class="cc-val">${eur2(l.valeur)}</div>
    <div class="cc-bas"><div class="cc-perf ${sg(g)}"><span>${g>0?"+":""}${eur(g)}</span><em>${pc(perf(l.valeur,l.investi))}</em></div></div>
  </button></div>`;
}
function rendreCrypto(){
  const l = lignes().filter(x=>x.compte.categorie==="crypto");
  $("#n-cry").textContent = l.length;
  $("#g-crypto").innerHTML = l.map(carteCours).join("") || `<p style="color:var(--txt-3)">Aucune ligne crypto.</p>`;
}
function rendreETF(){
  const l = lignes().filter(x=>x.source==="yfinance");
  $("#n-etf").textContent = l.length;
  $("#g-etf").innerHTML = l.map(carteCours).join("") || `<p style="color:var(--txt-3)">Aucune ligne boursière.</p>`;
}

function bandeau(el,v,i,n,label){
  const g = v-i;
  el.innerHTML = `<div class="bd"><span>Valeur de marché</span><b class="num">${eur2(v)}</b></div>
    <div class="bd"><span>Investi</span><b class="num" style="color:var(--txt-2)">${eur2(i)}</b></div>
    <div class="bd"><span>Plus-value</span><b class="num ${sg(g)}">${g>0?"+":""}${eur2(g)}</b></div>
    <div class="bd"><span>Performance</span><b class="num ${sg(g)}">${pc(perf(v,i))}</b></div>
    <div class="bd"><span>${label}</span><b class="num">${n}</b></div>`;
}

function rendrePoke(){
  const objets = lignes().filter(l=>l.compte.categorie==="pokemon");
  $("#n-pok").textContent = objets.length;
  bandeau($("#bandeau-poke"), objets.reduce((s,o)=>s+o.valeur,0), objets.reduce((s,o)=>s+o.investi,0), objets.length, "Objets");
  $("#g-poke").innerHTML = objets.map(o=>{
    const g = o.valeur-o.investi;
    return `<div class="t3d"><button class="pc-in" data-ligne="${o.id}">
      <div class="visuel">${o.image?`<img class="carte" src="${o.image}" alt="${ech(o.nom)}">`:visuelScelle(o.style||"carte")}
        <div class="holo"></div><div class="eclat"></div>
        ${o.source!=="manuel"?`<span class="badge-api">${ech(SOURCES[o.source]?.nom||o.source)}</span>`:""}</div>
      <div class="pc-txt"><h3>${ech(o.nom)}</h3><p>${ech(o.sous_titre||"")}</p>
        <div class="pc-bas"><b>${eur2(o.valeur)}</b>
          <span class="${sg(g)}">${g>0?"+":""}${eur2(g)}<i>${pc(perf(o.valeur,o.investi))}</i></span></div>
      </div></button></div>`;
  }).join("");
}

function rendreMontres(){
  const m = lignes().filter(l=>l.compte.categorie==="montre");
  $("#n-mon").textContent = m.length;
  bandeau($("#bandeau-montres"), m.reduce((s,o)=>s+o.valeur,0), m.reduce((s,o)=>s+o.investi,0), m.length, "Montres");
  $("#g-montres").innerHTML = m.map(o=>{
    const g = o.valeur-o.investi;
    return `<div class="t3d"><button class="mc" data-ligne="${o.id}">
      <div class="mc-vis">${o.image?`<img class="mc-img" src="${o.image}" alt="${ech(o.nom)}" loading="lazy">`:visuelMontre(o.style||"sub")}<div class="eclat"></div></div>
      <div class="mc-txt"><div class="mc-marque">${ech(o.sous_titre||"")}</div><h3>${ech(o.nom)}</h3>
        <div class="mc-prix"><div><span>Payée</span><b class="num" style="color:var(--txt-2)">${eur2(o.investi)}</b></div>
          <div style="text-align:right"><span>Cote</span><b class="num">${eur2(o.valeur)}</b></div></div>
        <span class="ecart ${g>=0?"prime":"decote"}" style="margin-top:12px">${g>0?"+":""}${eur2(g)} · ${pc(perf(o.valeur,o.investi))}</span>
      </div></button></div>`;
  }).join("") || `<p style="color:var(--txt-3)">Aucune montre.</p>`;

  const marques = ["Toutes",...new Set(CATALOGUE.map(x=>x.marque))];
  $("#f-marques").innerHTML = marques.map(mq=>`<button class="fc" data-mq="${mq}" aria-pressed="${marque===mq}">${mq}</button>`).join("");
  $("#g-catalogue").innerHTML = CATALOGUE.filter(x=>marque==="Toutes"||x.marque===marque).map(x=>{
    const med = (x.coteMin+x.coteMax)/2, e = (med/x.neuf-1)*100;
    return `<div class="t3d"><div class="mc">
      <div class="mc-vis">${x.img?`<img class="mc-img" src="${x.img}" alt="${ech(x.modele)}" loading="lazy">`:visuelMontre(x.style)}<div class="eclat"></div></div>
      <div class="mc-txt"><div class="mc-marque">${ech(x.marque)}</div><h3>${ech(x.modele)}</h3><p>Réf. ${ech(x.ref)}</p>
        <div class="mc-prix"><div><span>Prix boutique</span><b class="num">${eur(x.neuf)}</b></div>
          <div style="text-align:right"><span>Cote occasion</span><b class="num">${eur(x.coteMin)}–${eur(x.coteMax)}</b></div></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px">
          <span class="ecart ${e>=0?"prime":"decote"}">${e>=0?"prime ":"décote "}${pc(e)}</span>
          <button class="btn btn-or btn-s" data-cat="${x.id}">Ajouter</button></div>
      </div></div></div>`;
  }).join("");
}

function rendreSources(){
  const etats = Object.fromEntries((P.sources||[]).map(s=>[s.source,s]));
  $("#g-sources").innerHTML = Object.entries(SOURCES).map(([cle,s])=>{
    const e = etats[cle];
    const coul = !e ? "#55555F" : e.etat==="ok" ? "#2FE39B" : e.etat==="ignore" ? "#F0C077" : "#FF6B6B";
    const mot = !e ? "jamais appelée" : e.etat==="ok" ? "opérationnelle" : e.etat==="ignore" ? "clés absentes" : "en erreur";
    return `<div class="src"><h3><i class="pt" style="background:${coul};box-shadow:0 0 10px ${coul}"></i>${s.nom}</h3>
      <p>${s.quoi}</p>
      <div class="detail">${mot}${e?`\n${ech(e.horodate||"")}\n${ech(e.detail||"")}`:""}</div></div>`;
  }).join("");
}

function rendreTout(){
  rendreHeros(); rendreDonut(); rendreMouv(); rendreComptes();
  rendreCrypto(); rendreETF(); rendrePoke(); rendreMontres(); rendreSources();
}

/* ------------------------------------------------------------ navigation */
const TITRES = {apercu:"Aperçu",comptes:"Mes comptes",crypto:"Crypto",bourse:"ETF et actions",
                pokemon:"Pokémon",montres:"Montres",sources:"Sources de données"};
$("#menu").addEventListener("click", e=>{
  const b = e.target.closest(".mi"); if(!b) return;
  vue = b.dataset.v;
  document.querySelectorAll(".mi").forEach(x=>x.setAttribute("aria-current", x===b));
  document.querySelectorAll(".vue").forEach(s=>s.classList.toggle("on", s.id==="v-"+vue));
  $("#titre").textContent = TITRES[vue]; scrollTo({top:0});
});
$("#periodes").addEventListener("click", e=>{
  const b = e.target.closest(".pe"); if(!b) return;
  iPer = +b.dataset.i;
  document.querySelectorAll(".pe").forEach(x=>x.setAttribute("aria-pressed", x===b));
  rendreHeros();
});
$("#q").addEventListener("input", e=>{
  q = e.target.value.trim().toLowerCase(); rendreComptes();
  if(q && vue!=="comptes") document.querySelector('[data-v="comptes"]').click();
});
$("#tout-ouvrir").addEventListener("click", e=>{
  if(deplies.size===P.comptes.length){ deplies.clear(); e.target.textContent="Tout déplier"; }
  else { P.comptes.forEach(c=>deplies.add(c.id)); e.target.textContent="Tout replier"; }
  rendreComptes();
});
$("#tb-comptes").addEventListener("click", e=>{
  const l = e.target.closest("[data-ligne]"); if(l){ ouvrirModale(l.dataset.ligne); return; }
  const c = e.target.closest("[data-cpt]"); if(!c) return;
  deplies.has(c.dataset.cpt) ? deplies.delete(c.dataset.cpt) : deplies.add(c.dataset.cpt);
  rendreComptes();
});

/* ------------------------------------------------------------ collectes */
document.body.addEventListener("click", async e=>{
  const col = e.target.closest("[data-collecte]");
  if(col){
    const b = col, txt = b.textContent;
    b.disabled = true; b.textContent = "Collecte…";
    try{ P = await api(`/api/collecter?quoi=${b.dataset.collecte}`, {method:"POST"});
      P.sources = (await api("/api/portefeuille")).sources;
      rendreTout(); toast("Cours actualisés"); }
    catch(err){ toast("Échec : "+err.message, "ko"); }
    b.disabled = false; b.textContent = txt;
    return;
  }
  const cat = e.target.closest("[data-cat]");
  if(cat){ await ajouterMontre(cat.dataset.cat); return; }
  const res = e.target.closest("[data-res]");
  if(res){ await ajouterResultat(+res.dataset.res); return; }
  const li = e.target.closest("#g-crypto [data-ligne], #g-etf [data-ligne], #g-poke [data-ligne], #g-montres [data-ligne]");
  if(li) ouvrirModale(li.dataset.ligne);
});
$("#sync").addEventListener("click", ()=>document.querySelector('[data-collecte="tout"]')?.click() || recharger());

/* ------------------------------------------------------------ recherche */
$("#ong-rech").addEventListener("click", e=>{
  const o = e.target.closest(".onglet"); if(!o) return;
  document.querySelectorAll("#ong-rech .onglet").forEach(x=>x.setAttribute("aria-selected", x===o));
  modeRech = o.dataset.r;
  $("#api-q").placeholder = modeRech==="cartes" ? "charizard, pikachu…" : "elite trainer box 151, booster box…";
  $("#api-res").innerHTML = ""; $("#api-etat").textContent = "";
});
$("#api-go").addEventListener("click", chercher);
$("#api-q").addEventListener("keydown", e=>{ if(e.key==="Enter") chercher(); });

async function chercher(){
  const terme = $("#api-q").value.trim();
  if(!terme){ $("#api-etat").textContent = "Tape un nom."; return; }
  $("#api-etat").textContent = "Recherche…"; $("#api-res").innerHTML = "";
  try{
    const j = modeRech==="cartes"
      ? await api(`/api/recherche/cartes?nom=${encodeURIComponent(terme)}`)
      : await api(`/api/recherche/scelle?terme=${encodeURIComponent(terme)}`);
    if(j.erreur){ $("#api-etat").innerHTML = `${ech(j.erreur)} — voir l'onglet Sources pour configurer.`; return; }
    derniersResultats = j.resultats || [];
    if(!derniersResultats.length){ $("#api-etat").textContent = "Aucun résultat. Essaie le nom anglais."; return; }
    $("#api-etat").textContent = `${derniersResultats.length} résultats — clique pour ajouter à ta collection.`;
    $("#api-res").innerHTML = derniersResultats.map((r,i)=>`
      <button class="rc" data-res="${i}">
        ${r.image?`<img src="${r.image}" alt="${ech(r.nom)}" loading="lazy">`:`<div class="visuel">${visuelScelle("carte")}</div>`}
        <div><h4>${ech(r.nom)}</h4><p>${ech(r.set||"")} ${ech(r.numero||"")}</p>
          <b>${r.prix?eur2(r.prix):"prix indisponible"}</b></div></button>`).join("");
  }catch(e){ $("#api-etat").textContent = "Erreur : "+e.message; }
}

async function ajouterResultat(i){
  const r = derniersResultats[i]; if(!r) return;
  const compte = P.comptes.find(c=>c.categorie==="pokemon");
  if(!compte){ toast("Crée d'abord un compte Pokémon", "ko"); return; }
  await api("/api/ligne", {method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({compte_id:compte.id, nom:r.nom, sous_titre:(r.set||"")+" "+(r.numero||""),
      quantite:1, prix_unite:r.prix||0, investi:r.prix||0,
      source: r.source || (modeRech==="cartes"?"pokemontcg":"tcgapi"), code:r.id, image:r.image,
      style: modeRech==="cartes"?"carte":"upc"})});
  await recharger(); toast(`${r.nom} ajoutée`);
}

async function ajouterMontre(id){
  const m = CATALOGUE.find(x=>x.id===id); if(!m) return;
  const compte = P.comptes.find(c=>c.categorie==="montre");
  if(!compte){ toast("Crée d'abord un compte Montres", "ko"); return; }
  await api("/api/ligne", {method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({compte_id:compte.id, nom:m.modele, sous_titre:m.marque, quantite:1,
      prix_unite:Math.round((m.coteMin+m.coteMax)/2), investi:m.neuf, style:m.style, image:m.img||null})});
  await recharger(); toast(`${m.marque} ${m.modele} ajoutée`);
}

/* ------------------------------------------------------------ modale */
async function ouvrirModale(id){
  const l = lignes().find(x=>x.id===id); if(!l) return;
  ouvert = id;
  $("#m-ecu").innerHTML = ecussonPour(l, l.compte);
  $("#m-nom").textContent = l.nom;
  $("#m-sous").textContent = `${l.sous_titre||""} · ${l.compte.nom}`;
  $("#m-qte").value = l.quantite; $("#m-prix").value = l.prix_unite;
  $("#m-inv").value = l.investi;  $("#m-code").value = l.code || "";
  const visuel = ["pokemon","montre"].includes(l.compte.categorie);
  $("#m-visuel").hidden = !visuel;
  $("#m-ch-img").hidden = !visuel;
  $("#m-img").value = l.image || "";
  if(visuel) $("#m-visuel").innerHTML = l.image ? `<img src="${l.image}" alt="">`
    : (l.compte.categorie==="montre" ? visuelMontre(l.style||"sub") : visuelScelle(l.style||"carte"));

  let h = [];
  try{ h = await api(`/api/ligne/${id}/historique?heures=8760`); }catch(e){}
  if(h.length > 1){
    const v = h.map(p=>p.v), mi = Math.min(...v), ma = Math.max(...v), d = (ma-mi)||1;
    const c = l.valeur >= l.investi ? "#2FE39B" : "#FF6B6B";
    const p = v.map((y,i)=>`${i?"L":"M"}${(i/(v.length-1)*420).toFixed(1)},${(86-(y-mi)/d*76).toFixed(1)}`).join(" ");
    $("#m-courbe").innerHTML = `<path d="${p} L420,96 L0,96 Z" fill="${c}" opacity=".13"/>
      <path d="${p}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    $("#m-legende").textContent = `${h.length} relevés depuis le ${new Date(h[0].t).toLocaleDateString("fr-FR")}`;
  } else {
    $("#m-courbe").innerHTML = "";
    $("#m-legende").textContent = "Pas encore d'historique pour cette ligne.";
  }
  $("#voile").classList.add("on");
}
const fermer = ()=>{ $("#voile").classList.remove("on"); ouvert = null; };
$("#m-x").addEventListener("click", fermer);
$("#voile").addEventListener("click", e=>{ if(e.target.id==="voile") fermer(); });
addEventListener("keydown", e=>{ if(e.key==="Escape") fermer(); });

$("#m-ok").addEventListener("click", async ()=>{
  try{
    await api(`/api/ligne/${ouvert}`, {method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({quantite:+$("#m-qte").value, prix_unite:+$("#m-prix").value,
        investi:+$("#m-inv").value, code:$("#m-code").value.trim()||null,
        image:$("#m-img").value.trim()||null})});
    fermer(); await recharger(); toast("Ligne mise à jour");
  }catch(e){ toast("Échec : "+e.message, "ko"); }
});
$("#m-sup").addEventListener("click", async ()=>{
  await api(`/api/ligne/${ouvert}`, {method:"DELETE"});
  fermer(); await recharger(); toast("Ligne supprimée");
});

/* ------------------------------------------------------------ banques */
async function chargerBanques(){
  try{
    const j = await api("/api/banques");
    if(j.erreur){ $("#liste-banques").innerHTML = `<option>${ech(j.erreur)}</option>`; return; }
    $("#liste-banques").innerHTML = j.banques.map(b=>`<option value="${b.id}">${ech(b.nom)}</option>`).join("");
  }catch(e){ $("#liste-banques").innerHTML = `<option>Indisponible</option>`; }
}
$("#go-banque").addEventListener("click", async ()=>{
  const id = $("#liste-banques").value;
  try{
    const j = await api(`/api/banque/consentement?institution_id=${encodeURIComponent(id)}`, {method:"POST"});
    if(j.erreur){ $("#etat-banque").textContent = j.erreur; return; }
    $("#etat-banque").innerHTML = `<a href="${j.lien}" target="_blank" rel="noopener" style="color:var(--cyan)">
      Ouvrir le consentement chez ta banque</a> — reviens ensuite et clique
      <button class="btn btn-2 btn-s" onclick="rattacher('${j.id}')">Rattacher</button>`;
  }catch(e){ $("#etat-banque").textContent = "Erreur : "+e.message; }
});
async function rattacher(rid){
  try{
    const j = await api(`/api/banque/rattacher?requisition_id=${rid}`, {method:"POST"});
    toast(`Rattachés : ${(j.comptes||[]).join(", ")||"aucun"}`);
    await recharger();
  }catch(e){ toast("Échec : "+e.message, "ko"); }
}

/* ------------------------------------------------------------ 3D + fond */
const doux = !matchMedia("(prefers-reduced-motion: reduce)").matches;
document.addEventListener("pointermove", e=>{
  if(!doux) return;
  const c = e.target.closest(".t3d");
  if(c){
    const el = c.firstElementChild, r = c.getBoundingClientRect();
    const x = (e.clientX-r.left)/r.width, y = (e.clientY-r.top)/r.height;
    el.style.transform = `rotateY(${(x-.5)*12}deg) rotateX(${(.5-y)*12}deg) translateY(-5px) scale(1.015)`;
    const ec = c.querySelector(".eclat"), ho = c.querySelector(".holo");
    if(ec){ ec.style.setProperty("--mx", x*100+"%"); ec.style.setProperty("--my", y*100+"%"); }
    if(ho) ho.style.backgroundPosition = `${x*100}% ${y*100}%`;
  }
  const h = $("#heros");
  if(h){ const r = h.getBoundingClientRect();
    if(e.clientY>r.top && e.clientY<r.bottom){
      const x = (e.clientX-r.left)/r.width, y = (e.clientY-r.top)/r.height;
      h.style.transform = `rotateY(${(x-.5)*3}deg) rotateX(${(.5-y)*3}deg)`; } }
  document.querySelector(".halos").style.transform =
    `translate(${(e.clientX/innerWidth-.5)*-26}px,${(e.clientY/innerHeight-.5)*-18}px)`;
}, {passive:true});
document.addEventListener("pointerout", e=>{
  const c = e.target.closest(".t3d");
  if(c && !c.contains(e.relatedTarget)) c.firstElementChild.style.transform = "";
  const h = $("#heros");
  if(h && !h.contains(e.relatedTarget)) h.style.transform = "";
}, true);

const zg = $("#zone-g");
zg.addEventListener("pointermove", e=>{
  const g = window._g; if(!g) return;
  const r = zg.getBoundingClientRect();
  const i = Math.max(0, Math.min(g.h.length-1, Math.round((e.clientX-r.left)/r.width*(g.h.length-1))));
  const vi = $("#vise"), p = $("#pt"); if(!vi) return;
  vi.setAttribute("x1", g.X(i)); vi.setAttribute("x2", g.X(i)); vi.setAttribute("opacity",".45");
  p.setAttribute("cx", g.X(i)); p.setAttribute("cy", g.Y(g.h[i].v)); p.setAttribute("opacity","1");
  const b = $("#info");
  b.innerHTML = `<b>${eur2(g.h[i].v)}</b><span>${g.fmt(g.h[i].t)}</span>`;
  b.style.left = (i/(g.h.length-1)*r.width)+"px";
  b.style.top = (g.Y(g.h[i].v)/216*r.height)+"px"; b.style.opacity = "1";
});
zg.addEventListener("pointerleave", ()=>{
  $("#info").style.opacity = "0";
  const v = $("#vise"), p = $("#pt");
  if(v){ v.setAttribute("opacity","0"); p.setAttribute("opacity","0"); }
});

(function ciel(){
  const cv = $("#ciel"), cx = cv.getContext("2d");
  let W, H, pts = [], raf, t = 0;
  const anime = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  function taille(){
    W = cv.width = innerWidth*devicePixelRatio; H = cv.height = innerHeight*devicePixelRatio;
    cv.style.width = innerWidth+"px"; cv.style.height = innerHeight+"px";
    pts = Array.from({length:44},()=>({x:Math.random(),y:Math.random(),z:Math.random()*.8+.2,v:Math.random()*.00016+.00004}));
  }
  function dessine(){
    cx.clearRect(0,0,W,H); const d = devicePixelRatio;
    cx.strokeStyle = "rgba(90,150,220,.085)"; cx.lineWidth = d;
    const hz = H*.62;
    for(let i=0;i<16;i++){ const p = ((t*.00016+i/16)%1), y = hz+Math.pow(p,2.4)*(H-hz);
      cx.globalAlpha = .5*(1-p); cx.beginPath(); cx.moveTo(0,y); cx.lineTo(W,y); cx.stroke(); }
    for(let i=-9;i<=9;i++){ cx.globalAlpha = .22;
      cx.beginPath(); cx.moveTo(W/2+i*W*.055,hz); cx.lineTo(W/2+i*W*.62,H); cx.stroke(); }
    cx.globalAlpha = 1;
    pts.forEach(p=>{ p.y -= p.v; if(p.y<-.05) p.y = 1.05;
      cx.fillStyle = `rgba(150,220,255,${.1+p.z*.22})`;
      cx.beginPath(); cx.arc(p.x*W,p.y*H,(1.6+p.z*2.2)*d,0,7); cx.fill(); });
    t++; if(anime) raf = requestAnimationFrame(dessine);
  }
  taille(); dessine();
  addEventListener("resize", ()=>{ cancelAnimationFrame(raf); taille(); dessine(); });
})();

/* ------------------------------------------------------------ démarrage */
rendrePeriodes();
recharger();
chargerBanques();
setInterval(recharger, 60000);   // le backend collecte, le front se resynchronise
