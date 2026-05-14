/**
 * APP.JS - Main application initialization
 */

window.addEventListener('load', () => {
  setTimeout(() => {
    buildDFATable();
    const exTrans = {
      'q0|||0': 'q1', 'q0|||1': 'q0',
      'q1|||0': 'q2', 'q1|||1': 'q1',
      'q2|||0': 'q1', 'q2|||1': 'q2'
    };
    Object.assign(dfaData.trans, exTrans);
    Object.entries(exTrans).forEach(([k, v]) => {
      const el = document.querySelector(`#dfa-trans-container input[onchange*="${k}"]`);
      if (el) el.value = v;
    });
    renderDFAdiagram();
  }, 200);
});

// Clear button handler
const btnClear = document.getElementById('btn-clear');
if (btnClear) {
  btnClear.addEventListener('click', () => {
    const box = document.querySelector('#dfa-result .result-box') || document.querySelector('.result-box');
    const traceBox = document.getElementById('dfa-trace');

    if (box && traceBox) {
      box.style.display = 'none';
      traceBox.style.display = 'none';
    }
  });
}
