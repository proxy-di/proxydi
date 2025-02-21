import {
    IS_INJECTION_PROXY,
    InjectionProxy as IInjectionProxy,
    ContainerizedDependency,
    INJECTION_OWNER,
    Injection,
    IProxyDiContainer,
    PROXYDY_CONTAINER,
    IS_INSTANCE_PROXY,
} from './types';

class InjectionProxy implements IInjectionProxy {
    [IS_INJECTION_PROXY]: true = true;
    readonly [INJECTION_OWNER]: ContainerizedDependency;
    readonly [PROXYDY_CONTAINER]: IProxyDiContainer;

    constructor(onwer: ContainerizedDependency, container: IProxyDiContainer) {
        this[INJECTION_OWNER] = onwer;
        this[PROXYDY_CONTAINER] = container;
    }
}

export const makeInjectionProxy = <T>(
    injection: Injection,
    injectionOwner: ContainerizedDependency,
    container: IProxyDiContainer
): T => {
    function getDependency() {
        if (container.isKnown(injection.dependencyId)) {
            const dependency = container.resolve(injection.dependencyId) as any;
            if (!container.settings.allowRewriteDependencies) {
                injection.set(injectionOwner, dependency);
            }
            return dependency;
        } else {
            throw new Error(
                `Unknown dependency: ${String(injection.dependencyId)}`
            );
        }
    }
    return new Proxy(new InjectionProxy(injectionOwner, container), {
        get: function (target: InjectionProxy, prop: string, receiver: any) {
            if ((target as any)[prop]) {
                return (target as any)[prop];
            }

            const dependency = getDependency();
            return Reflect.get(dependency, prop, receiver);
        },

        set: function (target: InjectionProxy, prop: string, value: any) {
            const dependency = getDependency();
            return Reflect.set(dependency, prop, value);
        },

        has: function (target: InjectionProxy, prop: string) {
            const dependency = getDependency();
            return Reflect.has(dependency, prop);
        },
    }) as T;
};

export function makeDependencyProxy(dependency: any) {
    const injectionValues: Record<string | symbol, any> = {};

    return new Proxy(dependency, {
        get: function (target, prop, receiver) {
            if (prop === IS_INSTANCE_PROXY) {
                return true;
            }
            if (injectionValues[prop]) {
                return injectionValues[prop];
            }

            return Reflect.get(target, prop, receiver);
        },

        set: function (target: InjectionProxy, prop: string, value: any) {
            injectionValues[prop] = value;
            return Reflect.set(target, prop, value);
        },
    });
}

export function isInjectionProxy(value: any): boolean {
    return !!(value && value[IS_INJECTION_PROXY]);
}

export function isInstanceProxy(value: any): boolean {
    return !!(value && value[IS_INSTANCE_PROXY]);
}
