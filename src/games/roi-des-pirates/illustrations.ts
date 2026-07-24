export const SVG_INTRO = `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g-intro-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#04061a"/><stop offset="100%" stop-color="#12224a"/></linearGradient></defs>
  <rect width="400" height="175" fill="url(#g-intro-sky)"/>
  <rect y="175" width="400" height="75" fill="#080e24"/>
  <circle cx="308" cy="58" r="26" fill="#f8eea0"/>
  <circle cx="320" cy="50" r="24" fill="#04061a"/>
  <circle cx="42" cy="18" r="1.5" fill="#fff" opacity=".85"/>
  <circle cx="92" cy="32" r="1" fill="#fff" opacity=".6"/>
  <circle cx="148" cy="11" r="1.5" fill="#fff" opacity=".9"/>
  <circle cx="205" cy="26" r="1" fill="#fff" opacity=".7"/>
  <circle cx="262" cy="7" r="2" fill="#fff" opacity=".8"/>
  <circle cx="78" cy="48" r="1" fill="#fff" opacity=".5"/>
  <circle cx="175" cy="42" r="1" fill="#fff" opacity=".6"/>
  <circle cx="355" cy="22" r="1.5" fill="#fff" opacity=".75"/>
  <path d="M0,180 Q100,172 200,180 T400,180" fill="none" stroke="#1a3868" stroke-width="2.5"/>
  <path d="M0,193 Q100,186 200,193 T400,193" fill="none" stroke="#0e2448" stroke-width="1.5" opacity=".6"/>
  <polygon points="0,166 62,166 57,178 0,178" fill="#0d0b0a"/>
  <rect x="0" y="150" width="7" height="28" fill="#0d0b0a"/>
  <rect x="26" y="157" width="5" height="21" fill="#0d0b0a"/>
  <ellipse cx="37" cy="147" rx="5" ry="6" fill="#0d0b0a"/>
  <rect x="34" y="152" width="6" height="15" fill="#0d0b0a"/>
  <polygon points="346,172 360,167 374,172" fill="#16130e"/>
  <rect x="358" y="154" width="2" height="14" fill="#16130e"/>
  <polygon points="357,155 368,161 357,161" fill="#211c18" opacity=".8"/>
</svg>`;

export const SVG_EAST_BLUE = `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g-eb-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5ec8f0"/><stop offset="100%" stop-color="#a8dff5"/></linearGradient>
  <linearGradient id="g-eb-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1e8ae0"/><stop offset="100%" stop-color="#0a5aaa"/></linearGradient></defs>
  <rect width="400" height="250" fill="url(#g-eb-sky)"/>
  <circle cx="65" cy="55" r="40" fill="#ffe666" opacity=".9"/>
  <rect y="160" width="400" height="90" fill="url(#g-eb-sea)"/>
  <path d="M0,165 Q80,155 160,165 T320,165 T400,162" fill="#1a7ad4" opacity=".5"/>
  <ellipse cx="200" cy="202" rx="185" ry="50" fill="#e8d88a"/>
  <ellipse cx="200" cy="215" rx="185" ry="48" fill="#d4c472"/>
  <rect x="148" y="110" width="9" height="85" fill="#7a5610" rx="3"/>
  <path d="M157,110 Q140,92 115,98 Q138,112 157,110Z" fill="#1a7a28"/>
  <path d="M152,100 Q168,80 192,88 Q170,105 152,100Z" fill="#228b32"/>
  <path d="M148,120 Q128,108 108,118 Q130,130 148,120Z" fill="#1a7a28" opacity=".8"/>
  <ellipse cx="260" cy="175" rx="18" ry="6" fill="#c8b060" opacity=".6"/>
  <path d="M245,155 Q255,148 265,155 L270,172 L240,172Z" fill="#9a7830" opacity=".7"/>
  <rect x="253" y="140" width="2" height="16" fill="#9a7830"/>
</svg>`;

