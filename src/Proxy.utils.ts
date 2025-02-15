import {
    IS_PROXY,
    InjectionProxy as IInjectionProxy,
    ContainerizedServiceInstance,
    INJECTION_OWNER,
    Injection,
    IProxyDiContainer,
    PROXYDY_CONTAINER,
} from './types';

class InjectionProxy implements IInjectionProxy {
    [IS_PROXY]: true = true;
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
            const value = container.resolveDependency(inject.serviceId) as any;
            if (
                isInjectionProxy(value) &&
                value[PROXYDY_CONTAINER] !== container
            ) {
            }
            return value;
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
            // TODO: Maybe should throw an error to deny set injections?
            const service = getService();
            return Reflect.set(service, prop, value);
        },

        has: function (target: InjectionProxy, prop: string) {
            const service = getService();
            return Reflect.has(service, prop);
        },
    }) as T;
};

export function isInjectionProxy(value: any): boolean {
    return !!(value && value[IS_PROXY]);
}
