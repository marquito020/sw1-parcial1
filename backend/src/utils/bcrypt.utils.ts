import bcrypt from 'bcryptjs';

const encrypt = async (password: string) => {
  const passwordHash = await bcrypt.hash(password, 8);
  return passwordHash;
};

const verify = async (password: string, passwordHash: string) => {
  const isCorret = await bcrypt.compare(password, passwordHash);
  return isCorret;
};

export { encrypt, verify };
