export const ADMIN_ROLE = 'Admin';
export const CITIZEN_ROLE = 'Citizen';

export function isAdmin(user) {
  return user?.role?.title === ADMIN_ROLE;
}