export const SVG_DEVIL_FRUIT = `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g-fruit-bg" cx="50%" cy="55%" r="55%">
      <stop offset="0%" stop-color="#2a0a4e"/>
      <stop offset="100%" stop-color="#08030e"/>
    </radialGradient>
    <radialGradient id="g-fruit-body" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stop-color="#c060ff"/>
      <stop offset="100%" stop-color="#6010c0"/>
    </radialGradient>
  </defs>
  <rect width="400" height="250" fill="url(#g-fruit-bg)"/>
  <ellipse cx="200" cy="145" rx="60" ry="68" fill="#1a0830" opacity=".8"/>
  <ellipse cx="200" cy="138" rx="52" ry="58" fill="url(#g-fruit-body)"/>
  <path d="M170,118 Q200,106 230,118 Q200,130 170,118" fill="none" stroke="#e0a0ff" stroke-width="2.5" opacity=".7"/>
  <path d="M162,142 Q200,126 238,142 Q200,158 162,142" fill="none" stroke="#e0a0ff" stroke-width="2.5" opacity=".7"/>
  <path d="M170,166 Q200,154 230,166 Q200,178 170,166" fill="none" stroke="#e0a0ff" stroke-width="2.5" opacity=".7"/>
  <path d="M200,82 Q212,64 224,58" stroke="#8030d0" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="180" cy="120" rx="14" ry="20" fill="#e0a0ff" opacity=".3"/>
  <line x1="200" y1="30" x2="200" y2="56" stroke="#8030d0" stroke-width="1.5" opacity=".4"/>
  <line x1="232" y1="40" x2="220" y2="62" stroke="#8030d0" stroke-width="1.5" opacity=".4"/>
  <line x1="168" y1="40" x2="180" y2="62" stroke="#8030d0" stroke-width="1.5" opacity=".4"/>
  <line x1="148" y1="68" x2="166" y2="84" stroke="#8030d0" stroke-width="1.5" opacity=".35"/>
  <line x1="252" y1="68" x2="234" y2="84" stroke="#8030d0" stroke-width="1.5" opacity=".35"/>
</svg>`;

export const SVG_HAKI = `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="g-haki-glow" cx="50%" cy="52%" r="50%">
    <stop offset="0%" stop-color="#181860"/>
    <stop offset="100%" stop-color="#04040c"/>
  </radialGradient></defs>
  <rect width="400" height="250" fill="#04040c"/>
  <ellipse cx="200" cy="135" rx="120" ry="130" fill="url(#g-haki-glow)"/>
  <ellipse cx="200" cy="88" rx="19" ry="21" fill="#0e0e18"/>
  <rect x="188" y="107" width="22" height="58" fill="#0e0e18" rx="4"/>
  <rect x="164" y="112" width="24" height="11" fill="#0e0e18" rx="4" transform="rotate(-25,164,112)"/>
  <rect x="212" y="112" width="24" height="11" fill="#0e0e18" rx="4" transform="rotate(25,236,112)"/>
  <rect x="188" y="165" width="10" height="44" fill="#0e0e18" rx="4"/>
  <rect x="202" y="165" width="10" height="44" fill="#0e0e18" rx="4"/>
  <ellipse cx="200" cy="135" rx="46" ry="52" fill="none" stroke="#2828a0" stroke-width="10" opacity=".6"/>
  <ellipse cx="200" cy="135" rx="68" ry="76" fill="none" stroke="#181870" stroke-width="6" opacity=".45"/>
  <ellipse cx="200" cy="135" rx="94" ry="104" fill="none" stroke="#0e0e48" stroke-width="4" opacity=".3"/>
  <ellipse cx="200" cy="135" rx="118" ry="126" fill="none" stroke="#08083a" stroke-width="2" opacity=".2"/>
</svg>`;

