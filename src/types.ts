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
    name?: string;
    parent?: ProxyDI;

    throwDuplicateException?: boolean;
    createProxyDIProperty?: boolean;

    autoResolveCUnknownlasses?: boolean;
    propertyNamesAsDependencyIds?: boolean;
    classAsDependencies?: boolean;
};
