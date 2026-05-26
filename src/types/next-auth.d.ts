import type { Role } from "@/generated/prisma/enums";
import "next-auth";

declare module "next-auth" {
  interface User {
    role?: Role;
    activeDomainId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      activeDomainId: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    activeDomainId: string | null;
  }
}
