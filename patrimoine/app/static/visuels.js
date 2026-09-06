/* =====================================================================
   Visuels dessinés — aucune dépendance réseau, aucun logo reproduit.
   Les images officielles des cartes viennent de l'API (champ image).
   ===================================================================== */

const ECU = {
 eth:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#1B2033"/><path d="M20 7v9.9l8.4 3.8z" fill="#8A92B2"/><path d="M20 7l-8.4 13.7 8.4-3.8z" fill="#EDF2F7"/><path d="M20 26.4V33l8.4-11.8z" fill="#8A92B2"/><path d="M20 33v-6.6l-8.4-5.2z" fill="#EDF2F7"/><path d="M20 24.8l8.4-4.9-8.4-3.8z" fill="#5C6480"/><path d="M11.6 19.9l8.4 4.9v-8.7z" fill="#8A92B2"/></svg>`,
 zec:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#F5C33B"/><path d="M21.4 6h-2.8v3.2h-4.9v3.6h7.1l-7.4 11v3.4h5.2V31h2.8v-3.8h5.1v-3.6h-7.4l7.4-11v-3.2h-5.1z" fill="#181818"/></svg>`,
 hype:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#062E2A"/><path d="M8 20c3.4-5.6 6-7.4 8.6-5.4 2.3 1.8 2.6 6.6 5.2 8.2 2.7 1.7 5.4-1 10.2-6.6-3.4 8.6-6.6 11.6-9.6 10-2.7-1.4-3.2-6.4-5.6-8-2.4-1.6-5 .6-8.8 5.4z" fill="#4FE3C1"/></svg>`,
 btc:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#F7931A"/><path d="M26 17.4c.3-2.1-1.3-3.2-3.5-4l.7-2.9-1.8-.4-.7 2.8-1.4-.3.7-2.8-1.8-.5-.7 2.9-3.5-.9-.5 1.9s1.3.3 1.3.3c.7.2.8.7.8 1l-2 8.2c-.1.3-.4.6-.9.5l-1.3-.3-.9 2 3.4.9-.7 2.9 1.8.4.7-2.9 1.4.4-.7 2.8 1.8.5.7-2.9c3.1.6 5.4.3 6.4-2.5.8-2.2 0-3.5-1.6-4.4 1.2-.3 2-1 2.3-2.7zm-4.1 5.8c-.6 2.3-4.4 1-5.7.7l1-3.9c1.2.3 5.2.9 4.7 3.2zm.6-5.8c-.5 2.1-3.7.9-4.7.7l.9-3.5c1 .2 4.4.7 3.8 2.8z" fill="#fff"/></svg>`,
 fortuneo:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#F2F5F2"/><circle cx="20" cy="20" r="11" fill="#7DC244"/><circle cx="20" cy="14.6" r="2" fill="#fff"/><path d="M13.6 18.4h12.8M20 17.6v5.4m0 0-3.4 5.2M20 23l3.4 5.2" stroke="#fff" stroke-width="2.1" stroke-linecap="round"/></svg>`,
 lcl:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#0B2E6F"/><text x="20" y="25.5" text-anchor="middle" font-family="Sora,sans-serif" font-size="12.5" font-weight="700" fill="#F2C230">LCL</text></svg>`,
 amundi:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#F4F6F9"/><circle cx="20" cy="20" r="10.5" fill="#0B2A5B"/><text x="20" y="24" text-anchor="middle" font-family="Sora,sans-serif" font-size="9.5" font-weight="600" fill="#fff">AM</text></svg>`,
 bnp:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#0C3B2E"/><path d="M20 10.5c2.4 2.4 3.4 4 3.4 5.6M20 10.5c-2.4 2.4-3.4 4-3.4 5.6M13 15.6c2.9.6 4.6 1.5 5.7 2.8M27 15.6c-2.9.6-4.6 1.5-5.7 2.8M14.5 23.3c2.4-1.6 4.3-2.2 6-2.2M25.5 23.3c-2.4-1.6-4.3-2.2-6-2.2M17.6 29c.9-2.7 1.6-4.3 2.6-5.4M22.4 29c-.9-2.7-1.6-4.3-2.6-5.4" stroke="#00A651" stroke-width="2" stroke-linecap="round"/></svg>`,
 kraken:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#5741D9"/><path d="M20 8c5.5 0 10 4.5 10 10v3.5a2 2 0 0 1-4 0V18a2 2 0 0 0-4 0v4.6a2 2 0 0 1-4 0V18a2 2 0 0 0-4 0v3.5a2 2 0 0 1-4 0V18c0-5.5 4.5-10 10-10z" fill="#fff"/><path d="M16 26.5v3.2m4-3.2v4.3m4-4.3v3.2" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`,
 montre:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#1B1508"/><rect x="16" y="6.5" width="8" height="7" rx="2" fill="#8A7448"/><rect x="16" y="26.5" width="8" height="7" rx="2" fill="#8A7448"/><circle cx="20" cy="20" r="8.4" fill="#0D1119" stroke="#F0C077" stroke-width="1.8"/><path d="M20 15.6V20l3 2" stroke="#F0C077" stroke-width="1.7" stroke-linecap="round"/></svg>`,
 poke:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#2B0F22"/><rect x="12" y="8" width="16" height="24" rx="3" fill="#FF4FD8" opacity=".2" stroke="#FF4FD8" stroke-width="1.5"/><path d="M16 14h8M16 18h6" stroke="#FF9DE0" stroke-width="1.8" stroke-linecap="round"/><circle cx="20" cy="25" r="3.4" fill="#FF4FD8" opacity=".55"/></svg>`,
 upc:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#2A1230"/><path d="M12 15.5 20 11l8 4.5v9L20 29l-8-4.5z" fill="#FF4FD8" opacity=".22"/><path d="M12 15.5 20 11l8 4.5v9L20 29l-8-4.5z" stroke="#FF4FD8" stroke-width="1.6" stroke-linejoin="round" fill="none"/><path d="M20 16c1.8 1.4 2.6 2.8 2.6 4.2A2.6 2.6 0 0 1 20 22.8a2.6 2.6 0 0 1-2.6-2.6c0-1.4.8-2.8 2.6-4.2z" fill="#FBBF24"/></svg>`,
 display:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#161B2E"/><rect x="10" y="13" width="6" height="15" rx="1.6" fill="#4DA3FF" opacity=".8"/><rect x="17" y="11" width="6" height="17" rx="1.6" fill="#A78BFA" opacity=".85"/><rect x="24" y="14" width="6" height="14" rx="1.6" fill="#FF4FD8" opacity=".8"/></svg>`,
 bundle:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#12222B"/><rect x="9" y="15" width="22" height="13" rx="2.5" fill="#0D131C" stroke="#34E7C8" stroke-width="1.6"/><path d="M20 15v13M9 20.5h22" stroke="#34E7C8" stroke-width="1.4" opacity=".7"/><path d="M20 15c-2.6-3.4-6-2.4-5 .6.6 1.8 3 1.4 5-.6zm0 0c2.6-3.4 6-2.4 5 .6-.6 1.8-3 1.4-5-.6z" fill="#F0C077"/></svg>`,
 etb:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#101C33"/><rect x="10" y="12" width="20" height="17" rx="2.5" fill="#16294A" stroke="#6FA8FF" stroke-width="1.5"/><path d="M10 18h20" stroke="#6FA8FF" stroke-width="1.4"/><rect x="17" y="8.5" width="6" height="5" rx="1.5" fill="#6FA8FF" opacity=".8"/></svg>`,
 carte:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#1E1030"/><rect x="13" y="8" width="14" height="24" rx="2.5" fill="#3B2160" stroke="#C9A6F5" stroke-width="1.4"/><circle cx="20" cy="17" r="4" fill="#C9A6F5" opacity=".65"/><path d="M15.5 25h9" stroke="#C9A6F5" stroke-width="1.6" stroke-linecap="round"/></svg>`,
 autre:`<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#161D28"/><circle cx="20" cy="20" r="7.5" stroke="#8FA0B3" stroke-width="1.8" fill="none"/><path d="M20 15.5v9M15.5 20h9" stroke="#8FA0B3" stroke-width="1.8" stroke-linecap="round"/></svg>`
};

