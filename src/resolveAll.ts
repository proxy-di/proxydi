import { autoInjectableClasses } from './autoInjectable';
import {
    ContainerizedDependency,
    DependencyId,
    IProxyDiContainer,
    PROXYDY_CONTAINER,
} from './types';

/**
 * Resolves all dependencies from this container and it's children either by its dependency ID or through a class constructor for auto-injectable classes.
 * @param param The dependency ID or class constructor.
 * @returns Array with all founded dependence instances, could be empty
 */
export function resolveAll<T>(
    instance: any,
    dependencyId: DependencyId
): (T & ContainerizedDependency)[];
export function resolveAll<T extends new (...args: any[]) => any>(
    instance: any,
    SomeClass: T
): (InstanceType<T> & ContainerizedDependency)[];
export function resolveAll<T>(
    instance: any,
    dependencyId: any
): (T & ContainerizedDependency)[] {
    if (typeof dependencyId === 'function') {
        for (const [id, DependencyClass] of Object.entries(
            autoInjectableClasses
        )) {
            if (DependencyClass === dependencyId) {
                return resolveAll(instance, id);
            }
        }
        throw new Error(`Class is not auto injectable: ${dependencyId.name}`);
    }

    const container = (instance as ContainerizedDependency)[PROXYDY_CONTAINER];
    if (!container) {
        throw new Error('Instance is not registered in any container');
    }

    return recursiveResolveAll<T>(container, dependencyId);
}

function recursiveResolveAll<T>(
    container: IProxyDiContainer,
    dependencyId: DependencyId
): (T & ContainerizedDependency)[] {
    let all: (T & ContainerizedDependency)[] = container.isKnown(dependencyId)
        ? [container.resolve(dependencyId)]
        : [];

    for (const child of container.children) {
        const allChild = recursiveResolveAll<T>(child, dependencyId);
        all = all.concat(allChild);
    }

    return all;
}
