import { DependencyClass, DependencyId } from './types';

export const injectableClasses: Record<
    DependencyId,
    DependencyClass<any>[]
> = {};
const injectableIdsByClass = new WeakMap<
    DependencyClass<any>,
    DependencyId[]
>();

/**
 * Registers a class as an automatically injectable for dependency injection container.
 *
 * @param dependencyId - Optional dependency identifier. If omitted, the class name is used.
 * @returns A class decorator function.
 *
 * Note: During dependency resolution, any container that does not have an instance for the specified dependency identifier
 * will create an instance of the decorated class. However, if a container already has an instance with that identifier
 * prior to resolution, the decorated class will be ignored by that container.
 */
export function injectable(
    dependencyId?: DependencyId | DependencyId[]
): any {
    return function (
        value: DependencyClass<any>,
        context: ClassDecoratorContext
    ) {
        if (context?.kind !== 'class') {
            throw new Error('@injectable decorator should decorate classes');
        }

        const explicitIds = dependencyId
            ? Array.isArray(dependencyId)
                ? dependencyId
                : [dependencyId]
            : [];

        const ids: DependencyId[] = Array.from(
            new Set<DependencyId>([...explicitIds, context.name!])
        );

        ids.forEach((id) => {
            if (!injectableClasses[id]) {
                injectableClasses[id] = [];
            }
            const list = injectableClasses[id];
            if (!list.includes(value)) {
                list.push(value);
            }
        });

        injectableIdsByClass.set(value, ids);
    };
}

export function findInjectableId(
    injectable: DependencyClass<any>
): DependencyId {
    const ids = findInjectableIds(injectable, true);
    if (ids.length === 0) {
        throw new Error(`Class is not @injectable: ${injectable.name}`);
    }
    return ids[0];
}

export function findInjectableIds(
    injectable: DependencyClass<any>,
    allowEmpty = false
): DependencyId[] {
    const ids =
        injectableIdsByClass.get(injectable) ||
        getInjectableIdsFromRegistry(injectable);
    if (ids.length === 0 && !allowEmpty) {
        throw new Error(`Class is not @injectable: ${injectable.name}`);
    }
    return ids;
}

function getInjectableIdsFromRegistry(
    injectable: DependencyClass<any>
): DependencyId[] {
    const ids: DependencyId[] = [];

    Object.entries(injectableClasses).forEach(([id, classes]) => {
        if (classes.includes(injectable)) {
            ids.push(id);
        }
    });

    Object.getOwnPropertySymbols(injectableClasses).forEach((id) => {
        if (injectableClasses[id]?.includes(injectable)) {
            ids.push(id);
        }
    });

    return ids;
}