/* déduit l'écusson à partir de la ligne */
function ecussonPour(l, compte) {
  const s = (l.sous_titre || "").toUpperCase();
  if (l.image) return `<img src="${l.image}" alt="">`;
  if (ECU[s.toLowerCase()]) return ECU[s.toLowerCase()];
  if (s === "ETH") return ECU.eth;
  if (s === "ZEC") return ECU.zec;
  if (s === "HYPE") return ECU.hype;
  if (s === "BTC" || s === "XBT") return ECU.btc;
  if (l.style && ECU[l.style]) return ECU[l.style];
  if (compte) {
    const i = (compte.institution || "").toLowerCase();
    if (i.includes("fortuneo")) return ECU.fortuneo;
    if (i.includes("lcl")) return ECU.lcl;
    if (i.includes("amundi")) return ECU.amundi;
    if (i.includes("kraken")) return ECU.kraken;
    if (compte.categorie === "pokemon") return ECU.poke;
    if (compte.categorie === "montre") return ECU.montre;
  }
  if ((l.sous_titre || "").startsWith("FR001")) return ECU.amundi;
  return ECU.autre;
}

/* ---------------- produits scellés ---------------- */
function visuelScelle(kind) {
  const ombre = `<ellipse cx="150" cy="252" rx="86" ry="12" fill="#000" opacity=".5"/>`;
  if (kind === "upc") return `<svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice"><defs>
    <linearGradient id="uf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B2350"/><stop offset=".55" stop-color="#8E2F4E"/><stop offset="1" stop-color="#C7551F"/></linearGradient>
    <linearGradient id="us" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#33132E"/><stop offset="1" stop-color="#4A1B33"/></linearGradient>
    <linearGradient id="ut" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7C3363"/><stop offset="1" stop-color="#43183A"/></linearGradient>
    <radialGradient id="ug" cx=".5" cy=".35"><stop offset="0" stop-color="#FFD98A" stop-opacity=".9"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient></defs>
    <rect width="300" height="300" fill="#080D18"/>${ombre}
    <path d="M84 66 150 40l72 28-66 28z" fill="url(#ut)"/><path d="M84 66v148l72 30V96z" fill="url(#uf)"/><path d="M222 68v144l-66 26V96z" fill="url(#us)"/>
    <path d="M84 66 150 40l72 28-66 28zM84 66v148l72 30V96zm138-28v144l-66 26" fill="none" stroke="#F2C173" stroke-width="2" stroke-linejoin="round" opacity=".85"/>
    <ellipse cx="120" cy="150" rx="52" ry="44" fill="url(#ug)" opacity=".5"/>
    <path d="M120 106c17 15 25 29 25 41a25 25 0 0 1-50 0c0-12 8-26 25-41z" fill="#FFC24D"/>
    <path d="M120 128c8 8 13 15 13 21a13 13 0 0 1-26 0c0-6 5-13 13-21z" fill="#FF6E3C"/>
    <path d="M96 202h50M96 216h34" stroke="#F2C173" stroke-width="4" stroke-linecap="round" opacity=".6"/></svg>`;
  if (kind === "display") return `<svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice"><defs>
    <linearGradient id="db" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D2A52"/><stop offset="1" stop-color="#080D1C"/></linearGradient>
    <linearGradient id="dl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#101A38"/><stop offset="1" stop-color="#1B2A57"/></linearGradient></defs>
    <rect width="300" height="300" fill="#080D18"/>${ombre}
    ${[0,1,2,3,4,5].map(i=>`<g transform="translate(${74+i*26} ${72+(i%2?5:0)})">
      <rect width="22" height="118" rx="3" fill="${["#4DA3FF","#A78BFA","#FF4FD8","#34E7C8","#F0C077","#7C6CF6"][i]}" opacity=".9"/>
      <rect width="22" height="42" rx="3" fill="#fff" opacity=".16"/></g>`).join("")}
    <path d="M66 150h168v96H66z" fill="url(#db)"/><path d="M66 150l-14 14v96l14-14z" fill="url(#dl)"/>
    <path d="M66 150h168v96H66zM66 150l-14 14v96l14-14" fill="none" stroke="#4D6BB0" stroke-width="2" stroke-linejoin="round"/>
    <path d="M86 186h84M86 202h56" stroke="#7FA6E8" stroke-width="5" stroke-linecap="round" opacity=".55"/></svg>`;
  if (kind === "etb") return `<svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice"><defs>
    <linearGradient id="eb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1B3A66"/><stop offset="1" stop-color="#0A1730"/></linearGradient></defs>
    <rect width="300" height="300" fill="#080D18"/>${ombre}
    <path d="M74 108h152v130H74z" fill="url(#eb)" stroke="#6FA8FF" stroke-width="2"/>
    <path d="M74 108l16-18h152l-16 18z" fill="#28518C" stroke="#6FA8FF" stroke-width="2" stroke-linejoin="round"/>
    <path d="M226 108l16-18v130l-16 18z" fill="#12294D" stroke="#6FA8FF" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="150" cy="160" r="30" fill="#0B1730" stroke="#8CC6FF" stroke-width="2"/>
    <path d="M150 136c11 10 16 19 16 26a16 16 0 0 1-32 0c0-7 5-16 16-26z" fill="#7FD7FF" opacity=".85"/>
    <path d="M96 208h108M96 222h72" stroke="#6FA8FF" stroke-width="4" stroke-linecap="round" opacity=".55"/></svg>`;
  if (kind === "bundle") return `<svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice"><defs>
    <linearGradient id="bb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#123C3B"/><stop offset="1" stop-color="#13223C"/></linearGradient></defs>
    <rect width="300" height="300" fill="#080D18"/>${ombre}
    <path d="M78 96h144v138H78z" fill="url(#bb)" stroke="#34E7C8" stroke-width="2"/>
    <path d="M150 96v138M78 152h144" stroke="#34E7C8" stroke-width="2" opacity=".45"/>
    ${[0,1].map(i=>`<rect x="${96+i*66}" y="112" width="42" height="76" rx="4" fill="${i?"#FF4FD8":"#4DA3FF"}" opacity=".5"/>`).join("")}
    <path d="M150 96c-26-30-58-20-48 6 6 16 28 12 48-6zm0 0c26-30 58-20 48 6-6 16-28 12-48-6z" fill="#F0C077"/>
    <circle cx="150" cy="98" r="12" fill="#080D18" stroke="#F0C077" stroke-width="3"/></svg>`;
  return `<svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice"><defs>
    <linearGradient id="cf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3D2168"/><stop offset=".5" stop-color="#6B2E7A"/><stop offset="1" stop-color="#2A1B5A"/></linearGradient>
    <radialGradient id="cg" cx=".5" cy=".4"><stop offset="0" stop-color="#fff" stop-opacity=".36"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="300" height="300" fill="#080D18"/>${ombre}
    <g transform="rotate(-6 150 150)"><rect x="86" y="42" width="128" height="184" rx="9" fill="url(#cf)" stroke="#D3A9FF" stroke-width="2"/>
    <rect x="98" y="62" width="104" height="80" rx="5" fill="#0B1120" opacity=".72"/>
    <ellipse cx="150" cy="102" rx="44" ry="36" fill="url(#cg)"/><circle cx="150" cy="100" r="24" fill="#FFD066" opacity=".8"/>
    <path d="M150 78c9 11 13 20 13 27a13 13 0 0 1-26 0c0-7 4-16 13-27z" fill="#FF7A3C"/>
    <rect x="98" y="152" width="104" height="54" rx="5" fill="#0B1120" opacity=".6"/>
    <path d="M110 168h80M110 182h60M110 194h44" stroke="#D3A9FF" stroke-width="4" stroke-linecap="round" opacity=".5"/></g></svg>`;
}

/* ---------------- montres : générateur paramétrique ---------------- */
const MODELES = {
  ballade:{cadran:"#E7E9EC",cadran2:"#B9BFC8",boite:"#C3CAD3",lunette:"cannelee",index:"romain",bracelet:"jubile",date:1,aiguilles:"#2A3038",accent:"#8A939F"},
  sub:{cadran:"#0B0F14",cadran2:"#05070A",boite:"#B7BFC9",lunette:"plongee",lunetteC:"#0C1622",index:"points",bracelet:"oyster",aiguilles:"#E8F4FF",accent:"#DFF6E6"},
  subdate:{cadran:"#0B0F14",cadran2:"#05070A",boite:"#B7BFC9",lunette:"plongee",lunetteC:"#0C1622",index:"points",bracelet:"oyster",date:1,aiguilles:"#E8F4FF",accent:"#DFF6E6"},
  pepsi:{cadran:"#0A0E13",cadran2:"#05070A",boite:"#B7BFC9",lunette:"bicolore",lunetteC:"#1B3C8C",lunetteC2:"#8E1B2C",index:"points",bracelet:"jubile",date:1,aiguilles:"#E8F4FF",accent:"#7FE3C0"},
  daytona:{cadran:"#EDEFF2",cadran2:"#C9CFD8",boite:"#B7BFC9",lunette:"tachy",lunetteC:"#0B0F14",index:"batons",bracelet:"oyster",compteurs:3,aiguilles:"#22282F",accent:"#0B0F14"},
  explorer:{cadran:"#0C1014",cadran2:"#06090C",boite:"#B7BFC9",lunette:"lisse",index:"chiffres",bracelet:"oyster",aiguilles:"#E8F4FF",accent:"#E8F4FF"},
  moon:{cadran:"#0A0C0F",cadran2:"#050708",boite:"#AFB7C1",lunette:"tachy",lunetteC:"#101418",index:"batons",bracelet:"oyster",compteurs:3,aiguilles:"#F2F6FA",accent:"#F2F6FA"},
  seamaster:{cadran:"#0E2A63",cadran2:"#061737",boite:"#B7BFC9",lunette:"plongee",lunetteC:"#0B2454",index:"points",bracelet:"oyster",date:1,aiguilles:"#E8F4FF",accent:"#9FD8FF"},
  bb58:{cadran:"#0B0D10",cadran2:"#06080A",boite:"#B0B8C2",lunette:"plongee",lunetteC:"#141820",index:"points",bracelet:"oyster",aiguilles:"#E4C98A",accent:"#E4C98A"},
  pelagos:{cadran:"#0A0F14",cadran2:"#05080B",boite:"#98A3AE",lunette:"plongee",lunetteC:"#0F161E",index:"batons",bracelet:"oyster",aiguilles:"#DFF6E6",accent:"#DFF6E6"},
  snowflake:{cadran:"#F1F4F8",cadran2:"#CBD5E1",boite:"#A9B3BE",lunette:"lisse",index:"batons",bracelet:"oyster",date:1,aiguilles:"#3A4450",accent:"#6C7A8A"},
  tank:{forme:"rect",cadran:"#F5F1E6",cadran2:"#DCD5C2",boite:"#D8C08A",lunette:"lisse",index:"romain",bracelet:"cuir",aiguilles:"#2A2F38",accent:"#2A2F38"},
  prospex:{cadran:"#0C1620",cadran2:"#060B12",boite:"#B0B8C2",lunette:"plongee",lunetteC:"#101A26",index:"points",bracelet:"oyster",date:1,aiguilles:"#E8F4FF",accent:"#9FE8FF"},
  hydro:{cadran:"#0B1E3E",cadran2:"#061128",boite:"#B7BFC9",lunette:"plongee",lunetteC:"#0C2249",index:"points",bracelet:"oyster",date:1,aiguilles:"#E8F4FF",accent:"#E8F4FF"},
  prx:{cadran:"#12325C",cadran2:"#081A34",boite:"#B7BFC9",lunette:"lisse",index:"batons",bracelet:"integre",date:1,aiguilles:"#E8F4FF",accent:"#E8F4FF"}
};

function visuelMontre(style) {
  const m = MODELES[style] || MODELES.sub, R = 64, cx = 150, cy = 150;
  const rond = m.forme !== "rect";
  const brac = (() => {
    if (m.bracelet === "cuir") return `<path d="M120 88V40a10 10 0 0 1 10-10h40a10 10 0 0 1 10 10v48z" fill="#3B2A22"/>
      <path d="M120 212v48a10 10 0 0 0 10 10h40a10 10 0 0 0 10-10v-48z" fill="#3B2A22"/>
      <path d="M124 44h52M124 56h52M124 244h52M124 256h52" stroke="#241812" stroke-width="2" opacity=".8"/>`;
    const n = m.bracelet === "jubile" ? 7 : m.bracelet === "integre" ? 3 : 4;
    const lg = m.bracelet === "jubile" ? 76 : m.bracelet === "integre" ? 88 : 80;
    let s = `<defs><linearGradient id="br${style}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6E7B8B"/><stop offset=".4" stop-color="#D2DAE4"/><stop offset=".7" stop-color="#8A95A3"/><stop offset="1" stop-color="#5A6674"/></linearGradient></defs>
      <path d="M${150-lg/2} 92V32a10 10 0 0 1 10-10h${lg-20}a10 10 0 0 1 10 10v60z" fill="url(#br${style})"/>
      <path d="M${150-lg/2} 208v60a10 10 0 0 0 10 10h${lg-20}a10 10 0 0 0 10-10v-60z" fill="url(#br${style})"/>`;
    for (let i = 0; i < n; i++) {
      const w = lg / n - 3, x = 150 - lg / 2 + 2 + i * (lg / n);
      const op = m.bracelet === "jubile" && i % 2 ? .1 : .28;
      s += `<rect x="${x}" y="30" width="${w}" height="60" rx="3" fill="#0B1119" opacity="${op}"/>
            <rect x="${x}" y="210" width="${w}" height="60" rx="3" fill="#0B1119" opacity="${op}"/>`;
    }
    return s;
  })();
  const lunette = (() => {
    if (m.lunette === "cannelee") {
      let s = `<circle cx="${cx}" cy="${cy}" r="${R+12}" fill="#D6DDE5"/>`;
      for (let i = 0; i < 56; i++) { const a = i * (360/56) * Math.PI/180;
        s += `<line x1="${cx+Math.sin(a)*(R+4)}" y1="${cy-Math.cos(a)*(R+4)}" x2="${cx+Math.sin(a)*(R+12)}" y2="${cy-Math.cos(a)*(R+12)}" stroke="#8892A0" stroke-width="1.6"/>`; }
      return s;
    }
    if (m.lunette === "plongee") {
      let s = `<circle cx="${cx}" cy="${cy}" r="${R+13}" fill="${m.lunetteC}" stroke="#93A0AE" stroke-width="2"/>`;
      for (let i = 0; i < 12; i++) { const a = i*30*Math.PI/180;
        s += `<circle cx="${cx+Math.sin(a)*(R+7)}" cy="${cy-Math.cos(a)*(R+7)}" r="${i?2:3.4}" fill="${i?"#C9D6E4":m.accent}"/>`; }
      return s;
    }
    if (m.lunette === "bicolore")
      return `<path d="M${cx} ${cy-R-13}a${R+13} ${R+13} 0 0 1 0 ${2*(R+13)}z" fill="${m.lunetteC2}"/>
        <path d="M${cx} ${cy-R-13}a${R+13} ${R+13} 0 0 0 0 ${2*(R+13)}z" fill="${m.lunetteC}"/>
        <circle cx="${cx}" cy="${cy}" r="${R+13}" fill="none" stroke="#93A0AE" stroke-width="2"/>
        <circle cx="${cx}" cy="${cy-R-7}" r="3" fill="#EAF2FA"/>`;
    if (m.lunette === "tachy") {
      let s = `<circle cx="${cx}" cy="${cy}" r="${R+13}" fill="${m.lunetteC}" stroke="#9AA6B4" stroke-width="2"/>`;
      for (let i = 0; i < 20; i++) { const a = i*18*Math.PI/180;
        s += `<line x1="${cx+Math.sin(a)*(R+5)}" y1="${cy-Math.cos(a)*(R+5)}" x2="${cx+Math.sin(a)*(R+11)}" y2="${cy-Math.cos(a)*(R+11)}" stroke="#C8D3E0" stroke-width="1.4"/>`; }
      return s;
    }
    return `<circle cx="${cx}" cy="${cy}" r="${R+11}" fill="#C6CFD9"/>`;
  })();
  let index = "";
  for (let i = 0; i < 12; i++) {
    const a = i*30*Math.PI/180, r1 = R-9, r2 = R-19;
    const x1 = cx+Math.sin(a)*r1, y1 = cy-Math.cos(a)*r1, x2 = cx+Math.sin(a)*r2, y2 = cy-Math.cos(a)*r2;
    if (m.date && i === 3) continue;
    if (m.index === "romain") {
      const rom = ["XII","I","II","III","IV","V","VI","VII","VIII","IX","X","XI"][i];
      index += `<text x="${cx+Math.sin(a)*(R-15)}" y="${cy-Math.cos(a)*(R-15)+3.5}" text-anchor="middle" font-family="Sora,serif" font-size="9" font-weight="500" fill="${m.aiguilles}">${rom}</text>`;
    } else if (m.index === "points") {
      index += `<circle cx="${(x1+x2)/2}" cy="${(y1+y2)/2}" r="${i%3===0?3.6:2.8}" fill="${m.accent}" stroke="#8892A0" stroke-width=".6"/>`;
    } else if (m.index === "chiffres" && [0,3,6,9].includes(i)) {
      index += `<text x="${cx+Math.sin(a)*(R-16)}" y="${cy-Math.cos(a)*(R-16)+4}" text-anchor="middle" font-family="Sora" font-size="12" font-weight="600" fill="${m.accent}">${["12","3","6","9"][[0,3,6,9].indexOf(i)]}</text>`;
    } else {
      index += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${m.accent}" stroke-width="${m.index==="chiffres"?2.4:3}" stroke-linecap="round"/>`;
    }
  }
  const compteurs = m.compteurs ? [[cx,cy-24],[cx-26,cy+16],[cx+26,cy+16]].map(([x,y]) =>
    `<circle cx="${x}" cy="${y}" r="14" fill="${m.cadran2}" opacity=".55" stroke="${m.accent}" stroke-width=".9"/>
     <circle cx="${x}" cy="${y}" r="1.6" fill="${m.aiguilles}"/>`).join("") : "";
  const date = m.date ? `<rect x="${cx+R-26}" y="${cy-8}" width="19" height="16" rx="2.5" fill="#fff" stroke="#8892A0" stroke-width=".8"/>
     <text x="${cx+R-16.5}" y="${cy+4}" text-anchor="middle" font-family="Sora" font-size="10" font-weight="600" fill="#1A1F26">8</text>` : "";
  const boite = rond
    ? `<circle cx="${cx}" cy="${cy}" r="${R+22}" fill="#7C8794"/><circle cx="${cx}" cy="${cy}" r="${R+18}" fill="${m.boite}"/>`
    : `<rect x="${cx-72}" y="${cy-88}" width="144" height="176" rx="18" fill="#7C8794"/><rect x="${cx-68}" y="${cy-84}" width="136" height="168" rx="16" fill="${m.boite}"/>`;
  const cadran = rond
    ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#cad${style})"/>`
    : `<rect x="${cx-52}" y="${cy-68}" width="104" height="136" rx="8" fill="url(#cad${style})"/>`;
  return `<svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice">
    <defs><radialGradient id="fd${style}" cx=".5" cy=".26"><stop offset="0" stop-color="#28344A"/><stop offset="1" stop-color="#070B13"/></radialGradient>
      <radialGradient id="cad${style}" cx=".38" cy=".3"><stop offset="0" stop-color="${m.cadran}"/><stop offset="1" stop-color="${m.cadran2}"/></radialGradient></defs>
    <rect width="300" height="300" fill="url(#fd${style})"/>
    <ellipse cx="150" cy="258" rx="76" ry="12" fill="#000" opacity=".55"/>
    ${brac}${boite}${rond?lunette:""}${cadran}${index}${compteurs}${date}
    <path d="M${cx} ${cy-42}V${cy}" stroke="${m.aiguilles}" stroke-width="5" stroke-linecap="round"/>
    <path d="M${cx} ${cy}l24 15" stroke="${m.aiguilles}" stroke-width="4" stroke-linecap="round"/>
    <path d="M${cx} ${cy}l-13 30" stroke="${m.accent==="#DFF6E6"?"#FF6B4A":m.accent}" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="3.4" fill="${m.aiguilles}"/>
    ${rond?`<path d="M${cx+R+18} ${cy-9}h9a6 6 0 0 1 6 6v6a6 6 0 0 1-6 6h-9z" fill="${m.boite}"/>`:""}
    <path d="M${cx-58} ${cy-40}a${R+18} ${R+18} 0 0 1 34-38" stroke="#fff" stroke-width="7" opacity=".12" fill="none" stroke-linecap="round"/></svg>`;
}

