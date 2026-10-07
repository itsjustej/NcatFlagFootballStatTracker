export const ROLES = {
  ADMIN: 'admin',
  WORKER: 'worker',
  SOCIAL: 'social',
};

const ROLE_EMAIL = {
  admin: 'admin@ncatflag.local',
  worker: 'worker@ncatflag.local',
  social: 'social@ncatflag.local',
};

export function emailForUsername(username) {
  return ROLE_EMAIL[String(username || '').trim().toLowerCase()] ?? null;
}

export function userFromSession(session) {
  const role = session?.user?.app_metadata?.role;
  if (role !== ROLES.ADMIN && role !== ROLES.WORKER && role !== ROLES.SOCIAL) return null;
  return {
    username: session.user.user_metadata?.username ?? role,
    role,
  };
}
