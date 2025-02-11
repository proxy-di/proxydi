import {
    IS_PROXY,
    ServiceId,
    InstanceProxy as IInstanceProxy,
    ProxydiedInstance,
    INSTANCE,
    PROXYDI,
} from './types';

class InstanceProxy implements IInstanceProxy {
    [IS_PROXY]: true = true;
    readonly [INSTANCE]: ProxydiedInstance;

    constructor(instance: ProxydiedInstance) {
        this[INSTANCE] = instance;
    }
}

export const makeProxy = <T>(serviceId: ServiceId, instance: any): T => {
    return new Proxy(new InstanceProxy(instance), {
        get: function (target: InstanceProxy, prop: string, receiver: any) {
            if ((target as any)[prop]) {
                return (target as any)[prop];
            }

            const container = target[INSTANCE][PROXYDI];

            if (container.isKnown(serviceId)) {
                const instance = container.resolve(serviceId) as any;
                return Reflect.get(instance, prop, receiver);
            } else {
                throw new Error(`Unknown ProxyDI-service: ${serviceId}`);
            }
        },

        set: function (target: InstanceProxy, prop: string, value: any) {
            const container = target[INSTANCE][PROXYDI];

            if (container.isKnown(serviceId)) {
                const instance = container.resolve(serviceId) as any;
                return Reflect.set(instance, prop, value);
            } else {
                throw new Error(`Unknown ProxyDI-service: ${serviceId}`);
            }
        },

        has: function (target: any, prop: string) {
            const container = target[INSTANCE][PROXYDI];

            if (container.isKnown(serviceId)) {
                const instance = container.resolve(serviceId) as any;
                return Reflect.has(instance, prop);
            } else {
                throw new Error(`Unknown ProxyDI-service: ${serviceId}`);
            }
        },
    });
};

export function isProxy(value: any): boolean {
    return !!(value && value[IS_PROXY]);
}
