import { arrangeProjects, centerGraph, drawEdges } from './layout.js';
export function initGraphToolbar(state) {
  document.querySelector('#reset-layout').addEventListener('click', () => {
    arrangeProjects(state);
    drawEdges(state);
    centerGraph(state);
  });
}