export const SVG_MARINE = `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g-mar-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b8ccdc"/><stop offset="100%" stop-color="#d8e8f0"/></linearGradient></defs>
  <rect width="400" height="250" fill="url(#g-mar-bg)"/>
  <rect x="55" y="58" width="290" height="192" fill="#deeaf5" rx="2"/>
  <rect x="55" y="58" width="290" height="24" fill="#1a4a8c"/>
  <circle cx="200" cy="145" r="58" fill="#1a4a8c" opacity=".1"/>
  <circle cx="200" cy="145" r="40" fill="none" stroke="#1a4a8c" stroke-width="2" opacity=".15"/>
  <line x1="170" y1="115" x2="230" y2="175" stroke="#1a4a8c" stroke-width="2" opacity=".15"/>
  <line x1="230" y1="115" x2="170" y2="175" stroke="#1a4a8c" stroke-width="2" opacity=".15"/>
  <ellipse cx="105" cy="148" rx="15" ry="17" fill="#2a1a08"/>
  <rect x="92" y="164" width="22" height="54" fill="#2a1a08" rx="3"/>
  <rect x="72" y="170" width="20" height="10" fill="#2a1a08" rx="3" transform="rotate(-20,72,170)"/>
  <ellipse cx="105" cy="133" rx="25" ry="8" fill="#c89a30"/>
  <ellipse cx="105" cy="134" rx="15" ry="13" fill="#c89a30"/>
  <ellipse cx="295" cy="148" rx="15" ry="17" fill="#182a5a"/>
  <rect x="282" y="164" width="22" height="54" fill="#182a5a" rx="3"/>
  <rect x="302" y="170" width="20" height="10" fill="#182a5a" rx="3" transform="rotate(20,322,170)"/>
  <ellipse cx="295" cy="133" rx="19" ry="6" fill="#0e2060"/>
  <rect x="280" y="127" width="30" height="12" fill="#0e2060" rx="2"/>
  <text x="295" y="140" text-anchor="middle" font-size="10" fill="#fff" font-family="serif" opacity=".7">正</text>
  <ellipse cx="30" cy="192" rx="8" ry="9" fill="#7a6854"/><rect x="24" y="200" width="12" height="30" fill="#7a6854" rx="2"/>
  <ellipse cx="370" cy="192" rx="8" ry="9" fill="#5a7860"/><rect x="364" y="200" width="12" height="30" fill="#5a7860" rx="2"/>
</svg>`;

export const SVG_GRAND_LINE = `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g-gl-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#060a18"/><stop offset="80%" stop-color="#1a1a3a"/><stop offset="100%" stop-color="#282840"/></linearGradient>
    <linearGradient id="g-gl-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0a1a38"/><stop offset="100%" stop-color="#06101e"/></linearGradient>
  </defs>
  <rect width="400" height="250" fill="url(#g-gl-sky)"/>
  <rect y="170" width="400" height="80" fill="url(#g-gl-sea)"/>
  <ellipse cx="60" cy="90" rx="70" ry="50" fill="#181828" opacity=".8"/>
  <ellipse cx="340" cy="70" rx="90" ry="60" fill="#141420" opacity=".7"/>
  <ellipse cx="200" cy="110" rx="120" ry="72" fill="#0e0e22" opacity=".9"/>
  <path d="M160,105 L165,55 L170,105Z" fill="#e8e0a0" opacity=".9"/>
  <rect x="159" y="55" width="3" height="4" fill="#e8d860"/>
  <path d="M155,95 L160,62 L164,95Z" fill="#c8a040" opacity=".6"/>
  <path d="M172,90 L169,66 L165,88" fill="#f0ead8" opacity=".5"/>
  <path d="M0,175 Q50,162 100,172 T200,168 T300,173 T400,165" fill="#0e2040" opacity=".8"/>
  <path d="M0,188 Q80,178 160,186 T320,180 T400,188" fill="#08182c" opacity=".7"/>
  <path d="M0,200 Q60,193 120,200 T240,196 T360,202 T400,198" fill="#040e20" opacity=".6"/>
  <line x1="270" y1="28" x2="290" y2="110" stroke="#e8e860" stroke-width="2.5" opacity=".75"/>
  <polygon points="268,26 272,48 278,26" fill="#e8e860" opacity=".75"/>
</svg>`;

