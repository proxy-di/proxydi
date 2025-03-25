import { DependencyId, IProxyDiContainer } from './types';

export function makeConstructorDependencyProxy<T>(
    container: IProxyDiContainer,
    dependencyId: DependencyId
): T {
    function getDependency() {
        if (container.isKnown(dependencyId)) {
            const dependency = container.resolve(dependencyId) as any;

            return dependency;
        } else {
            throw new Error(`Unknown dependency: ${String(dependencyId)}`);
        }
    }

    return new Proxy(
        {},
        {
            get: function (target: any, prop: string | symbol, receiver: any) {
                const dependency = getDependency();
                return Reflect.get(dependency, prop, receiver);
            },

            set: function (_target: any, prop: string | symbol, value: any) {
                const dependency = getDependency();
                return Reflect.set(dependency, prop, value);
            },

            has: function (_target: any, prop: string | symbol) {
                const dependency = getDependency();
                return Reflect.has(dependency, prop);
            },
        }
    ) as T;
}
