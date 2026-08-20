// cityState — "Name, City, REGION POSTAL COUNTRY" → "City, REGION".
// The stop-location format is stated at mapSellShipmentOutToDetail.ts:143-146.
export function cityState(loc) {
  if (typeof loc !== 'string') return loc
  const parts = loc.split(', ')
  if (parts.length < 2) return loc
  const city = parts[parts.length - 2]
  const region = parts[parts.length - 1].split(' ')[0]
  return region ? `${city}, ${region}` : city
}

const DT = /^(\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})\s*(\S*)/
// compactWindow — only the DISTINCTIVE part of the pickup window: same-day
// windows differ by time, multi-day by date. Full strings live in the tooltip.
export function compactWindow(earliest, latest) {
  const e = typeof earliest === 'string' ? earliest.match(DT) : null
  const l = typeof latest === 'string' ? latest.match(DT) : null
  if (!e && !l) return '--'
  if (!e || !l) return (e ? earliest : latest)
  if (e[1] === l[1]) return `${e[2]} – ${l[2]}${l[3] ? ` ${l[3]}` : ''}`
  return `${e[1].slice(0, 5)} – ${l[1].slice(0, 5)}`
}