export const SVG_ALLIANCE = `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="250" fill="#0c0c14"/>
  <defs><radialGradient id="g-all-lamp" cx="50%" cy="58%" r="45%"><stop offset="0%" stop-color="#382808"/><stop offset="100%" stop-color="#0c0c14" stop-opacity="0"/></radialGradient></defs>
  <rect width="400" height="250" fill="url(#g-all-lamp)"/>
  <rect x="185" y="30" width="4" height="130" fill="#4a3818" opacity=".8"/>
  <polygon points="183,28 191,28 187,18" fill="#4a3818"/>
  <ellipse cx="187" cy="138" rx="6" ry="8" fill="#f5c840" opacity=".9"/>
  <ellipse cx="187" cy="138" rx="14" ry="18" fill="#f5c840" opacity=".2"/>
  <ellipse cx="187" cy="138" rx="28" ry="36" fill="#c89020" opacity=".1"/>
  <ellipse cx="105" cy="145" rx="14" ry="17" fill="#120e08"/>
  <rect x="92" y="160" width="22" height="60" fill="#120e08" rx="3"/>
  <rect x="70" y="166" width="22" height="10" fill="#120e08" rx="3" transform="rotate(-18,70,166)"/>
  <ellipse cx="295" cy="145" rx="14" ry="17" fill="#08080e"/>
  <rect x="282" y="160" width="22" height="60" fill="#08080e" rx="3"/>
  <rect x="308" y="166" width="22" height="10" fill="#08080e" rx="3" transform="rotate(18,330,166)"/>
  <rect x="55" y="80" width="40" height="180" fill="#0e0c0a" opacity=".4" rx="2"/>
  <rect x="305" y="90" width="40" height="180" fill="#08080e" opacity=".4" rx="2"/>
</svg>`;

export const SVG_NOUVEAU_MONDE = `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g-nm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#040208"/><stop offset="100%" stop-color="#1a0808"/></linearGradient>
    <radialGradient id="g-nm-lava1" cx="30%" cy="100%" r="40%"><stop offset="0%" stop-color="#c03010" stop-opacity=".7"/><stop offset="100%" stop-color="#1a0808" stop-opacity="0"/></radialGradient>
    <radialGradient id="g-nm-lava2" cx="75%" cy="100%" r="35%"><stop offset="0%" stop-color="#e04010" stop-opacity=".6"/><stop offset="100%" stop-color="#1a0808" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="400" height="250" fill="url(#g-nm-sky)"/>
  <polygon points="0,250 80,100 160,250" fill="#0d0808"/>
  <polygon points="60,250 160,80 260,250" fill="#120a08"/>
  <polygon points="150,250 240,110 330,250" fill="#0e0a0a"/>
  <polygon points="240,250 320,130 400,250" fill="#100808"/>
  <polygon points="300,250 380,95 400,250 400,250" fill="#0d0808"/>
  <rect y="220" width="400" height="30" fill="#0c0808"/>
  <rect width="400" height="30" fill="url(#g-nm-lava1)" y="220"/>
  <rect width="400" height="30" fill="url(#g-nm-lava2)" y="220"/>
  <circle cx="38" cy="15" r="1" fill="#ff2010" opacity=".5"/>
  <circle cx="110" cy="22" r="1.5" fill="#ff1808" opacity=".4"/>
  <circle cx="200" cy="10" r="1" fill="#ff2010" opacity=".5"/>
  <circle cx="300" cy="18" r="1.5" fill="#ff1808" opacity=".4"/>
  <circle cx="370" cy="8" r="1" fill="#ff2010" opacity=".5"/>
</svg>`;

