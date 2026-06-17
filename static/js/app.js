/**
 * Logika antarmuka UI dan integrasi API Flask
 */

// Status global automata
let dfaData = { states: [], alpha: [], start: "", finals: [], trans: {} };
let nfaData = { states: [], alpha: [], start: "", finals: [], trans: {} };
let nfaLayoutTree = null;
let minData = { states: [], alpha: [], start: "", finals: [], trans: {} };
let eqData = [
  { states: [], alpha: [], start: "", finals: [], trans: {} },
  { states: [], alpha: [], start: "", finals: [], trans: {} }
];

// Pengubah input teks ke array
function parseList(str) {
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Berpindah tab aktif
function switchTab(name, el) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  document.getElementById("tab-" + name).classList.add("active");
  el.classList.add("active");
  
  // Sesuaikan ukuran grafik saat tab aktif
  setTimeout(() => {
    Object.keys(automataGraphs).forEach((key) => {
      if (automataGraphs[key]) {
        automataGraphs[key].resize();
        fitGraph(key);
      }
    });
  }, 100);
}

// DFA

function buildDFATable() {
  const states = parseList(document.getElementById("dfa-states").value);
  const alpha = parseList(document.getElementById("dfa-alpha").value);
  dfaData.states = states;
  dfaData.alpha = alpha;
  dfaData.start = document.getElementById("dfa-start").value.trim();
  dfaData.finals = parseList(document.getElementById("dfa-final").value);

  const container = document.getElementById("dfa-trans-container");
  if (!states.length || !alpha.length) {
    container.innerHTML = `<p style="color:var(--rose)">States & Alphabet tidak boleh kosong.</p>`;
    return;
  }

  let html = `<table class="trans-table">
    <thead>
      <tr>
        <th>State</th>`;
  alpha.forEach((a) => {
    html += `<th>Input ${a}</th>`;
  });
  html += `</tr>
    </thead>
    <tbody>`;

  states.forEach((s) => {
    const isStart = s === dfaData.start;
    const isFinal = dfaData.finals.includes(s);
    let lbl = (isStart ? "→ " : "") + s + (isFinal ? " ◎" : "");
    
    html += `<tr>
      <td style="color:${isFinal ? "var(--indigo)" : "var(--text-primary)"}; font-weight:bold">${lbl}</td>`;
    
    alpha.forEach((a) => {
      const key = `${s}|||${a}`;
      const val = dfaData.trans[key] || "";
      html += `<td>
        <input type="text" 
               value="${val}" 
               list="dfa-states-dl" 
               onchange="dfaData.trans['${key}']=this.value.trim()"
               placeholder="state">
      </td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  html += `<datalist id="dfa-states-dl">${states.map((s) => `<option value="${s}">`).join("")}</datalist>`;
  
  container.innerHTML = html;
  document.getElementById("dfa-trans-card").style.display = "block";
  
  // Gambar diagram awal
  setTimeout(() => renderDFAdiagram(), 50);
}

function readDFATransitions() {
  dfaData.states.forEach((s) => {
    dfaData.alpha.forEach((a) => {
      const el = document.querySelector(
        `#dfa-trans-container input[onchange*="${s}|||${a}"]`
      );
      if (el) dfaData.trans[`${s}|||${a}`] = el.value.trim();
    });
  });
}

function renderDFAdiagram(activeState = null, highlightEdge = null) {
  readDFATransitions();
  drawAutomata(
    "diagram-container",
    dfaData.states,
    dfaData.alpha,
    dfaData.start,
    dfaData.finals,
    dfaData.trans,
    activeState,
    highlightEdge
  );
}

