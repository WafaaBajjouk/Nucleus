const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function createStore(directory) {
  fs.mkdirSync(directory, { recursive: true });
  const filename = path.join(directory, 'tasks.json');
  function list() {
    try {
      return JSON.parse(fs.readFileSync(filename, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }
  function save(tasks) {
    fs.writeFileSync(`${filename}.tmp`, JSON.stringify(tasks, null, 2));
    fs.renameSync(`${filename}.tmp`, filename);
  }
  return {
    list,
    add(title) {
      const tasks = list();
      const task = {
        id: randomUUID(),
        title,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      tasks.push(task);
      save(tasks);
      return task;
    },
    complete(id, completed) {
      const tasks = list();
      const task = tasks.find((item) => item.id === id);
      if (!task) return null;
      task.completed = completed;
      save(tasks);
      return task;
    },
    remove(id) {
      const tasks = list();
      const remaining = tasks.filter((item) => item.id !== id);
      if (remaining.length === tasks.length) return false;
      save(remaining);
      return true;
    },
  };
}
module.exports = { createStore };
