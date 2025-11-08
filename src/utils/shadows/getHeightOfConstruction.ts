/**
 * Extracts positive Roman numerals from a construction string
 * @param inputString - Construction string (e.g., "II+I", "III-I")
 * @returns Array of Roman numerals without signs
 */
function extractPositiveRoman(inputString: string): string[] {
  // Split the string into parts based on + and - signs
  const parts: string[] = [];
  let current = '';

  for (let i = 0; i < inputString.length; i++) {
    const char = inputString[i];
    if (char === '+' || char === '-') {
      if (current) {
        parts.push(current);
        current = '';
      }
      current += char;
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  // Filter for positive Roman numerals
  const romanNumerals = parts
    .filter((part) => {
      // Skip parts that start with a minus sign
      if (part.startsWith('-')) {
        return false;
      }

      // Remove the plus sign if it exists
      const cleanPart = part.startsWith('+') ? part.slice(1) : part;

      // Check if this is a pure Roman numeral (no digits)
      return /^[IVXLCDM]+$/.test(cleanPart);
    })
    .map((part) => (part.startsWith('+') ? part.slice(1) : part));

  return romanNumerals;
}

/**
 * Converts a Roman numeral to decimal
 * @param roman - Roman numeral string (e.g., "III", "IV", "IX")
 * @returns Decimal value
 */
function romanToDecimal(roman: string): number {
  const romanValues: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };

  let decimal = 0;
  let prevValue = 0;

  // Iterate from right to left
  for (let i = roman.length - 1; i >= 0; i--) {
    const currentValue = romanValues[roman[i]];

    // If current value is greater than or equal to previous value, add it
    // Otherwise subtract it (for cases like IV, IX, etc.)
    if (currentValue >= prevValue) {
      decimal += currentValue;
    } else {
      decimal -= currentValue;
    }

    prevValue = currentValue;
  }

  return decimal;
}

/**
 * Gets the height (number of floors) from a construction string
 * @param constru_string - Construction string from cadastre (e.g., "II", "III+I")
 * @returns Number of floors (highest Roman numeral found)
 */
export function getHeightOfConstruction(constru_string: string): number {
  const result = extractPositiveRoman(constru_string);

  let highestValue = 0;

  if (result.length > 0) {
    highestValue = Math.max(...result.map((roman) => romanToDecimal(roman)));
  }

  return highestValue;
}
