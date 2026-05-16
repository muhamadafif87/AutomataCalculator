/**
 * MINIMIZER.JS - DFA Minimizer functionality
 */

let minData = { states: [], alpha: [], start: '', finals: [], trans: {} };

function buildMinTable() {
  const states = parseList(document.getElementById('min-states').value);
  const alpha = parseList(document.getElementById('min-alpha').value);
  minData.states = states;
  minData.alpha = alpha;
  minData.start = document.getElementById('min-start').value.trim();
  minData.finals = parseList(document.getElementById('min-final').value);

  const cont = document.getElementById('min-trans-container');
  let html = `<table class="trans-table"><thead><tr><th>State</th>`;
  alpha.forEach(a => { html += `<th>${a}</th>`; });
  html += `</tr></thead><tbody>`;
  states.forEach(s => {
    const isStart = s === minData.start, isFinal = minData.finals.includes(s);
    const lbl = (isStart ? '→ ' : '') + s + (isFinal ? ' *' : '');
    html += `<tr><td style="color:${isFinal ? 'var(--blue)' : 'var(--text-2)'}"><b>${lbl}</b></td>`;
    alpha.forEach(a => {
      const key = s + '|||' + a;
      html += `<td><input type="text" value="${minData.trans[key] || ''}" onchange="minData.trans['${key}']=this.value" style="width:55px"></td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  cont.innerHTML = html;
  document.getElementById('min-trans-card').style.display = 'block';
  setTimeout(() => drawAutomata('diagram3-container', minData.states, minData.alpha, minData.start, minData.finals, minData.trans), 100);
}

function readMinTransitions() {
  minData.states.forEach(s => {
    minData.alpha.forEach(a => {
      const el = document.querySelector(`#min-trans-container input[onchange*="${s}|||${a}"]`);
      if (el) minData.trans[s + '|||' + a] = el.value.trim();
    });
  });
}

function minimizeDFA() {
  readMinTransitions();
  const { states, alpha, start, finals, trans } = minData;
  const reachable = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const s = queue.shift();
    alpha.forEach(a => {
      const t = trans[s + '|||' + a];
      if (t && states.includes(t) && !reachable.has(t)) { reachable.add(t); queue.push(t); }
    });
  }
  const rStates = [...reachable];

  function getGroup(s, partition) { return partition.findIndex(g => g.includes(s)); }

  let partition = [
    rStates.filter(s => finals.includes(s)),
    rStates.filter(s => !finals.includes(s))
  ].filter(g => g.length > 0);

  let changed = true;
  while (changed) {
    changed = false;
    const newP = [];
    for (const group of partition) {
      if (group.length <= 1) { newP.push(group); continue; }
      const subgroups = [];
      for (const s of group) {
        const sig = alpha.map(a => getGroup(trans[s + '|||' + a] || null, partition));
        let placed = false;
        for (const sg of subgroups) {
          const repSig = alpha.map(a => getGroup(trans[sg[0] + '|||' + a] || null, partition));
          if (sig.every((v, i) => v === repSig[i])) { sg.push(s); placed = true; break; }
        }
        if (!placed) subgroups.push([s]);
      }
      if (subgroups.length > 1) changed = true;
      subgroups.forEach(sg => newP.push(sg));
    }
    partition = newP;
  }

  const minStates = partition.map((_, i) => 'M' + i);
  const minFinals = [];
  const minStart = minStates[partition.findIndex(g => g.includes(start))];
  const minTrans = {};
  partition.forEach((g, i) => {
    if (g.some(s => finals.includes(s))) minFinals.push(minStates[i]);
    const rep = g[0];
    alpha.forEach(a => {
      const dest = trans[rep + '|||' + a];
      if (dest) {
        const dg = partition.findIndex(dg => dg.includes(dest));
        if (dg >= 0) minTrans[minStates[i] + '|||' + a] = minStates[dg];
      }
    });
  });

  const reduced = states.length - minStates.length;
  document.getElementById('min-result').innerHTML = `<div class="result-box ${reduced > 0 ? 'r-accept' : 'r-info'}">
    ${reduced > 0 ? `✓ ${states.length} states → ${minStates.length} states (dikurangi ${reduced})` : `ℹ DFA sudah minimal (${minStates.length} states)`}<br>
    <small>${partition.map((g, i) => '{' + g.join(',') + '}→' + minStates[i]).join(' · ')}</small>
  </div>`;
  drawAutomata('diagram4-container', minStates, alpha, minStart, minFinals, minTrans);
}
