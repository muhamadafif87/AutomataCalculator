/**
 * REGEX-NFA.JS - Regex to NFA conversion using Thompson's construction
 */

let nfaData = { states: [], alpha: [], start: "", finals: [], trans: {} };
let stateCounter = 0;

function newState() {
  return "q" + stateCounter++;
}

function buildNFAFromRegex() {
  stateCounter = 0;
  const regex = document.getElementById("regex-input").value.trim();
  if (!regex) {
    document.getElementById("regex-result").innerHTML =
      '<div class="result-box r-warn">⚠ Masukkan regex</div>';
    return;
  }
  try {
    const tokens = tokenize(regex);
    const postfix = toPostfix(tokens);
    const nfa = buildNFA(postfix);
    nfaData = nfa;
    document.getElementById("regex-result").innerHTML =
      `<div class="result-box r-info">✓ NFA dibangun — ${nfa.states.length} states</div>`;
    document.getElementById("nfa-info").innerHTML = `
      <p style="font-family:var(--font-mono);font-size:11px;color:var(--text-2)">States: ${nfa.states.length} &nbsp;|&nbsp; Start: <b>${nfa.start}</b> &nbsp;|&nbsp; Final: <b>${nfa.finals.join(", ")}</b></p>
      <p style="font-family:var(--font-mono);font-size:11px;color:var(--text-3);margin-top:4px">Alphabet: ${[...new Set(nfa.alpha)].join(", ")}</p>
    `;
    document.getElementById("nfa-info-card").style.display = "block";
    drawAutomata(
      "diagram2-container",
      nfa.states,
      nfa.alpha,
      nfa.start,
      nfa.finals,
      nfa.trans,
    );
    buildNFATransTable(nfa);
  } catch (e) {
    document.getElementById("regex-result").innerHTML =
      `<div class="result-box r-reject">✗ Error: ${e.message}</div>`;
  }
}

