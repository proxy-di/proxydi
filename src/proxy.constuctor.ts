import { DependencyId, IProxyDiContainer } from './types';

export function makeConstructorDependencyProxy<T>(
    container: IProxyDiContainer,
    dependencyId: DependencyId
): T {
    // let values: Record<string | symbol, any> = {};
    // let wasResolved = false;

    function getDependency() {
        if (container.isKnown(dependencyId)) {
            const dependency = container.resolve(dependencyId) as any;

            // if (!wasResolved) {
            //     for (const key in values) {
            //         dependency[key] = values[key];
            //     }
            //     values = {};
            //     wasResolved = true;
            // }

            return dependency;
        } else {
            throw new Error(`Unknown dependency: ${String(dependencyId)}`);
        }
    }

    return new Proxy(
        {},
        {
            get: function (target: any, prop: string | symbol, receiver: any) {
                // if (values[prop]) {
                //     return values[prop];
                // }

                const dependency = getDependency();
                return Reflect.get(dependency, prop, receiver);
            },

            set: function (_target: any, prop: string | symbol, value: any) {
                // if (!container.isKnown(dependencyId)) {
                //     values[prop] = value;
                //     return true;
                // } else {
                const dependency = getDependency();
                return Reflect.set(dependency, prop, value);
                //}
            },

            has: function (_target: any, prop: string | symbol) {
                const dependency = getDependency();
                return Reflect.has(dependency, prop);
            },
        }
    ) as T;
}
