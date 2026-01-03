import { findInjectableId } from './injectable.decorator';
import {
    AllInjection,
    INJECTIONS,
    DependencyId,
    DependencyClass,
    ResolveScope,
} from './types';

/**
 * Registers an injection for multiple dependencies of the same type.
 *
 * @param dependencyId - Dependency identifier to resolve all instances from container hierarchy.
 * @param scope - Bitwise enum to control where to search (Parent | Current | Children). Defaults to All.
 * @returns A decorator function for class fields.
 *
 * The decorated field will receive an array of all dependencies with the given ID
 * from the container hierarchy according to the scope parameter.
 */
export const injectAll = (
    dependencyId: DependencyId | DependencyClass<any>,
    scope: ResolveScope = ResolveScope.Children
) => {
    return function (_value: unknown, context: ClassFieldDecoratorContext) {
        if (context?.kind === 'field') {
            let id: DependencyId;

            if (typeof dependencyId === 'function') {
                try {
                    // Try to find in @injectable (for custom IDs)
                    id = findInjectableId(dependencyId);
                } catch {
                    // Fallback to class.name for non-injectable classes
                    if (dependencyId.name) {
                        id = dependencyId.name;
                    } else {
                        throw new Error('Invalid dependency class');
                    }
                }
            } else {
                id = dependencyId;
            }

            const injection: AllInjection = {
                property: context.name,
                dependencyId: id,
                set: context.access.set,
                isAll: true,
                scope: scope,
            };

            context.addInitializer(function (this: any) {
                if (!this[INJECTIONS]) {
                    this[INJECTIONS] = {};
                }

                this[INJECTIONS][injection.property] = injection;
            });
        } else {
            throw new Error('@injectAll decorator should decorate fields');
        }
    };
};
