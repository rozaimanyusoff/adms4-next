import { AuthData } from "@/store/AuthContext";

type CrudAction = "view" | "create" | "update" | "delete";

/**
 * Check if current role allows a given CRUD action.
 * Extensible to module-based permissions later.
 */
export function can(action: CrudAction, authData?: AuthData | null): boolean {
    const role = authData?.user?.role;
    if (!role) return false;
    return Boolean((role as any)?.[action]);
}

/**
 * Convenience helper for components: pass `authContext?.authData`.
 */
export function canUser(action: CrudAction, authData?: AuthData | null): boolean {
    return can(action, authData);
}

export type { CrudAction };
