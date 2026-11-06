function run(text) {
  if (typeof text !== 'string') throw Error('Enter text to analyze.');
  const normalized = text.replace(/\r\n?/g, '\n');
  const trimmed = normalized.trim();
  return {
    words: trimmed ? trimmed.split(/\s+/u).length : 0,
    characters: [...normalized].length,
    lines: normalized ? normalized.split('\n').length : 0,
    paragraphs: trimmed ? trimmed.split(/\n[ \t]*\n+/).length : 0,
  };
}
module.exports = { run };
