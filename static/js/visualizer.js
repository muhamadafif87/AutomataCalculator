/**
 * VISUALIZER.JS - Cytoscape.js based automata visualization with Premium Glowing Neon Dark Styling
 */

const automataGraphs = {};

function computeThompsonPositions(tree, width, height) {
  const positions = {};
  const nodeGapX = 130;
  const branchGapY = 95;
  const mergeGapX = 90;
  const startX = 70;
  const startY = Math.max(100, Math.min(height - 100, height / 2));

  function measure(fragment) {
    if (!fragment) return { width: 0, height: 0 };

    if (fragment.type === "char") {
      return { width: nodeGapX, height: 0 };
    }

    if (fragment.type === "concat") {
      const left = measure(fragment.left);
      const right = measure(fragment.right);
      return {
        width: left.width + mergeGapX + right.width,
        height: Math.max(left.height, right.height),
      };
    }

    if (fragment.type === "union") {
      return {
        width:
          nodeGapX +
          24 +
          Math.max(
            measure(fragment.top).width,
            measure(fragment.bottom).width,
          ) +
          mergeGapX +
          12,
        height:
          branchGapY * 2 +
          Math.max(
            measure(fragment.top).height,
            measure(fragment.bottom).height,
          ),
      };
    }

    if (fragment.type === "star" || fragment.type === "plus") {
      return {
        width: nodeGapX + 24 + measure(fragment.child).width + mergeGapX + 12,
        height: measure(fragment.child).height,
      };
    }

    return { width: 0, height: 0 };
  }

  function assign(fragment, x, y) {
    if (!fragment) return { width: 0, height: 0 };

    if (fragment.type === "char") {
      positions[fragment.start] = { x, y };
      positions[fragment.end] = { x: x + nodeGapX, y };
      return { width: nodeGapX, height: 0 };
    }

    if (fragment.type === "concat") {
      const left = measure(fragment.left);
      const leftPlaced = assign(fragment.left, x, y);
      const rightX = x + left.width + mergeGapX;
      const rightPlaced = assign(fragment.right, rightX, y);
      return {
        width: leftPlaced.width + mergeGapX + rightPlaced.width,
        height: Math.max(leftPlaced.height, rightPlaced.height),
      };
    }

    if (fragment.type === "union") {
      const topMeasure = measure(fragment.top);
      const bottomMeasure = measure(fragment.bottom);
      positions[fragment.start] = { x, y };
      const childX = x + nodeGapX + 24;
      const topY = y - branchGapY - Math.max(0, topMeasure.height / 2);
      const bottomY = y + branchGapY + Math.max(0, bottomMeasure.height / 2);
      const topPlaced = assign(fragment.top, childX, topY);
      const bottomPlaced = assign(fragment.bottom, childX, bottomY);
      const childWidth = Math.max(topPlaced.width, bottomPlaced.width);
      positions[fragment.end] = { x: childX + childWidth + mergeGapX + 12, y };
      return {
        width: nodeGapX + 24 + childWidth + mergeGapX + 12,
        height:
          branchGapY * 2 + Math.max(topPlaced.height, bottomPlaced.height),
      };
    }

    if (fragment.type === "star" || fragment.type === "plus") {
      const childMeasure = measure(fragment.child);
      positions[fragment.start] = { x, y };
      const childX = x + nodeGapX + 24;
      const childY = y;
      const childPlaced = assign(fragment.child, childX, childY);
      positions[fragment.end] = {
        x: childX + childPlaced.width + mergeGapX + 12,
        y,
      };
      return {
        width: nodeGapX + 24 + childMeasure.width + mergeGapX + 12,
        height: childPlaced.height,
      };
    }

    return { width: 0, height: 0 };
  }

  const bounds = measure(tree);
  assign(tree, startX, startY);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  Object.values(positions).forEach((pos) => {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x);
    maxY = Math.max(maxY, pos.y);
  });

  const padX = Math.max(40, 80 - minX);
  const padY = Math.max(40, 80 - minY);
  Object.keys(positions).forEach((key) => {
    positions[key] = {
      x: positions[key].x + padX,
      y: positions[key].y + padY,
    };
  });

  return {
    positions,
    width: Math.max(width, maxX - minX + padX * 2, bounds.width + padX * 2),
    height: Math.max(height, maxY - minY + padY * 2, bounds.height + padY * 2),
  };
}

