import { DependencyClass, DependencyId } from './types';

export const injectableClasses: Record<DependencyId, DependencyClass<any>> = {};
export const constructorInjections: Record<DependencyId, DependencyId[]> = {};

/**
 * Registers a class as an automatically injectable for dependency injection container.
 *
 * @param dependencyId - Optional dependency identifier. If omitted, the class name is used.
 * @param autoInjecions - injections that should be injected to dependency constructor while it creates
 * @returns A class decorator function.
 *
 * Note: During dependency resolution, any container that does not have an instance for the specified dependency identifier
 * will create an instance of the decorated class. However, if a container already has an instance with that identifier
 * prior to resolution, the decorated class will be ignored by that container.
 */
export function injectable(autoInjecions: DependencyId[]): any;
export function injectable(
    dependencyId?: DependencyId,
    autoInjecions?: DependencyId[]
): any;
export function injectable(
    dependencyOrDependencies?: DependencyId | DependencyId[],
    autoInjecions?: DependencyId[] | any
): any {
    return function (
        value: DependencyClass<any>,
        context: ClassDecoratorContext
    ) {
        if (context?.kind !== 'class') {
            throw new Error('@injectable decorator should decorate classes');
        }

        const name = dependencyOrDependencies
            ? Array.isArray(dependencyOrDependencies)
                ? context.name!
                : dependencyOrDependencies
            : context.name!;

        const injectToConstructor = dependencyOrDependencies
            ? Array.isArray(dependencyOrDependencies)
                ? dependencyOrDependencies
                : autoInjecions
            : autoInjecions;

        if (injectableClasses[name]) {
            throw new Error(
                `ProxyDi has already regisered dependency ${String(name)} by @injectable`
            );
        }

        injectableClasses[name] = value;
        if (injectToConstructor) {
            constructorInjections[name] = injectToConstructor;
        }
    };
}

export function findInjectableId(
    injectable: DependencyClass<any>
): DependencyId {
    for (const [id, DependencyClass] of Object.entries(injectableClasses)) {
        if (DependencyClass === injectable) {
            return id;
        }
    }
    throw new Error(`Class is not @injectable: ${injectable.name}`);
}
