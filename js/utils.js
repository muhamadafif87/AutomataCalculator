/**
 * UTILS.JS - Helper functions and utilities
 */

function parseList(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  el.classList.add('active');
}
