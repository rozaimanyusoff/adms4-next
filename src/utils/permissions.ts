import { AuthData } from "@/store/AuthContext";

type CrudAction = "view" | "create" | "update" | "delete";
type NavTreeNode = {
    path?: string | null;
    children?: NavTreeNode[] | null;
};

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

const normalizePath = (path?: string | null): string => {
    if (!path) return "/";
    const clean = path.split("?")[0].split("#")[0].trim();
    if (!clean) return "/";
    const withSlash = clean.startsWith("/") ? clean : `/${clean}`;
    if (withSlash.length > 1 && withSlash.endsWith("/")) {
        return withSlash.slice(0, -1);
    }
    return withSlash;
};

const pathToMatcher = (path: string): RegExp | null => {
    // Support Next-like dynamic patterns from nav config, e.g. /users/[id]
    if (!path.includes("[")) return null;
    const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const normalized = escaped
        .replace(/\\\[\\.\\.\\\.[^/\\]+\\\]/g, "(.+)")
        .replace(/\\\[[^/\\]+\\\]/g, "([^/]+)");
    return new RegExp(`^${normalized}(?:/.*)?$`);
};

const isPathMatch = (allowedPathRaw: string, currentPathRaw: string): boolean => {
    const allowedPath = normalizePath(allowedPathRaw);
    const currentPath = normalizePath(currentPathRaw);
    if (allowedPath === "/") return currentPath === "/";
    if (currentPath === allowedPath || currentPath.startsWith(`${allowedPath}/`)) return true;
    const matcher = pathToMatcher(allowedPath);
    return matcher ? matcher.test(currentPath) : false;
};

const collectNavPaths = (nodes: NavTreeNode[] = [], bag: string[] = []): string[] => {
    for (const node of nodes) {
        if (node?.path) bag.push(normalizePath(node.path));
        if (node?.children?.length) collectNavPaths(node.children, bag);
    }
    return bag;
};

export function flattenNavPaths(navTree?: NavTreeNode[] | null): string[] {
    if (!Array.isArray(navTree)) return [];
    return Array.from(new Set(collectNavPaths(navTree)));
}

export function canAccessPath(pathname: string, navTree?: NavTreeNode[] | null, allowList: string[] = []): boolean {
    const currentPath = normalizePath(pathname);
    const allowedPaths = [...flattenNavPaths(navTree), ...allowList.map((p) => normalizePath(p))];
    if (!allowedPaths.length) return false;
    return allowedPaths.some((allowedPath) => isPathMatch(allowedPath, currentPath));
}

export function getFirstAccessiblePath(navTree?: NavTreeNode[] | null, fallback = "/users/dashboard"): string {
    const first = flattenNavPaths(navTree).find((path) => path && path !== "#");
    return first || fallback;
}

export type { CrudAction, NavTreeNode };
