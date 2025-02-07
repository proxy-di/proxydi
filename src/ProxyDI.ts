import { INJECTS } from './inject';
import { injectableClasses } from './injectable';
import { ProxyFactory } from './ProxyFactory';
import {
    Inject,
    ProxyDISettings,
    ServiceClass,
    ServiceConstructor,
    ServiceId,
} from './types';

export const PROXYDI = Symbol('ProxyDI');

export class ProxyDI {
    private static idCounter = 0;
    public readonly id: number;

    public readonly parent?: ProxyDI;
    private children: Record<number, ProxyDI> = {};

    private instances: Record<ServiceId, any> = {};
    private classes: Record<ServiceId, ServiceClass<any>> = {};
    private proxies: Record<ServiceId, any> = {};

    private proxyFactory: ProxyFactory;

    protected throwDuplicateException = true;

    constructor(settings?: ProxyDISettings) {
        this.proxyFactory = new ProxyFactory(this);

        this.id = ProxyDI.idCounter++;

        if (settings?.parent) {
            this.parent = settings.parent;
            this.parent.addChild(this);
        }

        if (settings?.throwDuplicateException !== undefined) {
            this.throwDuplicateException = settings.throwDuplicateException;
        }
    }

    registerInstance<T>(
        serviceId: ServiceId,
        instance: T extends { new (...args: any[]): any } ? never : T
    ) {
        if (this.instances[serviceId]) {
            if (this.throwDuplicateException) {
                throw new Error(
                    `ProxyDI already has registered instance for ${serviceId}`
                );
            }
        }
        this.injectDependencies(instance);
        this.instances[serviceId] = instance;
    }

    registerClass<T>(serviceId: ServiceId, serviceClass: ServiceClass<T>) {
        if (this.classes[serviceId]) {
            if (this.throwDuplicateException) {
                throw new Error(
                    `ProxyDI already has registered class for ${serviceId}`
                );
            }
        }
        this.classes[serviceId] = serviceClass;
    }

    private findInstance<T>(serviceId: ServiceId): T | undefined {
        const instance = this.instances[serviceId];
        if (!instance && this.parent) {
            return this.parent.findInstance<T>(serviceId);
        }

        return instance;
    }

    isKnown(serviceId: ServiceId) {
        return !!(this.findInstance(serviceId) || this.findDefiner(serviceId));
    }

    resolve<T>(serviceId: ServiceId): T {
        if (!this.isKnown(serviceId)) {
            throw new Error(
                `Can't resolve unknown ProxyDI-service: ${serviceId}`
            );
        }

        const instance = this.findInstance<T>(serviceId);
        if (instance) {
            return instance;
        }

        const definer = this.findDefiner(serviceId);
        if (definer) {
            let instance = new definer();
            this.injectDependencies(instance);

            this.instances[serviceId] = instance;

            return instance as T;
        } else {
            return this.getProxy<T>(serviceId);
        }
    }

    private findDefiner(serviceId: ServiceId): ServiceClass<any> | undefined {
        let definer = this.classes[serviceId];
        if (!definer && this.parent) {
            return this.parent.findDefiner(serviceId);
        }
        if (!definer) {
            return injectableClasses[serviceId];
        }
        return definer;
    }

    private injectDependencies(instance: any) {
        const serviceInjects: Inject[] = instance[INJECTS] || [];
        serviceInjects.forEach((inject: Inject) => {
            let value = this.findInstance(inject.serviceId);
            if (!value) {
                value = this.getProxy(inject.serviceId);
            }

            inject.set(instance, value);
        });

        if (typeof instance === 'object') {
            instance[PROXYDI] = this;
        }
    }

    private getProxy<T>(serviceId: ServiceId): T {
        let proxy = this.proxies[serviceId];
        if (!proxy) {
            proxy = this.proxyFactory.makeProxy(serviceId);
            this.proxies[serviceId] = proxy;
        }

        return proxy as T;
    }

    createChildContainer(settings?: ProxyDISettings): ProxyDI {
        const childSettings = { ...settings, parent: this };
        return new ProxyDI(childSettings);
    }

    removeInstance(serviceId: ServiceId) {
        delete this.instances[serviceId];
        delete this.proxies[serviceId];
    }

    removeClass(serviceId: ServiceId) {
        delete this.classes[serviceId];
    }

    destroy() {
        this.instances = {};
        this.proxies = {};

        if (this.parent) {
            this.parent.removeChild(this.id, false);
        }
    }

    addChild(child: ProxyDI) {
        if (this.children[child.id]) {
            throw new Error(`"ProxyDI already has child with name ${name}"`);
        }

        this.children[child.id] = child;
    }

    newChildIndex() {
        return Object.keys(this.children).length;
    }

    removeChild(id: number, destroy = true) {
        const child = this.children[id];
        if (!child) {
            return;
        }

        if (destroy) {
            child.destroy();
        }

        delete this.children[id];
    }
}
