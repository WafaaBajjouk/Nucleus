import { initGraphSelection } from './scripts/graph/selection.js';
import { initGraphInteractions } from './scripts/graph/interactions.js';
import { initGraphToolbar } from './scripts/graph/toolbar.js';
import { initGraphImport } from './scripts/graph/import.js';
import { initNodeDetails } from './scripts/graph/details.js';

const graph = document.querySelector('#project-graph');
const state = {
  graph,
  projects: [],
  details: document.querySelector('#graph-details'),
  workspace: graph.querySelector('.workspace-node'),
  projectNodes: [...graph.querySelectorAll('[data-project]')],
  selectedProject: null,
};
const selection = initGraphSelection(state);
initGraphInteractions(state, selection);
initGraphToolbar(state);
initNodeDetails(state);
initGraphImport(state, selection);
