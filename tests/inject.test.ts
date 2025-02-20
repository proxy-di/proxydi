import { describe, it, expect } from 'vitest';
import { inject } from '../src/index';
import { Injection, INJECTIONS } from '../src/types';

class Empty {
    constructor(public readonly name = 'Free dependency') {}
}
class Dependent {
    @inject() freeDependency: Empty;
    @inject('freeDependency') anotherFreeDependency: Empty;
}

describe('inject', () => {
    it('should add INJECTS', () => {
        const dependencyInstance = new Dependent() as any;
        expect(dependencyInstance[INJECTIONS]).is.not.undefined;
        expect(Object.values(dependencyInstance[INJECTIONS]).length).equal(2);
    });

    it("@inject itself doesn't inject anything", () => {
        const dependencyInstance2 = new Dependent() as any;
        expect(dependencyInstance2.freeDependency).is.undefined;
        expect(dependencyInstance2.anotherFreeDependency).is.undefined;
    });

    it('Dependency ID could be taken from property name', () => {
        const depInstance = new Dependent() as any;

        const inject = Object.values(depInstance[INJECTIONS])[0] as Injection;
        expect(inject.property).equal('freeDependency');
        expect(inject.dependencyId).equal('freeDependency');
    });

    it('Service ID could be set directly', () => {
        const depInstance = new Dependent() as any;

        const inject2 = Object.values(depInstance[INJECTIONS])[1] as Injection;
        expect(inject2.property).equal('anotherFreeDependency');
        expect(inject2.dependencyId).equal('freeDependency');
    });

    it('Injected data should allow set value', () => {
        const dependent = new Dependent() as any;

        const inject = Object.values(dependent[INJECTIONS])[0] as Injection;
        inject.set(dependent, new Empty());
        expect(dependent.freeDependency).is.not.undefined;
        expect(dependent.freeDependency.name).equal('Free dependency');
        expect(dependent.freeDependency instanceof Empty).is.true;

        const inject2 = Object.values(dependent[INJECTIONS])[1] as Injection;
        inject2.set(dependent, new Empty('Another free dependency'));
        expect(dependent.anotherFreeDependency).is.not.undefined;
        expect(dependent.anotherFreeDependency.name).equal(
            'Another free dependency'
        );
        expect(dependent.anotherFreeDependency instanceof Empty).is.true;
    });

    it('should decorate fields', () => {
        expect(() => {
            const anyInject = inject as any;
            @anyInject()
            class Test {}
        }).toThrowError('@inject decorator should decorate fields');
    });
});
