/**
 * DFA.JS - DFA Tester functionality
 */

let dfaData = { states: [], alpha: [], start: '', finals: [], trans: {} };

function buildDFATable() {
  const states = parseList(document.getElementById('dfa-states').value);
  const alpha = parseList(document.getElementById('dfa-alpha').value);
  dfaData.states = states;
  dfaData.alpha = alpha;
  dfaData.start = document.getElementById('dfa-start').value.trim();
  dfaData.finals = parseList(document.getElementById('dfa-final').value);

  const cont = document.getElementById('dfa-trans-container');
  let html = `<table class="trans-table"><thead><tr><th>State</th>`;
  alpha.forEach(a => { html += `<th>${a}</th>`; });
  html += `</tr></thead><tbody>`;
  states.forEach(s => {
    const isStart = s === dfaData.start, isFinal = dfaData.finals.includes(s);
    let lbl = (isStart ? '→ ' : '') + s + (isFinal ? ' *' : '');
    html += `<tr><td style="color:${isFinal ? 'var(--blue)' : 'var(--text-2)'}"><b>${lbl}</b></td>`;
    alpha.forEach(a => {
      const key = s + '|||' + a;
      const val = dfaData.trans[key] || '';
      html += `<td><input type="text" value="${val}" list="dfa-states-dl" onchange="dfaData.trans['${key}']=this.value" style="width:55px"></td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  html += `<datalist id="dfa-states-dl">${states.map(s => `<option value="${s}">`).join('')}</datalist>`;
  cont.innerHTML = html;
  document.getElementById('dfa-trans-card').style.display = 'block';
  renderDFAdiagram();
}

function readDFATransitions() {
  dfaData.states.forEach(s => {
    dfaData.alpha.forEach(a => {
      const el = document.querySelector(`#dfa-trans-container input[onchange*="${s}|||${a}"]`);
      if (el) dfaData.trans[s + '|||' + a] = el.value.trim();
    });
  });
}

function renderDFAdiagram(activeState = null, highlightEdge = null) {
  readDFATransitions();
  drawAutomata('diagram-container', dfaData.states, dfaData.alpha, dfaData.start, dfaData.finals, dfaData.trans, activeState, highlightEdge);
}

function testDFA() {
  readDFATransitions();
  const raw = document.getElementById('dfa-input-str').value.trim();
  let input = raw.includes(' ') ? raw.split(/\s+/).filter(Boolean) : raw.split('');

  let current = dfaData.start;
  let trace = [];
  let ok = true;
  trace.push({ state: current, info: 'Start: ' + current, type: 'info' });

  for (let i = 0; i < input.length; i++) {
    const sym = input[i];
    if (!dfaData.alpha.includes(sym)) {
      ok = false;
      trace.push({ state: null, info: `'${sym}' tidak ada di alphabet`, type: 'fail' });
      break;
    }
    const next = dfaData.trans[current + '|||' + sym];
    if (!next || !dfaData.states.includes(next)) {
      ok = false;
      trace.push({ state: '∅', info: `δ(${current}, ${sym}) = ∅ — tidak ada transisi`, type: 'fail' });
      break;
    }
    trace.push({ state: next, info: `δ(${current}, ${sym}) = ${next}`, type: 'ok' });
    current = next;
  }

  const accepted = ok && dfaData.finals.includes(current);
  document.getElementById('dfa-result').innerHTML = `<div class="result-box ${accepted ? 'r-accept' : 'r-reject'}">
    ${accepted ? '✓ ACCEPTED' : '✗ REJECTED'} — "${raw || 'ε'}"<br>
    <small>State akhir: ${current} ${accepted ? '(final state)' : '(bukan final state)'}</small>
  </div>`;

  let thtml = '<div class="step-trace">';
  trace.forEach(t => {
    thtml += `<div class="step step-${t.type}">${t.info}</div>`;
  });
  thtml += `<div class="step step-${accepted ? 'ok' : 'fail'}">${accepted ? '✓ DITERIMA' : '✗ DITOLAK'}</div>`;
  thtml += '</div>';
  document.getElementById('dfa-trace').innerHTML = thtml;
  renderDFAdiagram(current);
}