async function testDFA() {
  readDFATransitions();
  const inputStr = document.getElementById("dfa-input-str").value.trim();
  
  const resultDiv = document.getElementById("dfa-result");
  const traceDiv = document.getElementById("dfa-trace");
  const traceCard = document.getElementById("dfa-trace-card");

  try {
    const response = await fetch("/api/dfa/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        states: dfaData.states,
        alpha: dfaData.alpha,
        start: dfaData.start,
        finals: dfaData.finals,
        trans: dfaData.trans,
        input_str: inputStr
      })
    });

    const data = await response.json();
    if (!data.success) {
      resultDiv.innerHTML = `<div class="result-box r-warn">⚠ Error: ${data.message}</div>`;
      traceCard.style.display = "none";
      return;
    }

    const accepted = data.accepted;
    resultDiv.innerHTML = `<div class="result-box ${accepted ? "r-accept" : "r-reject"}">
      <div style="font-weight:bold; font-size:14px; margin-bottom:4px;">
        ${accepted ? "✓ ACCEPTED (DITERIMA)" : "✗ REJECTED (DITOLAK)"} — "${inputStr || "ε"}"
      </div>
      <div style="font-size:11px; opacity:0.85">State Akhir: <span style="font-weight:600">${data.final_state}</span> ${accepted ? "(Final State)" : "(Bukan Final State)"}</div>
    </div>`;

    // Tampilkan langkah transisi dan efek hover
    let traceHtml = `<div class="step-trace">`;
    data.trace.forEach((step, idx) => {
      let hoverAttrs = "";
      if (idx > 0 && data.trace[idx - 1].state && step.state && step.state !== "∅") {
        const from = data.trace[idx - 1].state;
        const to = step.state;
        const matches = step.info.match(/δ\(([^,]+),\s*([^)]+)\)\s*=\s*(.+)/);
        if (matches && matches[2]) {
          const sym = matches[2].trim();
          hoverAttrs = `onmouseover="highlightDFATraceStep('${from}', '${to}', '${sym}')" onmouseout="highlightDFATraceStep('${data.final_state}', null, null)"`;
        }
      }
      
      traceHtml += `<div class="step step-${step.type}" ${hoverAttrs}>
        <span class="step-num">${String(idx).padStart(2, "0")}</span>
        <span class="step-desc">${step.info}</span>
      </div>`;
    });
    traceHtml += `</div>`;
    
    traceDiv.innerHTML = traceHtml;
    traceCard.style.display = "block";

    // Tandai state aktif terakhir pada diagram
    drawAutomata(
      "diagram-container",
      dfaData.states,
      dfaData.alpha,
      dfaData.start,
      dfaData.finals,
      dfaData.trans,
      data.final_state
    );

  } catch (err) {
    resultDiv.innerHTML = `<div class="result-box r-reject">✗ Gagal menghubungi server: ${err.message}</div>`;
    traceCard.style.display = "none";
  }
}

function highlightDFATraceStep(activeState, toState = null, symbol = null) {
  const highlightEdge = toState && symbol ? { from: activeState, to: toState, symbol: symbol } : null;
  const stateToHighlight = toState || activeState;
  
  drawAutomata(
    "diagram-container",
    dfaData.states,
    dfaData.alpha,
    dfaData.start,
    dfaData.finals,
    dfaData.trans,
    stateToHighlight,
    highlightEdge
  );
}

function clearDFATest() {
  document.getElementById("dfa-input-str").value = "";
  document.getElementById("dfa-result").innerHTML = "";
  document.getElementById("dfa-trace").innerHTML = "";
  document.getElementById("dfa-trace-card").style.display = "none";
  renderDFAdiagram();
}

// REGEX KE NFA