export const SVG_WANO = `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g-wano-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0a0610"/><stop offset="100%" stop-color="#1e0c28"/></linearGradient>
    <linearGradient id="g-wano-mt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#281828"/><stop offset="100%" stop-color="#1a0a18"/></linearGradient>
  </defs>
  <rect width="400" height="250" fill="url(#g-wano-sky)"/>
  <polygon points="50,250 150,60 250,250" fill="url(#g-wano-mt)"/>
  <polygon points="180,250 280,80 380,250" fill="#200c20"/>
  <polygon points="0,250 80,130 160,250" fill="#180a18" opacity=".9"/>
  <circle cx="310" cy="45" r="30" fill="#e8104a" opacity=".7"/>
  <circle cx="310" cy="45" r="22" fill="#c00838" opacity=".8"/>
  <circle cx="310" cy="45" r="12" fill="#e03060" opacity=".6"/>
  <line x1="310" y1="8" x2="310" y2="15" stroke="#e8104a" stroke-width="2" opacity=".6"/>
  <line x1="310" y1="75" x2="310" y2="82" stroke="#e8104a" stroke-width="2" opacity=".6"/>
  <line x1="273" y1="45" x2="280" y2="45" stroke="#e8104a" stroke-width="2" opacity=".6"/>
  <line x1="340" y1="45" x2="347" y2="45" stroke="#e8104a" stroke-width="2" opacity=".6"/>
  <path d="M20,200 Q100,180 180,195 T360,185" fill="none" stroke="#3a1a3a" stroke-width="2.5"/>
  <path d="M0,215 Q80,205 160,213 T320,208 T400,215" fill="none" stroke="#2a102a" stroke-width="2" opacity=".7"/>
</svg>`;

export const SVG_FINAL = `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g-fin-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0a0418"/><stop offset="50%" stop-color="#2a1230"/><stop offset="100%" stop-color="#1a0820"/></linearGradient>
    <radialGradient id="g-fin-star" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#f8e060" stop-opacity=".15"/><stop offset="100%" stop-color="#0a0418" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="400" height="250" fill="url(#g-fin-sky)"/>
  <rect width="400" height="250" fill="url(#g-fin-star)"/>
  <circle cx="200" cy="100" r="18" fill="#f8e060" opacity=".9"/>
  <circle cx="200" cy="100" r="30" fill="#f8d040" opacity=".2"/>
  <circle cx="200" cy="100" r="50" fill="#e8c030" opacity=".08"/>
  <circle cx="52" cy="22" r="1.5" fill="#fff" opacity=".8"/>
  <circle cx="118" cy="14" r="1.2" fill="#fff" opacity=".7"/>
  <circle cx="165" cy="30" r="1" fill="#fff" opacity=".65"/>
  <circle cx="248" cy="18" r="1.5" fill="#fff" opacity=".8"/>
  <circle cx="312" cy="28" r="1.2" fill="#fff" opacity=".7"/>
  <circle cx="370" cy="12" r="1" fill="#fff" opacity=".6"/>
  <circle cx="88" cy="52" r="1" fill="#fff" opacity=".5"/>
  <circle cx="340" cy="55" r="1" fill="#fff" opacity=".5"/>
  <path d="M200,118 L165,185" stroke="#f8e060" stroke-width="1.5" opacity=".25" stroke-dasharray="4,6"/>
  <path d="M200,118 L235,185" stroke="#f8e060" stroke-width="1.5" opacity=".25" stroke-dasharray="4,6"/>
  <ellipse cx="200" cy="195" rx="80" ry="22" fill="#1a0c28" opacity=".8"/>
  <ellipse cx="200" cy="200" rx="60" ry="18" fill="#120820"/>
  <polygon points="145,180 200,155 255,180 255,218 145,218" fill="#1a0c28"/>
  <rect y="170" width="400" height="80" fill="#0c0618" opacity=".5"/>
  <path d="M0,180 Q100,170 200,178 T400,172" fill="#0e0820" opacity=".8"/>
</svg>`;

