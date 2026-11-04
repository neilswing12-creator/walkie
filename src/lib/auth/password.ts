import bcrypt from "bcryptjs";

export const PASSWORD_MIN = 8;
export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export function passwordProblems(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (pw.length > 200) return "That password is too long.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Include at least one letter and one number.";
  return null;
}
