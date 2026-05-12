import { hashPassword } from "./auth";

export function verifySuperAdmin(email: string, password: string) {
  const expectedEmail = process.env.SUPER_ADMIN_EMAIL;
  const expectedHash = process.env.SUPER_ADMIN_PASSWORD
    ? hashPassword(process.env.SUPER_ADMIN_PASSWORD)
    : null;

  if (!expectedEmail || !expectedHash) {
    throw new Error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set");
  }

  return email === expectedEmail && hashPassword(password) === expectedHash;
}
