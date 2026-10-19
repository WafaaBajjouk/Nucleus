import { projects } from './data/projects.js';
import { initGraphSelection } from './scripts/graph/selection.js';
import { initGraphInteractions } from './scripts/graph/interactions.js';
import { initGraphToolbar } from './scripts/graph/toolbar.js';

const graph = document.querySelector('#project-graph');
const state = {
  graph,
  projects,
  details: document.querySelector('#graph-details'),
  workspace: graph.querySelector('.workspace-node'),
  projectNodes: [...graph.querySelectorAll('[data-project]')],
  selectedProject: projects[0],
};
const selection = initGraphSelection(state);
initGraphInteractions(state, selection);
initGraphToolbar(state, selection);
selection.selectProject(state.selectedProject);
