import {
    IS_INJECTION_PROXY,
    InjectionProxy as IInjectionProxy,
    ContainerizedDependency,
    INJECTION_OWNER,
    Injection,
    IProxyDiContainer,
    PROXYDI_CONTAINER,
    ResolveScope,
} from './types';

export class InjectionProxy implements IInjectionProxy {
    [IS_INJECTION_PROXY]: true = true;
    readonly [INJECTION_OWNER]: ContainerizedDependency;
    readonly [PROXYDI_CONTAINER]: IProxyDiContainer;

    constructor(onwer: ContainerizedDependency, container: IProxyDiContainer) {
        this[INJECTION_OWNER] = onwer;
        this[PROXYDI_CONTAINER] = container;
    }
}

export const makeInjectionProxy = <T>(
    injection: Injection,
    injectionOwner: ContainerizedDependency,
    container: IProxyDiContainer
): T => {
    const defaultScope = ResolveScope.Current | ResolveScope.Parent;
    let resolvedOnce = false;

    function getDependency() {
        try {
            const dependency = container.resolve(
                injection.dependencyId,
                injection.scope ?? defaultScope
            ) as any;
            resolvedOnce = true;
            return dependency;
        } catch (e) {
            throw new Error(
                `Unknown dependency: ${String(injection.dependencyId)}`
            );
        }
    }
    return new Proxy(new InjectionProxy(injectionOwner, container), {
        get: function (
            target: InjectionProxy,
            prop: string | symbol,
            receiver: any
        ) {
            if (prop === IS_INJECTION_PROXY && resolvedOnce) {
                return undefined;
            }
            if ((target as any)[prop]) {
                return (target as any)[prop];
            }

            const dependency = getDependency();
            return Reflect.get(dependency, prop, receiver);
        },

        set: function (
            target: InjectionProxy,
            prop: string | symbol,
            value: any
        ) {
            const dependency = getDependency();
            return Reflect.set(dependency, prop, value);
        },

        has: function (target: InjectionProxy, prop: string | symbol) {
            const dependency = getDependency();
            return Reflect.has(dependency, prop);
        },
    }) as T;
};

export function isInjectionProxy(value: any): boolean {
    return !!(value && value[IS_INJECTION_PROXY]);
}
