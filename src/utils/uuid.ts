/**
 * Generate a UUID v4
 * Simple implementation without external dependencies
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short unique ID (12 characters)
 * Format: timestamp + random
 */
export function generateShortId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Generate a property ID
 * Format: prop_<short-id>
 */
export function generatePropertyId(): string {
  return `prop_${generateShortId()}`;
}
