import { ProxyDI } from './ProxyDI';

export type ServiceId = any;

export type ServiceConstructor<T extends unknown> = new () => T;

export type Setter = (object: unknown, value: unknown) => void;

export type Inject = {
    property: string | symbol;
    serviceId: ServiceId;
    set: Setter;
};

export type ServiceClass<T> = new (...args: any[]) => T;

export type ProxyDISettings = {
    parent?: ProxyDI;

    allowRegisterAnythingAsInstance?: boolean;

    allowRewriteClasses?: boolean;
    allowRewriteInstances?: boolean;
};
