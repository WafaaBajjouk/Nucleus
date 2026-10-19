import { position } from './layout.js';
export function initGraphToolbar(state, selection) {
  const { graph, workspace, projectNodes } = state;
  document.querySelector('#reset-layout').addEventListener('click', () => {
    selection.clearPositions();
    position(graph, workspace, 50, 177);
    projectNodes.forEach((node, index) =>
      position(graph, node, 320, 57 + index * 120),
    );
    graph.querySelector('.service-nodes').replaceChildren();
    selection.selectProject(state.selectedProject);
  });
}
