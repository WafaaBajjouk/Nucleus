const http = require('node:http');
const { createInstances } = require('./services/instances.cjs');
const { listExamples } = require('./models/example-catalogue.cjs');
const { createAppController } = require('./controllers/app-controller.cjs');
const instances = createInstances();
const app = createAppController({ instances, getExamples: listExamples });
const server = http.createServer(app);

server.on('error', (error) => {
  console.error(`Could not start Nucleus: ${error.message}`);
  process.exitCode = 1;
});

const port = Number(process.env.PORT || 8000);
server.listen(port, '127.0.0.1', () => {
  console.log(`Nucleus is running at http://localhost:${port}`);
  console.log('Press Ctrl+C to stop.');
});
