import { INJECTS } from './inject';
import { injectableClasses } from './injectable';
import { ProxyFactory } from './ProxyFactory';
import { Inject, ProxyDISettings, ServiceClass, ServiceId } from './types';

export const PROXYDI = Symbol('ProxyDI');
export const PROXYDI_ID = Symbol('ProxyDI_ID');

export class ProxyDI {
    private static idCounter = 0;
    public readonly id: number;

    public readonly parent?: ProxyDI;
    private children: Record<number, ProxyDI> = {};

    private instances: Record<ServiceId, any> = {};
    private classes: Record<ServiceId, ServiceClass<any>> = {};
    private proxies: Record<ServiceId, any> = {};

    private proxyFactory: ProxyFactory;

    private allowRewriteClasses = false;
    private allowRewriteInstances = false;
    private allowRegisterAnythingAsInstance = false;

    constructor(settings?: ProxyDISettings) {
        this.proxyFactory = new ProxyFactory(this);

        this.id = ProxyDI.idCounter++;

        if (settings?.parent) {
            this.parent = settings.parent;
            this.parent.addChild(this);
        }

        if (settings?.allowRewriteClasses !== undefined) {
            this.allowRewriteClasses = settings.allowRewriteClasses;
        }
        if (settings?.allowRewriteInstances !== undefined) {
            this.allowRewriteInstances = settings.allowRewriteInstances;
        }
        if (settings?.allowRegisterAnythingAsInstance !== undefined) {
            this.allowRegisterAnythingAsInstance =
                settings.allowRegisterAnythingAsInstance;
        }
    }

    registerInstance<T>(
        serviceId: ServiceId,
        instance: T extends { new (...args: any[]): any } ? never : T
    ) {
        if (this.instances[serviceId]) {
            if (!this.allowRewriteInstances) {
                throw new Error(
                    `ProxyDI already has registered instance for ${serviceId}`
                );
            }
        }

        const isObject = typeof instance === 'object';
        if (!isObject && !this.allowRegisterAnythingAsInstance) {
            throw new Error(
                `Can't register as instance (allowRegisterAnythingAsInstance is off for this ProxyDI contatiner): ${instance}`
            );
        }

        this.injectDependencies(instance);

        if (isObject) {
            (instance as any)[PROXYDI_ID] = serviceId;
        }

        this.instances[serviceId] = instance;
    }

    registerClass<T>(serviceId: ServiceId, serviceClass: ServiceClass<T>) {
        if (this.classes[serviceId]) {
            if (!this.allowRewriteClasses) {
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
        return !!(
            this.findInstance(serviceId) ||
            this.findDefiner(serviceId) ||
            injectableClasses[serviceId]
        );
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

            instance[PROXYDI_ID] = serviceId;
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

    injectDependencies(instance: any) {
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
        const id = (serviceId as any)[PROXYDI_ID]
            ? (serviceId as any)[PROXYDI_ID]
            : serviceId;
        const instance = this.instances[id];
        if (instance) {
            const serviceInjects: Inject[] = instance[INJECTS] || [];
            serviceInjects.forEach((inject: Inject) => {
                inject.set(instance, undefined);
            });
            delete instance[PROXYDI];
            delete instance[PROXYDI_ID];

            delete this.instances[serviceId];
        }
    }

    removeClass(serviceId: ServiceId) {
        delete this.classes[serviceId];
    }

    destroy() {
        const allServices = Object.keys(this.instances);
        for (const serviceId of allServices) {
            const instance = this.instances[serviceId];
            this.removeInstance(instance);
        }

        this.instances = {};
        this.proxies = {};
        this.classes = {};

        for (const id of Object.keys(this.children)) {
            const child = this.children[+id];
            child.destroy();
        }
        this.children = {};

        this.proxyFactory = undefined as any;

        if (this.parent) {
            this.parent.removeChild(this.id);
            (this as any).parent = undefined;
        }
    }

    addChild(child: ProxyDI) {
        if (this.children[child.id]) {
            throw new Error(`ProxyDI already has child with id ${child.id}`);
        }

        this.children[child.id] = child;
    }

    private removeChild(id: number) {
        const child = this.children[id];
        if (child) {
            delete this.children[id];
        }
    }
}
