export function formatChar(char: string): string {
  return char === ' ' ? '\u00a0' : char
}

export function displayLetter(stripChar: string, target: string): string {
  if (target >= 'a' && target <= 'z') return stripChar.toLowerCase()
  return stripChar
}
