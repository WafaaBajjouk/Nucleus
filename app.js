import { initProjectCatalogue } from './scripts/dashboard/projects.js';
import { initInstanceOverview } from './scripts/dashboard/instances.js';
import { initDockerReadiness } from './scripts/docker-readiness.js';

initProjectCatalogue();
initInstanceOverview();
initDockerReadiness();
