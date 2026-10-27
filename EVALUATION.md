# Local evaluation

Install Node.js 22+ and open a terminal in the project folder:

```sh
npm install
npm start
```

Open **http://localhost:8000**. No account or Docker is needed to browse the workspace. No applications start automatically.

The dashboard and graph show four included test projects:

| Project   | Test it                                  | Expected result                          |
| --------- | ---------------------------------------- | ---------------------------------------- |
| TaskNest  | Add a task, complete it, restart the app | The task and its completed state remain  |
| UnitLab   | Convert 1 kilometer to meters            | 1000 meters; negative input is rejected  |
| JsonDesk  | Format valid JSON, then try invalid JSON | Indented output, or a clear syntax error |
| TextScope | Analyze `Hello world`                    | 2 words and 11 characters                |

To run each application, use separate terminals:

```sh
cd examples/TaskNest
npm start
# Open http://localhost:3000
```

```sh
cd examples/UnitLab
npm start
# Open http://localhost:3001
```

JsonDesk: run `npm start` in `examples/JsonDesk`, then open http://localhost:3002.

TextScope: run `npm start` in `examples/TextScope`, then open http://localhost:3003.

Press Ctrl+C in each terminal to stop. TaskNest starts with no tasks on a fresh copy; UnitLab saves no data. TaskNest runtime data is not included in Git.

From the Nucleus project folder, run automated checks:

```sh
npm test
npm run test:examples
```

All projects include Dockerfiles and Compose files; see their READMEs. Docker host ports are 8081–8084, so the four projects can run together. Launching from the Nucleus graph and live monitoring are not implemented yet. These checks demonstrate behaviour, not a measured reduction in setup effort.
