import {
    IS_INJECTION_PROXY,
    InjectionProxy as IInjectionProxy,
    ContainerizedServiceInstance,
    INJECTION_OWNER,
    Injection,
    IProxyDiContainer,
    PROXYDY_CONTAINER,
    IS_INSTANCE_PROXY,
    INSTANCE,
    INJECTIONS,
    ServiceId,
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

export function makeInstanceProxy(instance: any, container: IProxyDiContainer) {
    const reinjects: Record<ServiceId, ContainerizedServiceInstance> = {};

    return new Proxy(instance, {
        get: function (target, prop, receiver) {
            if (reinjects[prop]) {
                return reinjects[prop];
            }
            if (prop === IS_INSTANCE_PROXY) {
                return true;
            }
            if (prop === INSTANCE) {
                return instance;
            }
            if (target[prop]) {
                let value = target[prop];
                if (
                    isInjectionProxy(value) &&
                    value[PROXYDY_CONTAINER] !== container
                ) {
                    const serviceInjects: Injection[] =
                        instance[INJECTIONS] || [];

                    serviceInjects.forEach((inject: Injection) => {
                        value = makeInjectionProxy(inject, instance, container);
                        reinjects[inject.property] = value;
                    });
                }
                return value;
            }

            return Reflect.get(target, prop, receiver);
        },
    });
}

export function isInjectionProxy(value: any): boolean {
    return !!(value && value[IS_INJECTION_PROXY]);
}

export function isInstanceProxy(value: any): boolean {
    return !!(value && value[IS_INSTANCE_PROXY]);
}
