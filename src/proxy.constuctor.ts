import { findInjectableId } from './injectable';
import { DependencyClass, DependencyId, IProxyDiContainer } from './types';

export function makeConstructorDependencyProxy<T>(
    container: IProxyDiContainer,
    dependencyId: DependencyId | DependencyClass<any>
): T {
    let values: Record<string | symbol, any> = {};
    let wasResolved = false;

    const id =
        typeof dependencyId === 'function'
            ? findInjectableId(dependencyId)
            : dependencyId;

    function getDependency() {
        if (container.isKnown(id)) {
            const dependency = container.resolve(id) as any;

            if (!wasResolved) {
                for (const key in values) {
                    dependency[key] = values[key];
                }
                values = {};
                wasResolved = true;
            }

            return dependency;
        } else {
            throw new Error(`Unknown dependency: ${String(dependencyId)}`);
        }
    }

    return new Proxy(
        {},
        {
            get: function (target: any, prop: string | symbol, receiver: any) {
                if ((target as any)[prop]) {
                    return (target as any)[prop];
                }
                if (values[prop]) {
                    return values[prop];
                }

                const dependency = getDependency();
                return Reflect.get(dependency, prop, receiver);
            },

            set: function (_target: any, prop: string | symbol, value: any) {
                if (!container.isKnown(id)) {
                    values[prop] = value;
                    return true;
                } else {
                    const dependency = getDependency();
                    return Reflect.set(dependency, prop, value);
                }
            },

            has: function (_target: any, prop: string | symbol) {
                const dependency = getDependency();
                return Reflect.has(dependency, prop);
            },
        }
    ) as T;
}
