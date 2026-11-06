const units = { m: 1, km: 1000, ft: 0.3048, mi: 1609.344 };
function convert(value, from, to) {
  if (!Number.isFinite(value) || value < 0)
    throw Error('Enter a non-negative, finite distance.');
  if (!Object.hasOwn(units, from) || !Object.hasOwn(units, to))
    throw Error('Supported units: m, km, ft, mi.');
  const result = (value * units[from]) / units[to];
  if (!Number.isFinite(result)) throw Error('Distance is too large.');
  return { value, from, to, result };
}
module.exports = { convert };
