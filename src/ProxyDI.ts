import { ProxyFactory } from './ProxyFactory';
import {
    Inject,
    ProxyDISettings,
    ServiceClass,
    ServiceConstructor,
    ServiceId,
} from './types';

export class ProxyDI {
    public readonly name: string;
    public readonly parent?: ProxyDI;
    private children: Record<string, ProxyDI> = {};

    private instances: { [id in ServiceId]: any } = {};
    private classes: { [id in ServiceId]: ServiceClass<any> } = {};
    private proxies: { [id in ServiceId]: any } = {};

    private proxyFactory: ProxyFactory;

    protected throwDuplicateException = true;

    constructor(settings?: ProxyDISettings) {
        this.proxyFactory = new ProxyFactory(this);

        if (settings?.name) {
            this.name = settings.name;
        } else {
            this.name = settings?.parent
                ? `${settings.parent.name}-${settings.parent.newChildIndex()}`
                : 'root';
        }

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
        this.injectDependencies(instance);
        this.instances[serviceId] = instance;
    }

    registerClass<T>(serviceId
        : ServiceId, serviceClass: ServiceClass<T>) {
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
        return definer;
    }

    private injectDependencies(instance: any) {
        const serviceInjects: Inject[] = instance.__ProxyDI_injects || [];
        serviceInjects.forEach((inject: Inject) => {
            let value = this.findInstance(inject.serviceId);
            if (!value) {
                value = this.getProxy(inject.serviceId);
            }

            inject.set(instance, value);
        });

        if (typeof instance === 'object') {
            instance.__ProxyDI = this;
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
            this.parent.removeChild(this.name, false);
        }
    }

    addChild(child: ProxyDI) {
        if (this.children[child.name]) {
            throw new Error(`"ProxyDI already has child with name ${name}"`);
        }

        this.children[child.name] = child;
    }

    newChildIndex() {
        return Object.keys(this.children).length;
    }

    removeChild(name: string, destroy = true) {
        const child = this.children[name];
        if (!child) {
            return;
        }

        if (destroy) {
            child.destroy();
        }

        delete this.children[name];
    }
}
