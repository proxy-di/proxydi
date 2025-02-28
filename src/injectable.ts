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
export const injectable = (
    dependencyId?: DependencyId,
    autoInjecions?: DependencyId[]
) => {
    return function (
        value: DependencyClass<any>,
        context: ClassDecoratorContext
    ) {
        console.log(context);
        if (context?.kind === 'class') {
            const name = dependencyId ? dependencyId : context.name!;

            if (injectableClasses[name]) {
                console.log('Throw error');
                throw new Error(
                    `ProxyDi has already regisered dependency ${String(name)} by @injectable`
                );
            }

            injectableClasses[name] = value;
            if (autoInjecions) {
                constructorInjections[name] = autoInjecions;
            }
        } else {
            throw new Error('@injectable decorator should decorate classes');
        }
    };
};
