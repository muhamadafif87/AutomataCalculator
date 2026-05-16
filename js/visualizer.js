/**
 * VISUALIZER.JS - D3.js based automata visualization
 */

function drawAutomata(containerId, states, alphabet, startState, finalStates, transitions, activeState = null, highlightEdge = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const W = container.clientWidth || 520;
  const H = container.clientHeight || 300;

  const svg = d3.select('#' + containerId).append('svg')
    .attr('class', 'automata-svg')
    .attr('viewBox', `0 0 ${W} ${H}`);

  // Arrow markers
  const defs = svg.append('defs');
  ['norm', 'active'].forEach(t => {
    defs.append('marker')
      .attr('id', `arr-${t}-${containerId}`)
      .attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,2L8,5L0,8Z')
      .attr('fill', t === 'active' ? '#16a34a' : '#9b9890');
  });

  const n = states.length;
  const nodeR = 20;

  // Layout
  const pos = {};
  const cx = W / 2, cy = H / 2;

  const selfLoopClearance = 38;
  const margin = nodeR + selfLoopClearance + 12;

  if (n === 1) {
    pos[states[0]] = { x: cx, y: cy };
  } else if (n === 2) {
    pos[states[0]] = { x: cx - W * 0.25, y: cy };
    pos[states[1]] = { x: cx + W * 0.25, y: cy };
  } else {
    const availH = H - margin - nodeR - 8;
    const availW = W - nodeR - 30;
    const r = Math.min(availW / 2, availH / 2) * 0.85;
    const yCenterOffset = selfLoopClearance * 0.3;
    states.forEach((s, i) => {
      const angle = (2 * Math.PI * i / n) - Math.PI / 2;
      pos[s] = {
        x: cx + r * Math.cos(angle),
        y: (cy + yCenterOffset) + r * Math.sin(angle)
      };
    });
  }

  // Build edge map
  const edgeMap = {};
  Object.entries(transitions).forEach(([key, dest]) => {
    const [from, sym] = key.split('|||');
    if (!dest || dest === '∅') return;
    const dests = Array.isArray(dest) ? dest : [dest];
    dests.forEach(d => {
      if (!states.includes(d) && !d) return;
      const ek = from + '->' + d;
      if (!edgeMap[ek]) edgeMap[ek] = { from, to: d, labels: [] };
      edgeMap[ek].labels.push(sym === 'ε' ? 'ε' : sym);
    });
  });

  // Draw edges
  Object.values(edgeMap).forEach(e => {
    const isActive = highlightEdge && highlightEdge.from === e.from && highlightEdge.to === e.to;
    const edgeColor = isActive ? '#16a34a' : '#c8c5ba';
    const labelColor = isActive ? '#16a34a' : '#6b6860';
    const marker = `url(#arr-${isActive ? 'active' : 'norm'}-${containerId})`;
    const p1 = pos[e.from], p2 = pos[e.to];
    if (!p1 || !p2) return;
    const label = e.labels.join(',');

    if (e.from === e.to) {
      // Self-loop
      const loopR = 14;
      const x = p1.x, y = p1.y;
      const startAngle = -Math.PI * 0.65;
      const endAngle = -Math.PI * 0.35;
      const ax = x + nodeR * Math.cos(startAngle);
      const ay = y + nodeR * Math.sin(startAngle);
      const bx = x + nodeR * Math.cos(endAngle);
      const by = y + nodeR * Math.sin(endAngle);
      const loopTopY = y - nodeR - selfLoopClearance + 6;
      const clampedLoopTopY = Math.max(loopTopY, 10);

      svg.append('path')
        .attr('d', `M${ax},${ay} C${ax},${clampedLoopTopY} ${bx},${clampedLoopTopY} ${bx},${by}`)
        .attr('fill', 'none')
        .attr('stroke', edgeColor)
        .attr('stroke-width', 1.5)
        .attr('marker-end', marker);

      svg.append('text')
        .attr('x', x)
        .attr('y', clampedLoopTopY - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', labelColor)
        .attr('font-size', 11)
        .attr('font-family', 'IBM Plex Mono')
        .text(label);

    } else {
      const revKey = e.to + '->' + e.from;
      const hasBoth = edgeMap[revKey];
      let dx = p2.x - p1.x, dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      dx /= dist; dy /= dist;
      const startX = p1.x + dx * nodeR, startY = p1.y + dy * nodeR;
      const endX = p2.x - dx * (nodeR + 7), endY = p2.y - dy * (nodeR + 7);

      if (hasBoth) {
        const perp = { x: -dy * 28, y: dx * 28 };
        const mx = (startX + endX) / 2 + perp.x;
        const my = (startY + endY) / 2 + perp.y;
        svg.append('path')
          .attr('d', `M${startX},${startY} Q${mx},${my} ${endX},${endY}`)
          .attr('fill', 'none').attr('stroke', edgeColor).attr('stroke-width', 1.5)
          .attr('marker-end', marker);
        svg.append('text').attr('x', mx).attr('y', my - 5)
          .attr('text-anchor', 'middle').attr('fill', labelColor)
          .attr('font-size', 11).attr('font-family', 'IBM Plex Mono').text(label);
      } else {
        svg.append('line')
          .attr('x1', startX).attr('y1', startY).attr('x2', endX).attr('y2', endY)
          .attr('stroke', edgeColor).attr('stroke-width', 1.5)
          .attr('marker-end', marker);
        const lx = (startX + endX) / 2 - dy * 12;
        const ly = (startY + endY) / 2 + dx * 12;
        svg.append('text').attr('x', lx).attr('y', ly)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
          .attr('fill', labelColor).attr('font-size', 11).attr('font-family', 'IBM Plex Mono').text(label);
      }
    }
  });

  // Start arrow
  if (pos[startState]) {
    const sp = pos[startState];
    svg.append('line')
      .attr('x1', sp.x - nodeR - 22).attr('y1', sp.y)
      .attr('x2', sp.x - nodeR - 2).attr('y2', sp.y)
      .attr('stroke', '#16a34a').attr('stroke-width', 2)
      .attr('marker-end', `url(#arr-active-${containerId})`);
  }

  // Draw nodes
  states.forEach(s => {
    if (!pos[s]) return;
    const { x, y } = pos[s];
    const isFinal = finalStates.includes(s);
    const isAct = activeState === s;

    const g = svg.append('g');

    g.append('circle').attr('cx', x).attr('cy', y).attr('r', nodeR)
      .attr('fill', isAct ? '#f0fdf4' : isFinal ? '#eff6ff' : '#ffffff')
      .attr('stroke', isAct ? '#16a34a' : isFinal ? '#2563eb' : '#c8c5ba')
      .attr('stroke-width', isAct ? 2 : 1.5);

    if (isFinal) {
      g.append('circle').attr('cx', x).attr('cy', y).attr('r', nodeR - 5)
        .attr('fill', 'none')
        .attr('stroke', isAct ? '#16a34a' : '#2563eb')
        .attr('stroke-width', 1);
    }

    g.append('text').attr('x', x).attr('y', y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('fill', isAct ? '#16a34a' : isFinal ? '#1e40af' : '#1a1917')
      .attr('font-size', s.length > 3 ? 9 : 11)
      .attr('font-family', 'IBM Plex Mono').attr('font-weight', '500').text(s);
  });
}