async function buildNFAFromRegex() {
  const regex = document.getElementById("regex-input").value.trim();
  const resultDiv = document.getElementById("regex-result");
  const infoCard = document.getElementById("nfa-info-card");
  const infoDiv = document.getElementById("nfa-info");
  const transTableDiv = document.getElementById("nfa-trans-table");

  if (!regex) {
    resultDiv.innerHTML = `<div class="result-box r-warn">⚠ Masukkan regex pattern terlebih dahulu</div>`;
    return;
  }

  try {
    const response = await fetch("/api/regex/to-nfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regex: regex })
    });

    const data = await response.json();
    if (!data.success) {
      resultDiv.innerHTML = `<div class="result-box r-reject">✗ Error: ${data.message}</div>`;
      infoCard.style.display = "none";
      transTableDiv.innerHTML = `<div class="table-placeholder">NFA gagal dibuat.</div>`;
      return;
    }

    nfaData = data.nfa;
    nfaLayoutTree = data.nfa.layoutTree;

    resultDiv.innerHTML = `<div class="result-box r-accept">✓ NFA Berhasil Dibangun: ${nfaData.states.length} states</div>`;
    
    // Metadata NFA
    infoDiv.innerHTML = `
      <p><b>Jumlah State:</b> ${nfaData.states.length} (${nfaData.states.join(", ")})</p>
      <p><b>State Awal:</b> <span style="color:var(--emerald); font-weight:bold">${nfaData.start}</span></p>
      <p><b>State Akhir (Final):</b> <span style="color:var(--indigo); font-weight:bold">${nfaData.finals.join(", ")}</span></p>
      <p><b>Alphabet (Σ):</b> { ${nfaData.alpha.join(", ")} }</p>
    `;
    infoCard.style.display = "block";

    // Gambar diagram NFA
    drawAutomata(
      "diagram2-container",
      nfaData.states,
      nfaData.alpha,
      nfaData.start,
      nfaData.finals,
      nfaData.trans
    );

    // Buat tabel transisi NFA
    buildNFATransTable(nfaData);

  } catch (err) {
    resultDiv.innerHTML = `<div class="result-box r-reject">✗ Gagal menghubungi server: ${err.message}</div>`;
  }
}

