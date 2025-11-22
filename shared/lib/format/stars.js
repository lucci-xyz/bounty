export function formatStarCount(stars) {
  if (stars === undefined || stars === null) {
    return '0';
  }
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }
  return stars.toString();
}

