import { UserRole } from '@prisma/client';

export type JwtPayload = {
  userId: string;
  role: UserRole;
};
