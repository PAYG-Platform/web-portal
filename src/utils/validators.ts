export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUsername(username: string): boolean {
  return username.trim().length >= 3;
}

export function isValidAmount(amount: number | string): boolean {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  return !isNaN(num) && num > 0;
}
