import {
    ContainerizedDependency,
    AllInjection,
    IProxyDiContainer,
    PROXYDI_CONTAINER,
} from './types';
import { InjectionProxy } from './makeInjectionProxy';
import { resolveAll } from './resolveAll';

export const makeInjectAllProxy = <T>(
    injection: AllInjection,
    injectionOwner: ContainerizedDependency,
    container: IProxyDiContainer
): T[] => {
    function getDependencies(): T[] {
        const ownerContainer = injectionOwner[PROXYDI_CONTAINER];
        if (!ownerContainer) {
            throw new Error('Instance is not registered in any container');
        }

        // Use existing resolveAll function with scope from injection
        return resolveAll<T>(
            injectionOwner,
            injection.dependencyId,
            injection.scope
        );
    }

    return new Proxy(new InjectionProxy(injectionOwner, container), {
        get: function (
            target: InjectionProxy,
            prop: string | symbol,
            receiver: any
        ) {
            if ((target as any)[prop]) {
                return (target as any)[prop];
            }

            const dependencies = getDependencies();
            return Reflect.get(dependencies, prop, receiver);
        },

        set: function (
            target: InjectionProxy,
            prop: string | symbol,
            value: any
        ) {
            const dependencies = getDependencies();
            return Reflect.set(dependencies, prop, value);
        },

        has: function (target: InjectionProxy, prop: string | symbol) {
            const dependencies = getDependencies();
            return Reflect.has(dependencies, prop);
        },
    }) as any;
};