function buildNFATransTable(nfa) {
  const syms = [...new Set(nfa.alpha), "ε"];
  let html = `<table class="trans-table"><thead><tr><th>State</th>${syms.map((s) => `<th>${s}</th>`).join("")}</tr></thead><tbody>`;
  nfa.states.forEach((s) => {
    const isF = nfa.finals.includes(s),
      isS = s === nfa.start;
    html += `<tr><td style="color:${isF ? "var(--blue)" : isS ? "var(--green)" : "var(--text-2)"}">${isS ? "→ " : ""}${s}${isF ? " *" : ""}</td>`;
    syms.forEach((sym) => {
      const val = nfa.trans[s + "|||" + sym];
      html += `<td style="font-family:var(--font-mono);font-size:10px">${val ? (Array.isArray(val) ? `{${val.join(",")}}` : val) : "∅"}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById("nfa-trans-table").innerHTML = html;
}

function epsilonClosure(states, trans) {
  const closure = new Set(states);
  const stack = [...states];
  while (stack.length) {
    const s = stack.pop();
    const eps = trans[s + "|||ε"];
    if (eps) {
      const arr = Array.isArray(eps) ? eps : [eps];
      arr.forEach((t) => {
        if (!closure.has(t)) {
          closure.add(t);
          stack.push(t);
        }
      });
    }
  }
  return [...closure];
}

function nfaMove(states, sym, trans) {
  const result = new Set();
  states.forEach((s) => {
    const nxt = trans[s + "|||" + sym];
    if (nxt) {
      (Array.isArray(nxt) ? nxt : [nxt]).forEach((t) => result.add(t));
    }
  });
  return [...result];
}

function testNFA() {
  if (!nfaData.states.length) {
    document.getElementById("nfa-result").innerHTML =
      '<div class="result-box r-warn">⚠ Build NFA terlebih dahulu</div>';
    return;
  }
  const raw = document.getElementById("nfa-input-str").value.trim();
  let current = epsilonClosure([nfaData.start], nfaData.trans);
  for (const sym of raw.split("")) {
    const moved = nfaMove(current, sym, nfaData.trans);
    current = epsilonClosure(moved, nfaData.trans);
  }
  const accepted = current.some((s) => nfaData.finals.includes(s));
  document.getElementById("nfa-result").innerHTML =
    `<div class="result-box ${accepted ? "r-accept" : "r-reject"}">
    ${accepted ? "✓ ACCEPTED" : "✗ REJECTED"} — "${raw || "ε"}"<br>
    <small>State set akhir: {${current.join(", ")}}</small>
  </div>`;
}

function testRegexDirect() {
  const regex = document.getElementById("regex-input").value.trim();
  const str = document.getElementById("nfa-input-str").value;
  try {
    const accepted = new RegExp("^" + regex + "$").test(str);
    document.getElementById("nfa-result").innerHTML =
      `<div class="result-box ${accepted ? "r-accept" : "r-reject"}">
      ${accepted ? "✓ ACCEPTED" : "✗ REJECTED"} (JS Regex) — "${str || "ε"}"
    </div>`;
  } catch (e) {
    document.getElementById("nfa-result").innerHTML =
      `<div class="result-box r-warn">⚠ Regex tidak valid: ${e.message}</div>`;
  }
}

// Thompson's Construction
function tokenize(regex) {
  const tokens = [];
  for (const c of regex) {
    if (c === "ε") tokens.push({ type: "CHAR", val: "ε" });
    else if (c === "/") tokens.push({ type: "|", val: "|" });
    else if ("()|*+".includes(c)) tokens.push({ type: c, val: c });
    else tokens.push({ type: "CHAR", val: c });
  }
  const out = [];
  for (let j = 0; j < tokens.length; j++) {
    out.push(tokens[j]);
    if (j + 1 < tokens.length) {
      const cur = tokens[j],
        nxt = tokens[j + 1];
      const after =
        cur.type === "CHAR" ||
        cur.type === "*" ||
        cur.type === "+" ||
        cur.type === ")";
      const before = nxt.type === "CHAR" || nxt.type === "(";
      if (after && before) out.push({ type: "CONCAT", val: "." });
    }
  }
  return out;
}

function toPostfix(tokens) {
  const prec = { "|": 1, CONCAT: 2, "*": 3, "+": 3 };
  const out = [],
    stack = [];
  for (const t of tokens) {
    if (t.type === "CHAR") out.push(t);
    else if (t.type === "(") stack.push(t);
    else if (t.type === ")") {
      while (stack.length && stack[stack.length - 1].type !== "(")
        out.push(stack.pop());
      stack.pop();
    } else {
      while (
        stack.length &&
        stack[stack.length - 1].type !== "(" &&
        (prec[stack[stack.length - 1].type] || 0) >= (prec[t.type] || 0)
      )
        out.push(stack.pop());
      stack.push(t);
    }
  }
  while (stack.length) out.push(stack.pop());
  return out;
}

function buildNFA(postfix) {
  const stack = [],
    allTrans = {},
    alphabet = new Set();
  function addT(from, sym, to) {
    const key = from + "|||" + sym;
    if (!allTrans[key]) allTrans[key] = [];
    allTrans[key].push(to);
    if (sym !== "ε") alphabet.add(sym);
  }
  for (const t of postfix) {
    if (t.type === "CHAR") {
      const s = newState(),
        e = newState();
      addT(s, t.val === "ε" ? "ε" : t.val, e);
      stack.push({
        start: s,
        end: e,
        layout: { type: "char", start: s, end: e },
      });
    } else if (t.type === "CONCAT") {
      const b = stack.pop(),
        a = stack.pop();
      addT(a.end, "ε", b.start);
      stack.push({
        start: a.start,
        end: b.end,
        layout: { type: "concat", left: a.layout, right: b.layout },
      });
    } else if (t.type === "|") {
      const b = stack.pop(),
        a = stack.pop();
      const s = newState(),
        e = newState();
      addT(s, "ε", a.start);
      addT(s, "ε", b.start);
      addT(a.end, "ε", e);
      addT(b.end, "ε", e);
      stack.push({
        start: s,
        end: e,
        layout: {
          type: "union",
          top: a.layout,
          bottom: b.layout,
          start: s,
          end: e,
        },
      });
    } else if (t.type === "*") {
      const a = stack.pop();
      const s = newState(),
        e = newState();
      addT(s, "ε", a.start);
      addT(s, "ε", e);
      addT(a.end, "ε", a.start);
      addT(a.end, "ε", e);
      stack.push({
        start: s,
        end: e,
        layout: { type: "star", child: a.layout, start: s, end: e },
      });
    } else if (t.type === "+") {
      const a = stack.pop();
      const s = newState(),
        e = newState();
      addT(s, "ε", a.start);
      addT(a.end, "ε", a.start);
      addT(a.end, "ε", e);
      stack.push({
        start: s,
        end: e,
        layout: { type: "plus", child: a.layout, start: s, end: e },
      });
    }
  }
  if (!stack.length) throw new Error("Regex tidak valid");
  const result = stack[0];
  const stateSet = new Set();
  Object.keys(allTrans).forEach((k) => {
    stateSet.add(k.split("|||")[0]);
    allTrans[k].forEach((t) => stateSet.add(t));
  });
  stateSet.add(result.start);
  stateSet.add(result.end);
  return {
    states: [...stateSet].sort(
      (a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)),
    ),
    alpha: [...alphabet],
    start: result.start,
    finals: [result.end],
    trans: allTrans,
    layoutTree: result.layout,
  };
}
