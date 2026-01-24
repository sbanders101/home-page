export const getDayOfYear = (date) => {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / (24 * 60 * 60 * 1000)) + 1;
};

export const interpolateValue = (a, b, fraction) => a + (b - a) * fraction;

const parseHexColor = (hex) => {
  const stripped = hex.replace("#", "");
  return {
    r: parseInt(stripped.substring(0, 2), 16),
    g: parseInt(stripped.substring(2, 4), 16),
    b: parseInt(stripped.substring(4, 6), 16)
  };
};

export const interpolateHexColor = (c1, c2, fraction) => {
  const { r: r1, g: g1, b: b1 } = parseHexColor(c1);
  const { r: r2, g: g2, b: b2 } = parseHexColor(c2);

  const r = Math.round(interpolateValue(r1, r2, fraction));
  const g = Math.round(interpolateValue(g1, g2, fraction));
  const b = Math.round(interpolateValue(b1, b2, fraction));

  return `#${(r | (1 << 8)).toString(16).slice(1)}${(g | (1 << 8))
    .toString(16)
    .slice(1)}${(b | (1 << 8)).toString(16).slice(1)}`;
};

export const interpolateRgbFromHex = (c1, c2, fraction) => {
  const { r: r1, g: g1, b: b1 } = parseHexColor(c1);
  const { r: r2, g: g2, b: b2 } = parseHexColor(c2);

  const r = Math.round(interpolateValue(r1, r2, fraction));
  const g = Math.round(interpolateValue(g1, g2, fraction));
  const b = Math.round(interpolateValue(b1, b2, fraction));

  return `rgb(${r}, ${g}, ${b})`;
};
