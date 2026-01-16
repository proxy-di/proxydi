import { findInjectableId } from './injectable.decorator';
import {
    Injection,
    INJECTIONS,
    DependencyId,
    DependencyClass,
    ResolveScope,
} from './types';

/**
 * Registers an injection for dependency injection.
 *
 * @param dependencyId - Optional dependecy identifier. If omitted, the property name is used.
 * @param scope - Optional scope where to search dependency (Parent | Current | Children). Defaults to Current | Parent.
 * @returns A decorator function for class fields.
 *
 * The decorated field will receive its dependency from the same container as the injection owner.
 */
export const inject = (
    dependencyId?: DependencyId | DependencyClass<any>,
    scope?: ResolveScope
) => {
    return function (_value: unknown, context: ClassFieldDecoratorContext) {
        if (context?.kind === 'field') {
            let id: DependencyId;

            if (!dependencyId) {
                id = context.name;
            } else if (typeof dependencyId === 'function') {
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

            const injection: Injection = {
                property: context.name,
                dependencyId: id,
                set: context.access.set,
                scope,
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
