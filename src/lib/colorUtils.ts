// Utility to map color names to hex values for primary color theming
export const colorMap: Record<string, string> = {
  blue: '#4361ee',
  red: '#e7515a',
  green: '#00ab55',
  purple: '#805dca',
  orange: '#e2a03f',
  teal: '#00b8d9',
};

export function getColorHex(color: string): string {
  return colorMap[color] || colorMap.blue;
}
