import { ProxyDI } from './ProxyDI';
import { ServiceId } from './types';

const IS_PROXY = Symbol('isProxy');

export class ProxyFactory {
    constructor(private container: ProxyDI) {}

    makeProxy<T>(serviceId: ServiceId): T {
        const self = this;

        const proxy = new Proxy(
            { [IS_PROXY]: true },
            {
                get: function (target: any, prop: string, receiver: any) {
                    if (target[prop]) {
                        return target[prop];
                    }
                    if (self.container.isKnown(serviceId)) {
                        const instance = self.container.resolve(
                            serviceId
                        ) as any;

                        // console.log(
                        //     `instance of ${serviceId} [ProxyDI]:`,
                        //     instance,
                        //     instance[IS_PROXY]
                        // );
                        return Reflect.get(instance, prop, receiver);
                    } else {
                        throw new Error(
                            `Unknown ProxyDI-service: ${serviceId}`
                        );
                    }
                },
                set: function (target: any, prop: string, value: any) {
                    if (self.container.isKnown(serviceId)) {
                        const instance = self.container.resolve(
                            serviceId
                        ) as any;
                        return Reflect.set(instance, prop, value);
                    } else {
                        throw new Error(
                            `Unknown ProxyDI-service: ${serviceId}`
                        );
                    }
                },
                has: function (target: any, prop: string) {
                    const instance = self.container.resolve(serviceId) as any;
                    return Reflect.has(instance, prop);
                },
            }
        );
        return proxy;
    }
}

export function isProxy(value: any): boolean {
    return !!(value && value[IS_PROXY]);
}
