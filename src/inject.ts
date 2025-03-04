import { findInjectableId } from './injectable';
import { Injection, INJECTIONS, DependencyId, DependencyClass } from './types';

/**
 * Registers an injection for dependency injection.
 *
 * @param dependencyId - Optional dependecy identifier. If omitted, the property name is used.
 * @returns A decorator function for class fields.
 *
 * The decorated field will receive its dependency from the same container as the injection owner.
 */
export const inject = (dependencyId?: DependencyId | DependencyClass<any>) => {
    return function (_value: unknown, context: ClassFieldDecoratorContext) {
        if (context?.kind === 'field') {
            const id = dependencyId
                ? typeof dependencyId === 'function'
                    ? findInjectableId(dependencyId)
                    : dependencyId
                : context.name;

            const injection: Injection = {
                property: context.name,
                dependencyId: id,
                set: context.access.set,
            };

            context.addInitializer(function (this: any) {
                if (!this[INJECTIONS]) {
                    this[INJECTIONS] = {};
                }

                this[INJECTIONS][injection.property] = injection;
            });
        } else {
            throw new Error('@inject decorator should decorate fields');
        }
    };
};
