export const normalizePermission = (permission) =>
    (permission || '').toString().trim().toUpperCase();

export const getPermissions = (authState) =>
    Array.isArray(authState?.permissions)
        ? authState.permissions.map(normalizePermission).filter(Boolean)
        : [];

export const isAdmin = (authState) => {
    const role = (authState?.role || '').toString().trim().toUpperCase().replace('ROLE_', '');
    return role === 'ADMIN';
};

export const hasPermission = (authState, permission) =>
    isAdmin(authState) || getPermissions(authState).includes(normalizePermission(permission));

export const hasAnyPermission = (authState, permissions = []) => {
    if (!permissions || permissions.length === 0) return true;
    if (isAdmin(authState)) return true;
    const userPermissions = new Set(getPermissions(authState));
    return permissions.some((permission) => userPermissions.has(normalizePermission(permission)));
};

export const hasAllPermissions = (authState, permissions = []) => {
    if (!permissions || permissions.length === 0) return true;
    if (isAdmin(authState)) return true;
    const userPermissions = new Set(getPermissions(authState));
    return permissions.every((permission) => userPermissions.has(normalizePermission(permission)));
};
