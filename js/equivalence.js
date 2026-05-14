/**
 * EQUIVALENCE.JS - DFA Equivalence checker
 */

let eqData = [
  { states: [], alpha: [], start: '', finals: [], trans: {} },
  { states: [], alpha: [], start: '', finals: [], trans: {} }
];

function buildEquivTable(idx) {
  const i = idx - 1;
  const states = parseList(document.getElementById(`eq${idx}-states`).value);
  const alpha = parseList(document.getElementById(`eq${idx}-alpha`).value);
  eqData[i] = { states, alpha, start: document.getElementById(`eq${idx}-start`).value.trim(), finals: parseList(document.getElementById(`eq${idx}-final`).value), trans: {} };

  const cont = document.getElementById(`eq${idx}-trans-container`);
  let html = `<table class="trans-table"><thead><tr><th>State</th>`;
  alpha.forEach(a => { html += `<th>${a}</th>`; });
  html += `</tr></thead><tbody>`;
  states.forEach(s => {
    const isFinal = eqData[i].finals.includes(s), isStart = s === eqData[i].start;
    html += `<tr><td style="color:${isFinal ? 'var(--blue)' : 'var(--text-2)'}">${isStart ? '→ ' : ''}${s}${isFinal ? ' *' : ''}</td>`;
    alpha.forEach(a => {
      const key = s + '|||' + a;
      html += `<td><input type="text" value="" onchange="eqData[${i}].trans['${key}']=this.value" style="width:50px"></td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  cont.innerHTML = html;
}

function readEqTrans(i) {
  eqData[i].states.forEach(s => {
    eqData[i].alpha.forEach(a => {
      const el = document.querySelector(`#eq${i + 1}-trans-container input[onchange*="${s}|||${a}"]`);
      if (el) eqData[i].trans[s + '|||' + a] = el.value.trim();
    });
  });
}

function checkEquivalence() {
  readEqTrans(0);
  readEqTrans(1);
  const d1 = eqData[0], d2 = eqData[1];
  if (!d1.states.length || !d2.states.length) { alert('Build tabel kedua DFA dulu!'); return; }

  const a1 = new Set(d1.alpha), a2 = new Set(d2.alpha);
  if (![...a1].every(a => a2.has(a)) || ![...a2].every(a => a1.has(a))) {
    document.getElementById('equiv-result').innerHTML = `<div class="result-box r-reject">✗ Alphabet berbeda</div>`;
    document.getElementById('equiv-result-card').style.display = 'block';
    return;
  }

  const alpha = d1.alpha;
  const visited = new Set();
  const queue = [[d1.start, d2.start]];
  const path = new Map();
  path.set(d1.start + ',' + d2.start, '');
  let inequiv = false, counterEx = null;

  while (queue.length && !inequiv) {
    const [s1, s2] = queue.shift();
    const key = s1 + ',' + s2;
    if (visited.has(key)) continue;
    visited.add(key);
    const f1 = d1.finals.includes(s1), f2 = d2.finals.includes(s2);
    if (f1 !== f2) { inequiv = true; counterEx = path.get(key) || 'ε'; break; }
    for (const a of alpha) {
      const n1 = d1.trans[s1 + '|||' + a] || '∅', n2 = d2.trans[s2 + '|||' + a] || '∅';
      const nk = n1 + ',' + n2;
      if (!visited.has(nk)) { queue.push([n1, n2]); path.set(nk, (path.get(key) || '') + a); }
    }
  }

  document.getElementById('equiv-result-card').style.display = 'block';
  document.getElementById('equiv-result').innerHTML = inequiv
    ? `<div class="equiv-big" style="color:var(--red)">≢</div><div class="result-box r-reject">✗ Tidak ekuivalen — counterexample: "${counterEx}"</div>`
    : `<div class="equiv-big" style="color:var(--green)">≡</div><div class="result-box r-accept">✓ DFA 1 dan DFA 2 EKUIVALEN</div>`;

  drawAutomata('diagram5a-container', d1.states, d1.alpha, d1.start, d1.finals, d1.trans);
  drawAutomata('diagram5b-container', d2.states, d2.alpha, d2.start, d2.finals, d2.trans);
}
