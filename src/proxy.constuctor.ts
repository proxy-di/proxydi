import { findInjectableId } from './injectable';
import { DependencyClass, DependencyId, IProxyDiContainer } from './types';

export function makeConstructorDependencyProxy<T>(
    container: IProxyDiContainer,
    dependencyId: DependencyId | DependencyClass<any>
): T {
    function getDependency() {
        const id =
            typeof dependencyId === 'function'
                ? findInjectableId(dependencyId)
                : dependencyId;
        if (container.isKnown(id)) {
            return container.resolve(id) as any;
        } else {
            throw new Error(`Unknown dependency: ${String(dependencyId)}`);
        }
    }

    return new Proxy(
        {},
        {
            get: function (target: any, prop: string, receiver: any) {
                if ((target as any)[prop]) {
                    return (target as any)[prop];
                }

                const dependency = getDependency();
                return Reflect.get(dependency, prop, receiver);
            },

            set: function (_target: any, prop: string, value: any) {
                const dependency = getDependency();
                return Reflect.set(dependency, prop, value);
            },

            has: function (_target: any, prop: string) {
                const dependency = getDependency();
                return Reflect.has(dependency, prop);
            },
        }
    ) as T;
}
