import { DependencyClass, DependencyId } from './types';

export const autoInjectableClasses: Record<
    DependencyId,
    DependencyClass<any>
> = {};

/**
 * Registers a class as an auto-injectable for dependency injection.
 *
 * @param dependencyId - Optional dependency identifier. If omitted, the class name is used.
 * @returns A class decorator function.
 *
 * Note: During dependency resolution, any container that does not have an instance for the specified dependency identifier
 * will create an instance of the decorated class. However, if a container already has an instance with that identifier
 * prior to resolution, the decorated class will be ignored by that container.
 */
export const autoInjectable = (dependencyId?: DependencyId) => {
    return function (
        value: DependencyClass<any>,
        context: ClassDecoratorContext
    ) {
        if (context?.kind === 'class') {
            const name = dependencyId ? dependencyId : context.name!;

            if (autoInjectableClasses[name]) {
                throw new Error(
                    `ProxyDi autoInjectable already has dependency ID: ${String(name)}`
                );
            }

            autoInjectableClasses[name] = value;
        } else {
            throw new Error(
                '@autoInjectable decorator should decorate classes'
            );
        }
    };
};
