import { describe, it, expect } from 'vitest';
import { inject } from '../src/index';
import { Injection, INJECTIONS } from '../src/types';

class FreeService {
    constructor(public readonly name = 'Free service') {}
}
class DependentService {
    @inject() freeService: FreeService;
    @inject('freeService') anotherFreeService: FreeService;
}

describe('inject', () => {
    it('should add INJECTS', () => {
        const service = new DependentService() as any;
        expect(service[INJECTIONS]).is.not.undefined;
        expect(Object.values(service[INJECTIONS]).length).equal(2);
    });

    it("@inject itself doesn't inject anything", () => {
        const service = new DependentService() as any;
        expect(service.freeService).is.undefined;
        expect(service.anotherFreeService).is.undefined;
    });

    it('Service ID could be taken from property name', () => {
        const service = new DependentService() as any;

        const inject = Object.values(service[INJECTIONS])[0] as Injection;
        expect(inject.property).equal('freeService');
        expect(inject.dependencyId).equal('freeService');
    });

    it('Service ID could be set directly', () => {
        const service = new DependentService() as any;

        const inject2 = Object.values(service[INJECTIONS])[1] as Injection;
        expect(inject2.property).equal('anotherFreeService');
        expect(inject2.dependencyId).equal('freeService');
    });

    it('Injected data should allow set value', () => {
        const service = new DependentService() as any;

        const inject = Object.values(service[INJECTIONS])[0] as Injection;
        inject.set(service, new FreeService());
        expect(service.freeService).is.not.undefined;
        expect(service.freeService.name).equal('Free service');
        expect(service.freeService instanceof FreeService).is.true;

        const inject2 = Object.values(service[INJECTIONS])[1] as Injection;
        inject2.set(service, new FreeService('Another free service'));
        expect(service.anotherFreeService).is.not.undefined;
        expect(service.anotherFreeService.name).equal('Another free service');
        expect(service.anotherFreeService instanceof FreeService).is.true;
    });

    it('should decorate fields', () => {
        expect(() => {
            const anyInject = inject as any;
            @anyInject()
            class Test {}
        }).toThrowError('@inject decorator should decorate fields');
    });
});
