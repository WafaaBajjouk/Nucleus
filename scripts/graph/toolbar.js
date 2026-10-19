import { arrangeProjects, centerGraph } from './layout.js';
export function initGraphToolbar(state, selection) {
  const { graph } = state;
  document.querySelector('#reset-layout').addEventListener('click', () => {
    selection.clearPositions();
    arrangeProjects(state);
    graph.querySelector('.service-nodes').replaceChildren();
    selection.selectProject(state.selectedProject);
    centerGraph(state);
  });
}
