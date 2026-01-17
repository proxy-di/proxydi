import { findInjectableId } from './injectable.decorator';
import {
    ContainerizedDependency,
    DependencyClass,
    DependencyId,
    PROXYDI_CONTAINER,
    ResolveScope,
} from './types';

/**
 * Resolves all dependencies from container hierarchy either by its dependency ID or through a class constructor for auto-injectable classes.
 * @param instance The instance registered in a container (used to find its container reference).
 * @param dependencyId The dependency ID or class constructor.
 * @param scope Bitwise enum to control where to search (Parent | Current | Children). Defaults to Children.
 * @returns Array with all found dependency instances, could be empty
 */
export function resolveAll<T>(
    instance: any,
    dependencyId: DependencyId,
    scope?: ResolveScope
): (T & ContainerizedDependency)[];
export function resolveAll<T extends DependencyClass<any>>(
    instance: any,
    SomeClass: T,
    scope?: ResolveScope
): (InstanceType<T> & ContainerizedDependency)[];
export function resolveAll<T>(
    instance: any,
    dependencyId: any,
    scope: ResolveScope = ResolveScope.Children
): (T & ContainerizedDependency)[] {
    if (typeof dependencyId === 'function') {
        const id = findInjectableId(dependencyId);
        return resolveAll(instance, id, scope);
    }

    const container = (instance as ContainerizedDependency)[PROXYDI_CONTAINER];
    if (!container) {
        throw new Error('Instance is not registered in any container');
    }

    return container.resolveAll<T>(dependencyId, scope);
}
