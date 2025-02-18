import {
    IS_INJECTION_PROXY,
    InjectionProxy as IInjectionProxy,
    ContainerizedServiceInstance,
    INJECTION_OWNER,
    Injection,
    IProxyDiContainer,
    PROXYDY_CONTAINER,
    IS_INSTANCE_PROXY,
} from './types';

class InjectionProxy implements IInjectionProxy {
    [IS_INJECTION_PROXY]: true = true;
    readonly [INJECTION_OWNER]: ContainerizedServiceInstance;
    readonly [PROXYDY_CONTAINER]: IProxyDiContainer;

    constructor(
        onwer: ContainerizedServiceInstance,
        container: IProxyDiContainer
    ) {
        this[INJECTION_OWNER] = onwer;
        this[PROXYDY_CONTAINER] = container;
    }
}

export const makeInjectionProxy = <T>(
    inject: Injection,
    injectionOwner: ContainerizedServiceInstance,
    container: IProxyDiContainer
): T => {
    function getService() {
        if (container.isKnown(inject.serviceId)) {
            return container.resolve(inject.serviceId) as any;
        } else {
            throw new Error(
                `Unknown ProxyDI-service: ${String(inject.serviceId)}`
            );
        }
    }
    return new Proxy(new InjectionProxy(injectionOwner, container), {
        get: function (target: InjectionProxy, prop: string, receiver: any) {
            if ((target as any)[prop]) {
                return (target as any)[prop];
            }

            const service = getService();
            return Reflect.get(service, prop, receiver);
        },

        set: function (target: InjectionProxy, prop: string, value: any) {
            const service = getService();
            return Reflect.set(service, prop, value);
        },

        has: function (target: InjectionProxy, prop: string) {
            const service = getService();
            return Reflect.has(service, prop);
        },
    }) as T;
};

export function makeInstanceProxy(instance: any) {
    const injectionValues: Record<string | symbol, any> = {};

    return new Proxy(instance, {
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