function buildNFATransTable(nfa) {
  const syms = [...nfa.alpha, "ε"];
  const container = document.getElementById("nfa-trans-table");
  
  let html = `<table class="trans-table">
    <thead>
      <tr>
        <th>State</th>`;
  syms.forEach((sym) => {
    html += `<th>${sym}</th>`;
  });
  html += `</tr>
    </thead>
    <tbody>`;

  nfa.states.forEach((s) => {
    const isStart = s === nfa.start;
    const isFinal = nfa.finals.includes(s);
    let lbl = (isStart ? "→ " : "") + s + (isFinal ? " ◎" : "");
    
    html += `<tr>
      <td style="color:${isFinal ? "var(--indigo)" : isStart ? "var(--emerald)" : "var(--text-primary)"}; font-weight:bold">${lbl}</td>`;
      
    syms.forEach((sym) => {
      const targets = nfa.trans[`${s}|||${sym}`];
      let val = "∅";
      if (targets && targets.length > 0) {
        val = `{ ${targets.join(", ")} }`;
      }
      html += `<td style="color:var(--text-secondary)">${val}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

async function testNFA() {
  if (!nfaData.states || nfaData.states.length === 0) {
    document.getElementById("nfa-result").innerHTML = 
      `<div class="result-box r-warn">⚠ Build ε-NFA terlebih dahulu dengan tombol "Konversi ke ε-NFA"</div>`;
    return;
  }

  const inputStr = document.getElementById("nfa-input-str").value.trim();
  const resultDiv = document.getElementById("nfa-result");

  try {
    const response = await fetch("/api/nfa/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        states: nfaData.states,
        alpha: nfaData.alpha,
        start: nfaData.start,
        finals: nfaData.finals,
        trans: nfaData.trans,
        input_str: inputStr
      })
    });

    const data = await response.json();
    if (!data.success) {
      resultDiv.innerHTML = `<div class="result-box r-warn">⚠ Error: ${data.message}</div>`;
      return;
    }

    const accepted = data.accepted;
    resultDiv.innerHTML = `<div class="result-box ${accepted ? "r-accept" : "r-reject"}">
      <div style="font-weight:bold; font-size:14px; margin-bottom:4px;">
        ${accepted ? "✓ ACCEPTED" : "✗ REJECTED"} — "${inputStr || "ε"}"
      </div>
      <div style="font-size:11px; opacity:0.85">Himpunan State Akhir: { ${data.final_set.join(", ")} }</div>
    </div>`;

    // Tandai set state aktif terakhir pada diagram
    drawAutomata(
      "diagram2-container",
      nfaData.states,
      nfaData.alpha,
      nfaData.start,
      nfaData.finals,
      nfaData.trans,
      data.final_set
    );

  } catch (err) {
    resultDiv.innerHTML = `<div class="result-box r-reject">✗ Gagal menghubungi server: ${err.message}</div>`;
  }
}

// MINIMISASI DFA

function buildMinTable() {
  const states = parseList(document.getElementById("min-states").value);
  const alpha = parseList(document.getElementById("min-alpha").value);
  minData.states = states;
  minData.alpha = alpha;
  minData.start = document.getElementById("min-start").value.trim();
  minData.finals = parseList(document.getElementById("min-final").value);

  const container = document.getElementById("min-trans-container");
  if (!states.length || !alpha.length) {
    container.innerHTML = `<p style="color:var(--rose)">States & Alphabet tidak boleh kosong.</p>`;
    return;
  }

  let html = `<table class="trans-table">
    <thead>
      <tr>
        <th>State</th>`;
  alpha.forEach((a) => {
    html += `<th>Input ${a}</th>`;
  });
  html += `</tr>
    </thead>
    <tbody>`;

  states.forEach((s) => {
    const isStart = s === minData.start;
    const isFinal = minData.finals.includes(s);
    let lbl = (isStart ? "→ " : "") + s + (isFinal ? " ◎" : "");
    
    html += `<tr>
      <td style="color:${isFinal ? "var(--indigo)" : "var(--text-primary)"}; font-weight:bold">${lbl}</td>`;
    
    alpha.forEach((a) => {
      const key = `${s}|||${a}`;
      const val = minData.trans[key] || "";
      html += `<td>
        <input type="text" 
               value="${val}" 
               onchange="minData.trans['${key}']=this.value.trim()"
               placeholder="state">
      </td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
  
  document.getElementById("min-trans-card").style.display = "block";
  
  // Gambar DFA awal
  setTimeout(() => {
    drawAutomata(
      "diagram3-container",
      minData.states,
      minData.alpha,
      minData.start,
      minData.finals,
      minData.trans
    );
  }, 50);
}

function readMinTransitions() {
  minData.states.forEach((s) => {
    minData.alpha.forEach((a) => {
      const el = document.querySelector(
        `#min-trans-container input[onchange*="${s}|||${a}"]`
      );
      if (el) minData.trans[`${s}|||${a}`] = el.value.trim();
    });
  });
}

async function minimizeDFA() {
  readMinTransitions();
  const resultDiv = document.getElementById("min-result");

  try {
    const response = await fetch("/api/dfa/minimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(minData)
    });

    const data = await response.json();
    if (!data.success) {
      resultDiv.innerHTML = `<div class="result-box r-reject">✗ Error: ${data.message}</div>`;
      return;
    }

    const m = data.minimized;
    const reduced = m.reduced_count;
    
    let mappingHtml = m.mapping.map((map) => {
      return `<code>{${map.group.join(",")}}</code> → <b>${map.name}</b>`;
    }).join(" &nbsp;·&nbsp; ");

    resultDiv.innerHTML = `<div class="result-box ${reduced > 0 ? "r-accept" : "r-info"}">
      <div style="font-weight:bold; font-size:14px; margin-bottom:4px;">
        ${reduced > 0 ? `✓ DFA Berhasil Diminimalkan (${minData.states.length} states → ${m.states.length} states)` : `ℹ DFA Sudah Minimal (${m.states.length} states)`}
      </div>
      <div style="font-size:11px; opacity:0.9">${mappingHtml}</div>
    </div>`;

    // Perbarui gambar DFA awal
    drawAutomata(
      "diagram3-container",
      minData.states,
      minData.alpha,
      minData.start,
      minData.finals,
      minData.trans
    );

    // Gambar DFA hasil minimisasi
    drawAutomata(
      "diagram4-container",
      m.states,
      m.alpha,
      m.start,
      m.finals,
      m.trans
    );

  } catch (err) {
    resultDiv.innerHTML = `<div class="result-box r-reject">✗ Gagal menghubungi server: ${err.message}</div>`;
  }
}

// EKUIVALENSI DFA

function buildEquivTable(idx) {
  const i = idx - 1;
  const states = parseList(document.getElementById(`eq${idx}-states`).value);
  const alpha = parseList(document.getElementById(`eq${idx}-alpha`).value);
  
  eqData[i] = {
    states: states,
    alpha: alpha,
    start: document.getElementById(`eq${idx}-start`).value.trim(),
    finals: parseList(document.getElementById(`eq${idx}-final`).value),
    trans: {}
  };

  const container = document.getElementById(`eq${idx}-trans-container`);
  if (!states.length || !alpha.length) {
    container.innerHTML = `<p style="color:var(--rose)">States & Alphabet tidak boleh kosong.</p>`;
    return;
  }

  let html = `<table class="trans-table">
    <thead>
      <tr>
        <th>State</th>`;
  alpha.forEach((a) => {
    html += `<th>${a}</th>`;
  });
  html += `</tr>
    </thead>
    <tbody>`;

  states.forEach((s) => {
    const isStart = s === eqData[i].start;
    const isFinal = eqData[i].finals.includes(s);
    let lbl = (isStart ? "→ " : "") + s + (isFinal ? " ◎" : "");
    
    html += `<tr>
      <td style="color:${isFinal ? "var(--indigo)" : "var(--text-primary)"}; font-weight:bold">${lbl}</td>`;
    
    alpha.forEach((a) => {
      const key = `${s}|||${a}`;
      html += `<td>
        <input type="text" 
               value="" 
               onchange="eqData[${i}].trans['${key}']=this.value.trim()"
               style="width:50px">
      </td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

function readEqTrans(i) {
  const idx = i + 1;
  eqData[i].states.forEach((s) => {
    eqData[i].alpha.forEach((a) => {
      const el = document.querySelector(
        `#eq${idx}-trans-container input[onchange*="eqData[${i}].trans['${s}|||${a}']"]`
      );
      if (el) eqData[i].trans[`${s}|||${a}`] = el.value.trim();
    });
  });
}

async function checkEquivalence() {
  readEqTrans(0);
  readEqTrans(1);

  const d1 = eqData[0];
  const d2 = eqData[1];
  const resultCard = document.getElementById("equiv-result-card");
  const resultDiv = document.getElementById("equiv-result");

  if (!d1.states.length || !d2.states.length) {
    alert("Silakan klik 'Build Tabel' untuk kedua DFA dan isi transisinya terlebih dahulu!");
    return;
  }

  try {
    const response = await fetch("/api/dfa/equivalence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dfa1: d1, dfa2: d2 })
    });

    const data = await response.json();
    if (!data.success) {
      resultCard.style.display = "block";
      resultDiv.innerHTML = `<div class="result-box r-warn">⚠ Gagal membandingkan: ${data.message}</div>`;
      return;
    }

    resultCard.style.display = "block";
    
    if (data.equivalent) {
      resultDiv.innerHTML = `
        <div class="equiv-big" style="color:var(--emerald)">≡</div>
        <div class="result-box r-accept" style="text-align:center">
          <b>DFA 1 dan DFA 2 EKUIVALEN (SETARA)</b><br>
          <span style="font-size:11px">Kedua mesin menerima bahasa yang persis sama.</span>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="equiv-big" style="color:var(--rose)">≢</div>
        <div class="result-box r-reject" style="text-align:center">
          <b>DFA 1 dan DFA 2 TIDAK EKUIVALEN</b><br>
          <span style="font-size:12px">Contoh string pembeda (counterexample): <code>"${data.counterexample}"</code></span>
        </div>
      `;
    }

    // Gambar diagram kedua DFA untuk perbandingan
    drawAutomata(
      "diagram5a-container",
      d1.states,
      d1.alpha,
      d1.start,
      d1.finals,
      d1.trans
    );

    drawAutomata(
      "diagram5b-container",
      d2.states,
      d2.alpha,
      d2.start,
      d2.finals,
      d2.trans
    );

  } catch (err) {
    resultCard.style.display = "block";
    resultDiv.innerHTML = `<div class="result-box r-reject">✗ Gagal menghubungi server: ${err.message}</div>`;
  }
}

// Inisialisasi awal
window.addEventListener("load", () => {
  buildDFATable();
  const exTrans = {
    "q0|||0": "q1", "q0|||1": "q0",
    "q1|||0": "q2", "q1|||1": "q1",
    "q2|||0": "q1", "q2|||1": "q2"
  };
  Object.assign(dfaData.trans, exTrans);
  
  setTimeout(() => {
    Object.entries(exTrans).forEach(([k, v]) => {
      const el = document.querySelector(
        `#dfa-trans-container input[onchange*="${k}"]`
      );
      if (el) el.value = v;
    });
    renderDFAdiagram();
  }, 100);
});
