import type { UserResponse } from '@/lib/types';

export type UserStatus = 'ACTIVE' | 'LOCKED' | 'DISABLED';
export interface SystemUser extends UserResponse {
  updatedAt: string;
}
export interface SystemRole {
  code: string;
  description?: string;
  systemRole: boolean;
  permissions: string[];
}
export interface SystemPermission {
  code: string;
  description?: string;
}
export interface RoleInput {
  description: string;
  permissionCodes: string[];
}
export interface ProfileInput {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
}
export interface RefundInput {
  amount: string | null;
  currency: string;
}
export interface Refund {
  id: string;
  paymentAttemptId: string;
  orderId: string;
  amount: string | number;
  currency: string;
  status: string;
  failureCode?: string;
  createdAt: string;
  updatedAt: string;
}
