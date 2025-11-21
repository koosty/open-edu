import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import type { RouteId } from '$app/types';

/**
 * Navigate to a path with automatic base path resolution
 * @param path - The path to navigate to (e.g., '/dashboard', '/users/123')
 * @param options - Optional goto options (replaceState, noScroll, etc.)
 */
export function navigate(path: string, options?: Parameters<typeof goto>[1]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return goto(resolve(path as any), options);
}

/**
 * Resolve a path with base path (for use in href attributes)
 * @param path - The path to resolve
 */
export function getPath(path: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resolve(path as any);
}

/**
 * Resolve a route with parameters
 * @param routeId - The route ID (e.g., '/users/[id]')
 * @param params - The parameters object
 */
export function resolveRouteWithParams<T extends Record<string, string>>(
    routeId: RouteId,
    params: T
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resolve(routeId as any, params as any);
}