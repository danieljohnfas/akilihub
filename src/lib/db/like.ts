/**
 * Escapes LIKE/ILIKE wildcards so user input is matched literally.
 * PostgreSQL's default escape character is backslash.
 */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}
