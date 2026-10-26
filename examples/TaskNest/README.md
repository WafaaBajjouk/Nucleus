# Task Board

A small task tracker: add tasks, mark them done, reopen or delete them. Tasks are saved in a JSON file and survive restarts. Built with plain JavaScript, HTML, CSS and Node.js, without dependencies.

## Local run

With Node.js 22+:

```sh
npm start
```

Open http://localhost:3000. Tasks are saved in `data/tasks.json`.

## Docker Compose

With Docker Engine and Compose running (Colima works on macOS; no Docker Desktop needed):

```sh
docker compose -p task-board up --build --wait
```

Open http://localhost:8081. Health endpoint: `/health`.

```sh
docker compose -p task-board down
```

Tasks remain in the Compose volume. `docker compose -p task-board down -v` permanently deletes them.

## Tests

```sh
npm test
```

Copy the contents of this directory into your separate GitHub repository, including `.gitignore` and `.dockerignore`.

This is a local single-user demo. It has no login or multi-process database support. Each Compose project name gets its own data volume. Launching from Nucleus's graph is not implemented yet.
