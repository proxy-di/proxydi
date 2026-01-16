import {
    ContainerizedDependency,
    DependencyId,
    DependencyClass,
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
    dependencyId: DependencyId | DependencyClass<any>,
    scope: ResolveScope = ResolveScope.Children
): (T & ContainerizedDependency)[] {
    const container = (instance as ContainerizedDependency)[
        PROXYDI_CONTAINER
    ] as IProxyDiContainer | undefined;
    if (!container) {
        throw new Error('Instance is not registered in any container');
    }

    if (typeof dependencyId === 'function') {
        return container.resolveAll(
            dependencyId as DependencyClass<any>,
            scope
        ) as (T & ContainerizedDependency)[];
    }

    return container.resolveAll(
        dependencyId as DependencyId,
        scope
    ) as (T & ContainerizedDependency)[];
}