export const SVG_FIN_ROI = `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g-roi-glow" cx="50%" cy="55%" r="55%"><stop offset="0%" stop-color="#c8901a" stop-opacity=".6"/><stop offset="100%" stop-color="#0c0608" stop-opacity="0"/></radialGradient>
    <linearGradient id="g-roi-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0c0608"/><stop offset="100%" stop-color="#1a1008"/></linearGradient>
  </defs>
  <rect width="400" height="250" fill="url(#g-roi-bg)"/>
  <rect width="400" height="250" fill="url(#g-roi-glow)"/>
  <rect x="140" y="150" width="120" height="70" fill="#8a6010" rx="6"/>
  <rect x="130" y="148" width="140" height="10" fill="#c8901a" rx="2"/>
  <rect x="145" y="155" width="30" height="50" fill="#c8a030" opacity=".3"/>
  <ellipse cx="200" cy="148" rx="25" ry="8" fill="#e0b840"/>
  <circle cx="200" cy="140" r="18" fill="#e0b840"/>
  <rect x="185" y="122" width="30" height="8" fill="#e0b840" rx="1"/>
  <polygon points="188,122 200,104 212,122" fill="#e0b840"/>
  <circle cx="200" cy="140" r="10" fill="#c89020"/>
  <path d="M130,80 Q200,60 270,80" fill="none" stroke="#c8901a" stroke-width="2" opacity=".5" stroke-dasharray="5,8"/>
  <circle cx="62" cy="22" r="2" fill="#f8e060" opacity=".7"/>
  <circle cx="142" cy="12" r="1.5" fill="#f8e060" opacity=".6"/>
  <circle cx="268" cy="18" r="1.5" fill="#f8e060" opacity=".7"/>
  <circle cx="348" cy="10" r="2" fill="#f8e060" opacity=".6"/>
  <text x="200" y="244" text-anchor="middle" font-size="11" fill="#c8a840" font-family="serif" opacity=".8" letter-spacing="4">ROI DES PIRATES</text>
</svg>`;

export const SVG_FIN_LEGENDE = `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g-leg-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#06081e"/><stop offset="100%" stop-color="#0e1430"/></linearGradient></defs>
  <rect width="400" height="250" fill="url(#g-leg-bg)"/>
  <circle cx="45" cy="18" r="2" fill="#fff" opacity=".9"/>
  <circle cx="112" cy="8" r="1.5" fill="#fff" opacity=".8"/>
  <circle cx="180" cy="24" r="2.5" fill="#fff" opacity=".95"/>
  <circle cx="245" cy="12" r="1.5" fill="#fff" opacity=".75"/>
  <circle cx="310" cy="22" r="2" fill="#fff" opacity=".85"/>
  <circle cx="372" cy="6" r="1.5" fill="#fff" opacity=".7"/>
  <circle cx="78" cy="40" r="1.5" fill="#fff" opacity=".65"/>
  <circle cx="340" cy="42" r="1.5" fill="#fff" opacity=".6"/>
  <circle cx="155" cy="48" r="1" fill="#fff" opacity=".55"/>
  <circle cx="265" cy="35" r="1" fill="#fff" opacity=".5"/>
  <rect x="115" y="65" width="170" height="140" fill="#e8d8a0" rx="4"/>
  <rect x="115" y="65" width="170" height="28" fill="#c8281a" rx="4"/>
  <rect x="115" y="93" width="170" height="4" fill="#c8281a"/>
  <text x="200" y="84" text-anchor="middle" font-size="13" fill="#fff" font-family="serif" font-weight="bold">WANTED</text>
  <text x="200" y="90" text-anchor="middle" font-size="8" fill="#ffd080" font-family="serif">DEAD OR ALIVE</text>
  <ellipse cx="200" cy="148" rx="48" ry="52" fill="#c8a878"/>
  <ellipse cx="200" cy="128" rx="20" ry="22" fill="#b89060"/>
  <ellipse cx="200" cy="126" rx="30" ry="8" fill="#c8a030"/>
  <rect x="138" y="190" width="124" height="5" fill="#a08840"/>
  <text x="200" y="218" text-anchor="middle" font-size="20" fill="#c83820" font-family="serif" font-weight="bold">∞ Berry</text>
</svg>`;

