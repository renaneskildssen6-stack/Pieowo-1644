import { useId } from 'react';
import { ROUTES, SITE_IDS, SITES, type Site } from '@/game/vespera';

export function VesperaMap({ here, selected, surveyed, onSelect }: { here: Site; selected: Site; surveyed: Site[]; onSelect: (id: Site)=>void }) {
 const id=useId();
 return <div className="au-map" aria-label="Mapa de Véspera">
  <svg viewBox="0 0 760 420" aria-hidden="true" className="au-chart">
   <defs>
    <pattern id={`${id}-grid`} width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#8ae2c2" opacity=".13"/></pattern>
    <linearGradient id={`${id}-soil`} x2=".95" y2="1"><stop stopColor="#39635e"/><stop offset=".51" stopColor="#3b5f54"/><stop offset="1" stopColor="#633733"/></linearGradient>
    <radialGradient id={`${id}-heat`}><stop stopColor="#ed9a44" stopOpacity=".66"/><stop offset="1" stopColor="#b65a54" stopOpacity="0"/></radialGradient>
    <path id={`${id}-coast`} d="M0 255 48 247 73 208 111 203 169 163 180 97 227 56 293 52 354 81 415 52 462 35 517 48 549 86 623 97 684 144 735 152 760 139V322L694 328 650 364 584 378 469 374 375 392 326 366 253 381 165 360 106 316 51 324 0 306Z"/>
    <clipPath id={`${id}-land`}><use href={`#${id}-coast`}/></clipPath>
   </defs>
   <rect width="760" height="420" fill="#0c242b"/>
   <use href={`#${id}-coast`} fill={`url(#${id}-soil)`} stroke="#6dbe99" strokeWidth="2"/>
   <g clipPath={`url(#${id}-land)`}>
    <ellipse cx="535" cy="302" rx="148" ry="93" fill={`url(#${id}-heat)`}/>
    <path d="M0 284 74 288 149 143 216 82 276 65 338 94 413 82 478 49 521 75 562 111 640 113 689 160 760 163M0 297 81 300 151 185 201 112 243 94 283 91 329 109 395 113 460 67 499 76 561 125 635 129 685 175 760 180M94 301 156 211 208 152 243 127 292 122 339 153 411 136 458 83 493 91 565 141 627 147 687 190 760 194M108 312 182 226 223 182 273 149 292 146 342 174 414 164 468 124 513 124 572 156 613 167 659 201 718 214 760 205M119 320 184 253 226 215 272 175 297 181 345 205 423 180 473 149 519 151 581 173 613 188 669 213 711 225 760 220M135 332 190 287 265 232 300 214 348 224 404 214 462 181 521 170 570 190 610 215 667 231 709 246 760 232M143 347 191 321 266 269 333 255 400 245 451 216 506 197 559 200 622 237 686 256 714 265 760 252M145 358 207 339 263 301 336 282 392 276 452 242 509 217 566 224 626 258 689 270 716 281 760 267M191 366 245 344 291 313 351 308 411 291 458 276 489 244 536 236 571 252 639 286 707 297 760 287M222 370 286 345 365 333 448 313 485 280 511 257 535 255 561 275 606 292 671 310 760 301" fill="none" stroke="#b5eabd" opacity=".35"/>
    <path d="m497 294 14-18 25-7 23 24-11 33-27 9-23-11z m9 5 15-19 22 5 7 15-11 18-19 2z m11 2 11-9 10 10-9 9z" fill="none" stroke="#ffa664" strokeWidth="2"/>
    <path d="m186 164 38-15 10-25 11 13 36-31 18 6-27 31-13 31-28 13-12 39-11-18 1-22z" fill="#14374b" opacity=".85"/>
    <g fill="#a6edc5"><path d="m425 83 42-40-10 34z m63 42 36-43-6 33z m-7-55 26-19-4 24z" opacity=".48"/></g>
    <path d="m159 315 40-22 33 8 36-20 14 23-45 21-27 22-42-13z" fill="#172f31" opacity=".74"/>
   </g>
   <rect width="760" height="420" fill={`url(#${id}-grid)`}/>
   <g fill="#98c5b7" fontFamily="monospace" fontSize="15" letterSpacing="4"><text x="30" y="38">VÉSPERA / V-09</text><text x="528" y="399">PLANÍCIE TERMINAL</text></g>
   <g transform="translate(712 42)" fill="none" stroke="#a3ddc3"><circle r="16"/><path d="M-21 0H21M0-21V21M-4 7 0-9 4 7 0 4z"/></g>
   {ROUTES.map(([a,b])=><line key={`${a}-${b}`} x1={SITES[a].x} y1={SITES[a].y} x2={SITES[b].x} y2={SITES[b].y} stroke={a===here||b===here?'#d4ffe2':'#93cdb6'} opacity={(a===here||b===here) ? .9 : .45} strokeWidth="2" strokeDasharray="5 5"/>)}
  </svg>
  {SITE_IDS.map((site,i)=><button data-skin="none" key={site} type="button" className="au-pin" style={{left:`${SITES[site].x/7.6}%`,top:`${SITES[site].y/4.2}%`}} aria-label={`Mapa: ${SITES[site].name}${site===here?' (posição atual)':''}`} aria-pressed={selected===site} data-here={site===here} data-done={surveyed.includes(site)} onClick={()=>onSelect(site)}>{site===here?'◆':surveyed.includes(site)?'✓':i+1}</button>)}
 </div>;
}

export function VesperaOrbit() {
 const id=useId();
 return <svg className="au-orbit" viewBox="0 0 720 270" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
   <radialGradient id={`${id}-planet`} cx=".28" cy=".23" r=".71"><stop stopColor="#d8b57e"/><stop offset=".32" stopColor="#7d9d72"/><stop offset=".65" stopColor="#325957"/><stop offset="1" stopColor="#0b2029"/></radialGradient>
   <clipPath id={`${id}-disk`}><circle cx="490" cy="160" r="109"/></clipPath>
  </defs>
  <path d="M0 206H720M0 66H720M80 0V270M640 0V270" stroke="#63b796" opacity=".15"/>
  {Array.from({length:74},(_,i)=><circle key={i} cx={(i*137+13)%720} cy={(i*i*29+9)%270} r={i%8===0?1.5:.65} fill={i%7===0?'#ffc271':'#bfefdf'} opacity={.22+(i%5)*.13}/>)}
  <ellipse cx="490" cy="160" rx="209" ry="43" fill="none" stroke="#69b69c" strokeDasharray="4 7" transform="rotate(-17 490 160)" opacity=".54"/>
  <circle cx="490" cy="160" r="114" fill="#6fddb5" opacity=".16"/>
  <circle cx="490" cy="160" r="109" fill={`url(#${id}-planet)`} stroke="#91d8aa" strokeWidth="2"/>
  <g clipPath={`url(#${id}-disk)`} fill="none" stroke="#d2e0a2" strokeWidth="3" opacity=".30">
   <path d="M368 107q74 8 103 40t89 13 72 1 M369 111q69 15 100 42t83 16 80 0 M352 130q95 16 128 53t80 20 71 4 M352 143q84 16 122 52t80 20 81 0 M350 52q75 8 101 34t95 12 77 12 M352 44q83 12 107 32t97 13 72 9 M350 71q62 6 102 31t94 17 76 12"/>
  </g>
  <g fill="none" stroke="#ffc071" strokeWidth="1.8"><path d="M177 207 293 183 415 80" strokeDasharray="3 6"/><path d="M300 176 282 189 289 174 283 169z" fill="#ffc071"/></g>
 </svg>;
}
