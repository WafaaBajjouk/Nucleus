import { position, drawEdges } from './layout.js';
export function initGraphInteractions(state, selection) {
  const { graph, workspace, projectNodes } = state;
  const { selectProject, rememberServices } = selection;
  let drag = null;
  let suppressClick = false;
  workspace.tabIndex = 0;
  workspace.setAttribute(
    'aria-label',
    'Nucleus workspace. Use arrow keys to move.',
  );
  graph.addEventListener('click', (event) => {
    const node = event.target.closest('[data-project]');
    if (node && (!suppressClick || event.detail === 0)) {
      selectProject(
        state.projects.find((project) => project.id === node.dataset.project),
      );
    }
  });

  graph.addEventListener('pointerdown', (event) => {
    const node = event.target.closest('.graph-node');
    if (!node || !event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    drag = {
      node,
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: node.offsetLeft,
      top: node.offsetTop,
    };
    node.setPointerCapture(event.pointerId);
    node.focus({ preventScroll: true });
  });

  graph.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!suppressClick && Math.hypot(dx, dy) < 4) return;
    suppressClick = true;
    drag.node.classList.add('dragging');
    position(graph, drag.node, drag.left + dx, drag.top + dy);
    drawEdges(state);
  });

  function finishDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    drag.node.classList.remove('dragging');
    if (drag.node.hasPointerCapture(event.pointerId))
      drag.node.releasePointerCapture(event.pointerId);
    drag = null;
    rememberServices();
  }
  graph.addEventListener('pointerup', finishDrag);
  graph.addEventListener('pointercancel', finishDrag);
  graph.addEventListener('lostpointercapture', finishDrag);
  graph.addEventListener('keydown', (event) => {
    const node = event.target.closest('.graph-node');
    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (!node || !direction) return;
    event.preventDefault();
    const step = event.shiftKey ? 30 : 10;
    position(
      graph,
      node,
      node.offsetLeft + direction[0] * step,
      node.offsetTop + direction[1] * step,
    );
    rememberServices();
    drawEdges(state);
  });
}
