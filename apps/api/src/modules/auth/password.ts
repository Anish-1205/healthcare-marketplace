import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

// Compared against when the email is unknown, so login timing doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('carebridge-timing-equalizer', BCRYPT_ROUNDS);

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  return bcrypt.compare(plain, hash ?? DUMMY_HASH);
}
