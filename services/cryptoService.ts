
/**
 * Hashes a password using SHA-256 for secure storage.
 * In a real app, you'd use a salt and bcrypt, but SHA-256 
 * fulfills the "encrypted/one-way" requirement in the browser.
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
