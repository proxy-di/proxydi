import { findInjectableId } from './injectable.decorator';
import {
    ContainerizedDependency,
    DependencyId,
    IProxyDiContainer,
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
export function resolveAll<T extends new (...args: any[]) => any>(
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

    return recursiveResolveAll<T>(container, dependencyId, scope);
}

function recursiveResolveAll<T>(
    container: IProxyDiContainer,
    dependencyId: DependencyId,
    scope: ResolveScope = ResolveScope.All
): (T & ContainerizedDependency)[] {
    if ((scope as any) === 0) {
        throw new Error('ResolveScope must have at least one flag set');
    }

    let all: (T & ContainerizedDependency)[] = [];

    // Current - search in current container only
    if (scope & ResolveScope.Current) {
        if (container.hasOwn(dependencyId)) {
            all.push(container.resolve<T>(dependencyId));
        }
    }

    // Parent - search up the hierarchy
    if (scope & ResolveScope.Parent) {
        let parent = container.parent;
        if (parent && parent.isKnown(dependencyId)) {
            const dependency = parent.resolve<T>(dependencyId);
            all.push(dependency);
        }
    }

    // Children - recursively search down the hierarchy
    if (scope & ResolveScope.Children) {
        for (const child of container.children) {
            // Recursive call with Children + Current (always include Current for children)
            const childScope = ResolveScope.Children | ResolveScope.Current;
            const childResults = recursiveResolveAll<T>(
                child,
                dependencyId,
                childScope
            );
            all = all.concat(childResults);
        }
    }

    // Remove duplicates - same instance should not appear twice
    const unique: (T & ContainerizedDependency)[] = [];
    const seen = new Set<any>();

    for (const item of all) {
        if (!seen.has(item)) {
            seen.add(item);
            unique.push(item);
        }
    }

    return unique;
}