export const SVG_FIN_RETRAITE = `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g-ret-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e87040"/><stop offset="55%" stop-color="#f8a860"/><stop offset="100%" stop-color="#fcc880"/></linearGradient>
    <linearGradient id="g-ret-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e08040"/><stop offset="100%" stop-color="#c06028"/></linearGradient>
  </defs>
  <rect width="400" height="250" fill="url(#g-ret-sky)"/>
  <circle cx="200" cy="108" r="50" fill="#fce870" opacity=".85"/>
  <rect y="168" width="400" height="82" fill="url(#g-ret-sea)"/>
  <path d="M0,175 Q80,165 160,174 T320,168 T400,175" fill="#d87038" opacity=".6"/>
  <ellipse cx="200" cy="200" rx="120" ry="40" fill="#c87030" opacity=".5"/>
  <ellipse cx="200" cy="210" rx="85" ry="30" fill="#c06020"/>
  <rect x="175" y="120" width="8" height="88" fill="#5a3a10" rx="3"/>
  <path d="M183,120 Q162,102 138,108 Q162,122 183,120Z" fill="#2a6a18"/>
  <path d="M178,110 Q196,90 218,96 Q196,112 178,110Z" fill="#388a20"/>
  <path d="M174,130 Q150,118 128,126 Q152,138 174,130Z" fill="#2a6a18" opacity=".85"/>
  <circle cx="80" cy="188" r="8" fill="#e09040" opacity=".4"/>
  <circle cx="320" cy="182" r="6" fill="#e09040" opacity=".4"/>
  <path d="M30,190 Q50,185 70,190" fill="none" stroke="#e0a050" stroke-width="1.5" opacity=".5"/>
  <path d="M330,185 Q350,180 370,186" fill="none" stroke="#e0a050" stroke-width="1.5" opacity=".5"/>
</svg>`;

export const SVG_FIN_CAPTURE = `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g-cap-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#101828"/><stop offset="100%" stop-color="#181c28"/></linearGradient></defs>
  <rect width="400" height="250" fill="url(#g-cap-bg)"/>
  <rect x="40" y="0" width="14" height="250" fill="#0a1018" opacity=".95"/>
  <rect x="90" y="0" width="14" height="250" fill="#0a1018" opacity=".95"/>
  <rect x="140" y="0" width="14" height="250" fill="#0a1018" opacity=".95"/>
  <rect x="190" y="0" width="14" height="250" fill="#0a1018" opacity=".95"/>
  <rect x="240" y="0" width="14" height="250" fill="#0a1018" opacity=".95"/>
  <rect x="290" y="0" width="14" height="250" fill="#0a1018" opacity=".95"/>
  <rect x="340" y="0" width="14" height="250" fill="#0a1018" opacity=".95"/>
  <rect x="0" y="80" width="400" height="10" fill="#152030" opacity=".9"/>
  <rect x="0" y="160" width="400" height="10" fill="#152030" opacity=".9"/>
  <ellipse cx="200" cy="125" rx="18" ry="20" fill="#1e2030"/>
  <rect x="188" y="144" width="22" height="52" fill="#1e2030" rx="3"/>
  <rect x="170" y="150" width="18" height="9" fill="#1e2030" rx="3" transform="rotate(-15,170,150)"/>
  <rect x="212" y="150" width="18" height="9" fill="#1e2030" rx="3" transform="rotate(15,230,150)"/>
  <rect x="188" y="196" width="10" height="36" fill="#1e2030" rx="3"/>
  <rect x="202" y="196" width="10" height="36" fill="#1e2030" rx="3"/>
  <circle cx="180" cy="160" r="5" fill="#2a4060" opacity=".8"/>
  <circle cx="220" cy="160" r="5" fill="#2a4060" opacity=".8"/>
  <path d="M185,160 Q200,154 215,160" stroke="#2a4060" stroke-width="3" fill="none"/>
  <circle cx="188" cy="202" r="5" fill="#2a4060" opacity=".8"/>
  <circle cx="212" cy="202" r="5" fill="#2a4060" opacity=".8"/>
  <path d="M193,202 Q200,197 207,202" stroke="#2a4060" stroke-width="3" fill="none"/>
</svg>`;
