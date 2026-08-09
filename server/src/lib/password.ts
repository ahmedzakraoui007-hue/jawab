import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/** Mirrors Firebase Auth's own minimum — keeps the error message users see
 * unchanged across the migration. */
export function isPasswordStrongEnough(password: string): boolean {
    return password.length >= 6;
}
