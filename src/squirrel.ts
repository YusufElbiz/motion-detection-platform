// Original layered vector character; each instance owns its gradient IDs.
export function squirrelArt(id:string){
 return `<svg class="squirrel" viewBox="0 0 160 160" aria-hidden="true">
 <defs><linearGradient id="${id}-fur" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#efb371"/><stop offset=".55" stop-color="#ce8548"/><stop offset="1" stop-color="#af693b"/></linearGradient><linearGradient id="${id}-tail" x2=".8" y2="1"><stop stop-color="#f0b679"/><stop offset="1" stop-color="#b86f41"/></linearGradient><radialGradient id="${id}-cream"><stop stop-color="#fff8df"/><stop offset="1" stop-color="#f2d4a7"/></radialGradient></defs>
 <ellipse class="squirrel-shadow" cx="82" cy="149" rx="40" ry="5" fill="#71483122"/>
 <g class="squirrel-body">
 <g class="squirrel-tail"><path d="M108 132c38 1 51-27 43-49-3-10-12-14-20-21-12-11-8-24 1-28-17-4-36 9-34 29 2 17 20 21 20 35 0 9-8 13-15 15Z" fill="url(#${id}-tail)" stroke="#9e613b" stroke-width="2.2"/><path d="M126 46c-8 15 0 22 12 32 24 20 9 43-16 45" fill="none" stroke="#ffd3a0" stroke-width="9" stroke-linecap="round" opacity=".7"/><path d="M137 83q14 14 2 29" fill="none" stroke="#fff0ca" stroke-width="3" stroke-linecap="round" opacity=".65"/></g>
 <ellipse class="squirrel-foot squirrel-foot-left" cx="59" cy="141" rx="16" ry="7" fill="#b67743" stroke="#965c39" stroke-width="2"/><ellipse class="squirrel-foot squirrel-foot-right" cx="94" cy="141" rx="16" ry="7" fill="#b67743" stroke="#965c39" stroke-width="2"/>
 <ellipse cx="77" cy="117" rx="29" ry="29" fill="url(#${id}-fur)" stroke="#a6683e" stroke-width="2"/><ellipse cx="77" cy="121" rx="20" ry="22" fill="url(#${id}-cream)"/>
 <g class="squirrel-arm-left"><path d="M52 107q-12 0-14 12-1 12 9 11l12-14" fill="#d99b5e" stroke="#a6683e" stroke-width="2" stroke-linecap="round"/><path d="m40 123 5 2m-4-6 5 2" stroke="#b97d4d" stroke-width="1.4" stroke-linecap="round"/></g>
 <g class="squirrel-wave"><path d="M100 107q11-1 16 10 5 11-3 13-8 1-15-13" fill="#dfa468" stroke="#a6683e" stroke-width="2"/><path d="m110 121 5-2m-4 6 5-2" stroke="#b97d4d" stroke-width="1.5" stroke-linecap="round"/></g>
 <g class="squirrel-head">
 <g class="squirrel-ears"><path d="M44 55Q30 26 41 16q17-6 27 28M87 41q11-28 24-23 11 12-1 36" fill="url(#${id}-fur)" stroke="#a6683e" stroke-width="2.2"/><path d="M48 46q-9-18-6-21 10 0 17 20m36-2q8-16 13-17 3 10-5 23" fill="#f1bd9f"/></g>
 <path d="M37 72q0-29 25-33l7-9 5 9 8-10 3 10q30 1 32 30l7 10-8 2q-3 29-40 30-37-1-41-28l-7-4Z" fill="url(#${id}-fur)" stroke="#a6683e" stroke-width="2.2" stroke-linejoin="round"/>
 <path d="M40 79q2-17 17-20 12-2 20 10 9-12 21-9 15 3 17 20-1 27-38 28-34-1-37-29" fill="url(#${id}-cream)"/>
 <g class="squirrel-eyes"><ellipse cx="61" cy="76" rx="9" ry="11" fill="#fffdf7"/><ellipse cx="94" cy="76" rx="9" ry="11" fill="#fffdf7"/><g class="squirrel-pupils"><ellipse cx="62" cy="77" rx="5.6" ry="7" fill="#3f3027"/><ellipse cx="93" cy="77" rx="5.6" ry="7" fill="#3f3027"/><circle cx="60" cy="74" r="2.1" fill="white"/><circle cx="91" cy="74" r="2.1" fill="white"/><circle cx="64" cy="80" r=".8" fill="#f9e3b6"/><circle cx="95" cy="80" r=".8" fill="#f9e3b6"/></g></g>
 <g class="squirrel-happy-eyes" fill="none" stroke="#674631" stroke-width="3.2" stroke-linecap="round"><path d="M54 77q8-10 15 0m18 0q8-10 15 0"/></g>
 <path d="M53 61q8-5 15 0m18 0q8-5 15 0" fill="none" stroke="#aa683e" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="48" cy="89" rx="7" ry="4" fill="#edab8d" opacity=".8"/><ellipse cx="107" cy="89" rx="7" ry="4" fill="#edab8d" opacity=".8"/>
 <path d="M72 86q6-4 12 0-1 7-6 7t-6-7" fill="#714a36"/><ellipse cx="76" cy="86" rx="2" ry="1" fill="#b38b6a"/>
 <g class="squirrel-mouth"><path d="M69 96q9 11 18 0" fill="#a46149" stroke="#955c42" stroke-width="1.5" stroke-linecap="round"/><path d="M74 98h8v5q-4 2-8 0Z" fill="#fffdf0"/></g>
 </g>
 <path d="m57 104 20 6 21-6-6 12-15-3-14 4Z" fill="#83aa79" stroke="#5c8d63" stroke-width="1.5"/><path d="m78 113 8 10 5-10" fill="#91ba83"/>
 </g></svg>`;
}