/* ---------------- catalogue montres ---------------- */
// `img` : photo officielle (Wikimedia Commons, licences libres). Absente =
// on retombe sur l'illustration SVG. Éditable à la main dans la fiche montre.
const WM = "https://upload.wikimedia.org/wikipedia/commons/thumb/";
const CATALOGUE = [
  {id:"m0",marque:"Tissot",modele:"Ballade Powermatic 80",ref:"T156.407",style:"ballade",neuf:1025,coteMin:520,coteMax:700},
  {id:"m1",marque:"Rolex",modele:"Submariner No Date",ref:"124060",style:"sub",neuf:10550,coteMin:11500,coteMax:13500,img:WM+"c/cd/Rolex-Submariner.jpg/500px-Rolex-Submariner.jpg"},
  {id:"m2",marque:"Rolex",modele:"Submariner Date",ref:"126610LN",style:"subdate",neuf:11600,coteMin:12500,coteMax:15000,img:WM+"c/cd/Rolex-Submariner.jpg/500px-Rolex-Submariner.jpg"},
  {id:"m3",marque:"Rolex",modele:"GMT-Master II Pepsi",ref:"126710BLRO",style:"pepsi",neuf:12350,coteMin:16000,coteMax:19500},
  {id:"m4",marque:"Rolex",modele:"Daytona acier",ref:"126500LN",style:"daytona",neuf:17000,coteMin:28000,coteMax:36000,img:WM+"5/5b/Daytona116509.jpg/500px-Daytona116509.jpg"},
  {id:"m5",marque:"Rolex",modele:"Explorer I 36",ref:"124270",style:"explorer",neuf:7600,coteMin:7200,coteMax:8600},
  {id:"m6",marque:"Omega",modele:"Speedmaster Moonwatch",ref:"310.30.42.50",style:"moon",neuf:8000,coteMin:6200,coteMax:7400,img:WM+"c/cd/Vintage_Omega_Speedmaster_%22Pre-moon%22.jpg/500px-Vintage_Omega_Speedmaster_%22Pre-moon%22.jpg"},
  {id:"m7",marque:"Omega",modele:"Seamaster Diver 300M",ref:"210.30.42",style:"seamaster",neuf:6250,coteMin:4600,coteMax:5600,img:WM+"4/46/Omega_Seamaster_Co-Axial.jpg/500px-Omega_Seamaster_Co-Axial.jpg"},
  {id:"m8",marque:"Tudor",modele:"Black Bay 58",ref:"M7939A1A0NU",style:"bb58",neuf:4300,coteMin:3400,coteMax:4100},
  {id:"m9",marque:"Tudor",modele:"Pelagos 39",ref:"M25407N",style:"pelagos",neuf:4600,coteMin:3900,coteMax:4600},
  {id:"m10",marque:"Grand Seiko",modele:"Snowflake",ref:"SBGA211",style:"snowflake",neuf:6300,coteMin:4600,coteMax:5400},
  {id:"m11",marque:"Cartier",modele:"Tank Must Large",ref:"WSTA0041",style:"tank",neuf:3500,coteMin:2600,coteMax:3200,img:WM+"d/df/Cartier_Tank.jpg/500px-Cartier_Tank.jpg"},
  {id:"m12",marque:"Seiko",modele:"Prospex SPB143",ref:"SPB143",style:"prospex",neuf:1200,coteMin:800,coteMax:1050},
  {id:"m13",marque:"Longines",modele:"HydroConquest 41",ref:"L3.781.4",style:"hydro",neuf:1450,coteMin:900,coteMax:1150},
  {id:"m14",marque:"Tissot",modele:"PRX Powermatic 80",ref:"T137.407",style:"prx",neuf:750,coteMin:450,coteMax:620}
];
