import { ServiceClass, ServiceId } from './types';

export const injectableClasses: Record<ServiceId, ServiceClass<any>> = {};

export const injectable = (serviceId?: ServiceId) => {
    return function (value: ServiceClass<any>, context: ClassDecoratorContext) {
        if (context?.kind === 'class') {
            const name = serviceId ? serviceId : context.name;

            if (injectableClasses[name]) {
                throw new Error(
                    `ProxyDI injectable classes already has service ID: ${name}`
                );
            }

            injectableClasses[name] = value;
        } else {
            throw new Error('@injectable decorator should decorate classes');
        }
    };
};
