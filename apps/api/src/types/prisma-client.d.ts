declare module '@prisma/client' {
  export type UserRole = string;
  export type OAuthProvider = string;
  export type ProjectRole = string;
  export type NotificationType = string;
  export type MessageType = string;
  export type Prisma = any;

  export namespace Prisma {
    export type PostWhereInput = any;
    export type UserWhereInput = any;
    export type MessageWhereInput = any;
    export type UserOrderByWithRelationInput = any;
    export type UserOrderByInput = any;
    export type ProjectWhereInput = any;
    export type ProjectUpdateInput = any;
    export type NotificationWhereInput = any;
    export type RefreshTokenWhereInput = any;
    export type VerificationTokenWhereInput = any;
    export type UserOrderByWithRelationInput = any;
    export type UserOrderByInput = any;
    export type PostOrderByWithRelationInput = any;
    export type PostOrderByInput = any;
    export type CommentWhereInput = any;
    export type CommentOrderByWithRelationInput = any;
    export type PostWhereUniqueInput = any;
    export type UserWhereUniqueInput = any;
    export type UserOrderByWithRelationInput = any;
    export type StringFilter = any;
    export type DateTimeFilter = any;
    export type IntFilter = any;
    export type JsonNullableFilter = any;
    export type EnumRoleFilter = any;
  }

  export interface User {
    id: string;
    email: string;
    username: string;
    passwordHash?: string;
    deletedAt?: Date | null;
    twoFactorEnabled?: boolean;
    twoFactorSecret?: string | null;
    emailVerified?: boolean;
    role?: UserRole;
    [key: string]: any;
  }

  export interface Profile {
    [key: string]: any;
  }

  export class PrismaClient {
    constructor();
    $runCommandRaw(cmd: any): Promise<any>;
    $disconnect(): Promise<void>;
  }
}
