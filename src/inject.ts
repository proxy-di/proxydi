import { Injection, INJECTIONS, ServiceId } from './types';

/**
 * Registers an injection for dependency injection.
 *
 * @param serviceId - Optional service identifier. If omitted, the property name is used.
 * @returns A decorator function for class fields.
 *
 * The decorated field will receive its dependency from the same container as the injection owner.
 */
export const inject = (serviceId?: ServiceId) => {
    return function (_value: unknown, context: ClassFieldDecoratorContext) {
        if (context?.kind === 'field') {
            const name = serviceId ? serviceId : context.name;

            const injection: Injection = {
                property: context.name,
                serviceId: name,
                set: context.access.set,
            };

            context.addInitializer(function (this: any) {
                if (!this[INJECTIONS]) {
                    this[INJECTIONS] = [];
                }

                this[INJECTIONS].push(injection);
            });
        } else {
            throw new Error('@inject decorator should decorate fields');
        }
    };
};
