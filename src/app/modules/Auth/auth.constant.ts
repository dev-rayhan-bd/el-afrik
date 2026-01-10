export const USER_ROLE = {

  superAdmin: 'superAdmin',
  admin: 'admin',
  user: 'user',

} as const;
export type TUserRole = keyof typeof USER_ROLE;
export const UserStatus = ['in-progress', 'blocked'];
