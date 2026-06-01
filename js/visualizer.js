/**
 * VISUALIZER.JS - Cytoscape based automata visualization
 */

const automataGraphs = {};

function computeThompsonPositions(tree, width, height) {
  const positions = {};
  const nodeGapX = 118;
  const branchGapY = 104;
  const mergeGapX = 92;
  const startX = 92;
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

  const padX = Math.max(28, 64 - minX);
  const padY = Math.max(28, 64 - minY);
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

if (typeof cytoscape !== "undefined") {
  if (typeof cytoscapeDagre !== "undefined") {
    cytoscape.use(cytoscapeDagre);
  }
  if (typeof cytoscapeElk !== "undefined") {
    cytoscape.use(cytoscapeElk);
  }
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
      '<div class="diagram-placeholder">Cytoscape belum termuat</div>';
    return;
  }

  if (automataGraphs[containerId]) {
    automataGraphs[containerId].destroy();
  }

  container.innerHTML = "";
  const isNfaView = containerId === "diagram2-container";
  const useThompsonPreset =
    isNfaView && typeof nfaData !== "undefined" && nfaData.layoutTree;
  const preset = useThompsonPreset
    ? computeThompsonPositions(
        nfaData.layoutTree,
        container.clientWidth || 597,
        container.clientHeight || 298,
      )
    : null;

  const nodeSet = new Set(states);
  const rootState = states.includes(startState) ? startState : states[0];

  const elements = states.map((s) => ({
    data: {
      id: s,
      label: s,
      isFinal: finalStates.includes(s),
      isActive: activeState === s,
    },
    classes: [
      finalStates.includes(s) ? "node-final" : "",
      activeState === s ? "node-active" : "",
    ]
      .filter(Boolean)
      .join(" "),
    ...(preset && preset.positions[s] ? { position: preset.positions[s] } : {}),
  }));

  // Build edge map to keep combined labels per pair.
  const edgeMap = {};
  Object.entries(transitions).forEach(([key, dest]) => {
    const [from, sym] = key.split("|||");
    if (!dest || dest === "∅") return;
    if (!nodeSet.has(from)) return;
    const dests = Array.isArray(dest) ? dest : [dest];
    dests.forEach((d) => {
      if (!d || !states.includes(d)) return;
      const ek = from + "->" + d;
      if (!edgeMap[ek]) edgeMap[ek] = { from, to: d, labels: [] };
      edgeMap[ek].labels.push(sym === "ε" ? "ε" : sym);
    });
  });

  Object.values(edgeMap).forEach((e, i) => {
    const isActive =
      !!highlightEdge &&
      highlightEdge.from === e.from &&
      highlightEdge.to === e.to;
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
              x: (preset.positions[rootState]?.x || 72) - 56,
              y: preset.positions[rootState]?.y || 0,
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
          width: isNfaView ? 40 : 42,
          height: isNfaView ? 40 : 42,
          label: "data(label)",
          "background-color": "#ffffff",
          "border-color": "#c8c5ba",
          "border-width": 2,
          color: "#1a1917",
          "font-family": "IBM Plex Mono",
          "font-size": 11,
          "text-valign": "center",
          "text-halign": "center",
          "text-wrap": "ellipsis",
          "text-max-width": 40,
        },
      },
      {
        selector: "node.node-final",
        style: {
          "background-color": "#eff6ff",
          "border-color": "#2563eb",
          "border-style": "double",
          "border-width": 5,
          color: "#1e40af",
        },
      },
      {
        selector: "node.node-active",
        style: {
          "background-color": "#f0fdf4",
          "border-color": "#16a34a",
          "border-width": 4,
          color: "#16a34a",
        },
      },
      {
        selector: "node.start-marker",
        style: {
          width: 2,
          height: 2,
          label: "",
          "background-opacity": 0,
          "border-width": 0,
          events: "no",
        },
      },
      {
        selector: "edge",
        style: {
          width: 1.6,
          "line-color": "#c8c5ba",
          "target-arrow-color": "#9b9890",
          "target-arrow-shape": "triangle",
          "curve-style": isNfaView ? "unbundled-bezier" : "bezier",
          label: "data(label)",
          color: "#6b6860",
          "font-family": "IBM Plex Mono",
          "font-size": 10,
          "text-background-opacity": 1,
          "text-background-color": "#f0efe9",
          "text-background-padding": 2,
          "text-margin-y": -8,
          "text-rotation": "autorotate",
        },
      },
      {
        selector: "edge.edge-loop",
        style: {
          "loop-direction": "-45deg",
          "loop-sweep": "70deg",
        },
      },
      {
        selector: "edge.edge-active",
        style: {
          "line-color": "#16a34a",
          "target-arrow-color": "#16a34a",
          color: "#16a34a",
          width: 2.2,
        },
      },
      {
        selector: "edge.start-edge",
        style: {
          "line-color": "#16a34a",
          "target-arrow-color": "#16a34a",
          width: 2,
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
    autoungrabify: true,
    layout: preset
      ? { name: "preset", fit: true, padding: 20, animate: false }
      : undefined,
  });

  const useElk =
    !preset && states.length >= 18 && typeof cytoscapeElk !== "undefined";
  const useDagre = !useElk && typeof cytoscapeDagre !== "undefined";

  const layout = preset
    ? null
    : useElk
      ? cy.layout({
          name: "elk",
          fit: true,
          padding: 26,
          elk: {
            algorithm: "layered",
            "elk.direction": "RIGHT",
            "elk.spacing.nodeNode": "28",
            "elk.layered.spacing.nodeNodeBetweenLayers": "40",
            "elk.edgeRouting": "SPLINES",
          },
        })
      : useDagre
        ? cy.layout({
            name: "dagre",
            rankDir: "LR",
            padding: isNfaView ? 30 : 24,
            nodeSep: isNfaView ? 42 : 36,
            edgeSep: isNfaView ? 26 : 20,
            rankSep: isNfaView ? 66 : 52,
            ranker: isNfaView ? "network-simplex" : "tight-tree",
            align: isNfaView ? "UL" : undefined,
            nodeDimensionsIncludeLabels: true,
            fit: true,
            animate: false,
          })
        : cy.layout({
            name: "breadthfirst",
            directed: true,
            roots: rootState ? `#${rootState}` : undefined,
            padding: 24,
            spacingFactor: 1.15,
            fit: true,
            animate: false,
          });

  if (layout) layout.run();

  if (isNfaView && !preset) {
    cy.edges().forEach((edge) => {
      const source = edge.source();
      const target = edge.target();
      if (!source.length || !target.length) return;
      if (source.id() === target.id()) {
        edge.style({
          "loop-direction": "-70deg",
          "loop-sweep": "75deg",
        });
      } else if (edge.data("label").includes(",")) {
        edge.style({
          "control-point-distances": 44,
          "control-point-weights": 0.5,
        });
      } else {
        edge.style({
          "control-point-distances": 30,
          "control-point-weights": 0.5,
        });
      }
    });
  }

  if (rootState) {
    const root = cy.getElementById(rootState);
    const marker = cy.getElementById(`${containerId}-start-marker`);
    if (root.length && marker.length) {
      const p =
        preset && preset.positions[rootState]
          ? preset.positions[rootState]
          : root.position();
      marker.position({ x: p.x - 52, y: p.y });
    }
  }

  cy.resize();
  cy.fit(
    cy.nodes().filter((n) => !n.hasClass("start-marker")),
    24,
  );

  automataGraphs[containerId] = cy;
}
