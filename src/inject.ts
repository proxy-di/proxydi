import { Inject, ServiceId } from './types';

export const inject = (serviceId?: ServiceId) => {
    return function (_value: unknown, context: ClassFieldDecoratorContext) {
        if (context?.kind === 'field') {
            const name = serviceId ? serviceId : context.name;

            const inject: Inject = {
                property: context.name,
                serviceId: name,
                set: context.access.set,
            };

            context.addInitializer(function (this: any) {
                if (!this.__ProxyDI_injects) {
                    this.__ProxyDI_injects = [];
                }

                this.__ProxyDI_injects.push(inject);
            });
        }
    };
};
