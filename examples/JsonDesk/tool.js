function run(text) {
  if (typeof text !== 'string') throw Error('Enter a JSON document.');
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw Error('Invalid JSON. Check the document syntax.');
  }
  return {
    formatted: JSON.stringify(value, null, 2),
    type:
      value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value,
  };
}
module.exports = { run };