// Ensure Dagre plugin is registered in Cytoscape
if (typeof cytoscape !== "undefined" && typeof cytoscapeDagre !== "undefined") {
  cytoscape.use(cytoscapeDagre);
}

function drawAutomata(
  containerId,
  states,
  alphabet,
  startState,
  finalStates,
  transitions,
  activeState = null,
  highlightEdge = null,
) {
  const container = document.getElementById(containerId);
  if (!container || !Array.isArray(states) || states.length === 0) return;

  if (typeof cytoscape === "undefined") {
    container.innerHTML =
      '<div class="diagram-placeholder">Cytoscape.js gagal termuat.</div>';
    return;
  }

  if (automataGraphs[containerId]) {
    const oldCy = automataGraphs[containerId];
    const oldRo = oldCy.data("resizeObserver");
    if (oldRo) {
      oldRo.disconnect();
    }
    oldCy.destroy();
  }

  container.innerHTML = "";
  const isNfaView = containerId === "diagram2-container";
  const useThompsonPreset =
    isNfaView && typeof nfaLayoutTree !== "undefined" && nfaLayoutTree;
  
  const preset = useThompsonPreset
    ? computeThompsonPositions(
        nfaLayoutTree,
        container.clientWidth || 600,
        container.clientHeight || 400,
      )
    : null;

  const nodeSet = new Set(states);
  const rootState = states.includes(startState) ? startState : states[0];

  const elements = states.map((s) => {
    const isActive = Array.isArray(activeState) ? activeState.includes(s) : activeState === s;
    return {
      data: {
        id: s,
        label: s,
        isFinal: finalStates.includes(s),
        isActive: isActive,
      },
      classes: [
        finalStates.includes(s) ? "node-final" : "",
        isActive ? "node-active" : "",
      ]
        .filter(Boolean)
        .join(" "),
      ...(preset && preset.positions[s] ? { position: preset.positions[s] } : {}),
    };
  });

  // Check if there is any active/filled transition edge
  let hasEdges = false;

  // Build edge map to combine duplicate labels per source -> target pair
  const edgeMap = {};
  Object.entries(transitions).forEach(([key, dest]) => {
    const [from, sym] = key.split("|||");
    if (!dest || dest === "∅") return;
    if (!nodeSet.has(from)) return;
    const dests = Array.isArray(dest) ? dest : [dest];
    dests.forEach((d) => {
      if (!d || !states.includes(d)) return;
      hasEdges = true;
      const ek = from + "->" + d;
      if (!edgeMap[ek]) edgeMap[ek] = { from, to: d, labels: [] };
      const displaySym = sym === "ε" ? "ε" : sym;
      if (!edgeMap[ek].labels.includes(displaySym)) {
        edgeMap[ek].labels.push(displaySym);
      }
    });
  });

  Object.values(edgeMap).forEach((e, i) => {
    const isActive =
      !!highlightEdge &&
      highlightEdge.from === e.from &&
      highlightEdge.to === e.to &&
      (highlightEdge.symbol ? e.labels.includes(highlightEdge.symbol) : true);
      
    const edgeId = `${containerId}-e-${i}`;
    elements.push({
      data: {
        id: edgeId,
        source: e.from,
        target: e.to,
        label: e.labels.join(","),
      },
      classes: [
        isActive ? "edge-active" : "",
        e.from === e.to ? "edge-loop" : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  });

  if (rootState) {
    const startMarkerId = `${containerId}-start-marker`;
    elements.push({
      data: { id: startMarkerId, label: "" },
      classes: "start-marker",
      ...(preset
        ? {
            position: {
              x: (preset.positions[rootState]?.x || 80) - 50,
              y: preset.positions[rootState]?.y || 200,
            },
          }
        : {}),
    });
    elements.push({
      data: {
        id: `${containerId}-start-edge`,
        source: startMarkerId,
        target: rootState,
        label: "",
      },
      classes: "start-edge",
    });
  }

  const cy = cytoscape({
    container,
    elements,
    style: [
      {
        selector: "node",
        style: {
          width: 44,
          height: 44,
          label: "data(label)",
          "background-color": "#ffffff",
          "border-color": "#94a3b8",
          "border-width": 2.5,
          color: "#0f172a",
          "font-family": "Plus Jakarta Sans",
          "font-size": 12,
          "font-weight": "bold",
          "text-valign": "center",
          "text-halign": "center",
          "transition-property": "background-color, border-color, color",
          "transition-duration": "0.12s",
        },
      },
      {
        selector: "node.node-final",
        style: {
          width: 46,
          height: 46,
          "background-color": "#f8fafc",
          "border-color": "#2563eb",
          "border-style": "double",
          "border-width": 5,
          color: "#2563eb",
        },
      },
      {
        selector: "node.node-active",
        style: {
          "background-color": "#dbeafe",
          "border-color": "#2563eb",
          "border-width": 3.5,
          color: "#1e3a8a",
        },
      },
      {
        selector: "node.node-hover",
        style: {
          "border-color": "#1e40af",
          "background-color": "#f1f5f9",
        },
      },
      {
        selector: "node.node-final.node-hover",
        style: {
          "border-color": "#1d4ed8",
        },
      },
      {
        selector: "node.node-active.node-hover",
        style: {
          "background-color": "#bfdbfe",
          "border-color": "#1d4ed8",
        },
      },
      {
        selector: "node.start-marker",
        style: {
          width: 1,
          height: 1,
          label: "",
          "background-opacity": 0,
          "border-width": 0,
          events: "no",
        },
      },
      {
        selector: "edge",
        style: {
          width: 2.0,
          "line-color": "#64748b",
          "target-arrow-color": "#64748b",
          "target-arrow-shape": "triangle",
          "arrow-scale": 0.9,
          "curve-style": "bezier",
          label: "data(label)",
          color: "#475569",
          "font-family": "Plus Jakarta Sans",
          "font-size": 11,
          "text-background-opacity": 1,
          "text-background-color": "#ffffff",
          "text-background-padding": 3,
          "text-margin-y": -7,
          "text-rotation": "autorotate",
          "transition-property": "line-color, target-arrow-color, width",
          "transition-duration": "0.12s",
        },
      },
      {
        selector: "edge.edge-loop",
        style: {
          "loop-direction": "-45deg",
          "loop-sweep": "70deg",
          "control-point-step-size": 42,
        },
      },
      {
        selector: "edge.edge-backward",
        style: {
          "curve-style": "unbundled-bezier",
          "control-point-distances": (edge) => {
            const source = edge.source();
            const target = edge.target();
            const sPos = source.position();
            const tPos = target.position();
            if (!sPos || !tPos) return 65;
            const dx = Math.abs(sPos.x - tPos.x);
            return 55 + (dx * 0.12);
          },
          "control-point-weights": 0.5,
        },
      },
      {
        selector: "edge.edge-active",
        style: {
          "line-color": "#2563eb",
          "target-arrow-color": "#2563eb",
          color: "#2563eb",
          width: 3.0,
        },
      },
      {
        selector: "edge.start-edge",
        style: {
          "line-color": "#2563eb",
          "target-arrow-color": "#2563eb",
          width: 2.0,
          label: "",
          "curve-style": "straight",
          "source-endpoint": "outside-to-node",
          "target-endpoint": "outside-to-node",
        },
      },
    ],
    userPanningEnabled: true,
    userZoomingEnabled: true,
    boxSelectionEnabled: false,
    autoungrabify: false,
  });

  // Determine layout dynamically
  let layoutOptions;
  if (preset) {
    // NFA generated via Thompson (preset positions)
    layoutOptions = { name: "preset", fit: true, padding: 35, animate: false };
  } else if (!hasEdges) {
    // If there are no transitions, lay out states in a straight horizontal line!
    // This is clean, neat, and highly balanced
    layoutOptions = { name: "grid", rows: 1, fit: true, padding: 35, animate: false };
  } else {
    // General DFA, use Dagre hierarchical layout
    const useDagre = typeof cytoscapeDagre !== "undefined";
    layoutOptions = useDagre
      ? {
          name: "dagre",
          rankDir: "LR",
          padding: 40,
          nodeSep: 65,
          edgeSep: 45,
          rankSep: 85,
          nodeDimensionsIncludeLabels: true,
          fit: true,
          animate: false,
        }
      : {
          name: "breadthfirst",
          directed: true,
          roots: rootState ? `#${rootState}` : undefined,
          padding: 35,
          fit: true,
          animate: false,
        };
  }

  const layout = cy.layout(layoutOptions);
  layout.run();

  // Detect and tag backward edges for unbundled curving in preset/thompson view
  cy.ready(() => {
    cy.edges().forEach((edge) => {
      const source = edge.source();
      const target = edge.target();
      if (source.length && target.length && !edge.hasClass("start-edge")) {
        const sPos = source.position();
        const tPos = target.position();
        if (sPos && tPos && sPos.x > tPos.x) {
          edge.addClass("edge-backward");
        }
      }
    });
    
    // Position start marker pointing to the root state
    if (rootState) {
      const root = cy.getElementById(rootState);
      const marker = cy.getElementById(`${containerId}-start-marker`);
      if (root.length && marker.length) {
        setTimeout(() => {
          const p = root.position();
          marker.position({ x: p.x - 50, y: p.y });
          cy.fit(cy.nodes().filter(n => !n.hasClass('start-marker')), 35);
        }, 50);
      }
    }
    // Cursor hints and hover highlights for dragging states and panning the canvas
    cy.on('mouseover', 'node', (evt) => {
      if (!evt.target.hasClass('start-marker')) {
        container.style.cursor = 'grab';
        evt.target.addClass('node-hover');
      }
    });
    cy.on('mouseout', 'node', (evt) => {
      container.style.cursor = 'grab';
      evt.target.removeClass('node-hover');
    });
    cy.on('grab', 'node', (evt) => {
      container.style.cursor = 'grabbing';
      evt.target.removeClass('node-hover');
    });
    cy.on('free', 'node', () => {
      container.style.cursor = 'grab';
    });
  });

  cy.resize();
  
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      cy.resize();
      const validNodes = cy.nodes().filter(n => !n.hasClass('start-marker'));
      if (validNodes.length > 0) {
        cy.fit(validNodes, 35);
        cy.center(validNodes);
      }
    });
    ro.observe(container);
    cy.data('resizeObserver', ro);
  }
  
  automataGraphs[containerId] = cy;
}

// Floating controls handlers (Zoom and Center)
function zoomGraph(containerId, factor) {
  const cy = automataGraphs[containerId];
  if (cy) {
    cy.zoom(cy.zoom() * factor);
    cy.center(cy.nodes().filter(n => !n.hasClass('start-marker')));
  }
}

function fitGraph(containerId) {
  const cy = automataGraphs[containerId];
  if (cy) {
    const validNodes = cy.nodes().filter(n => !n.hasClass('start-marker'));
    cy.fit(validNodes, 35);
    cy.center(validNodes);
  }
}
