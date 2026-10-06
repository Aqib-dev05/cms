export interface LoginDto {
  username: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  roleId: string;
  roleName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  collegeEmail: string | null;
  role: {
    name: string;
    displayName: string;
  };
  isActive: boolean;
}
