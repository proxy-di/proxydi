import { describe, it, expect } from 'vitest';
import { inject, Inject } from '../index';

class FreeService {
    constructor(public readonly name = 'Free service') {}
}
class DependentService {
    @inject() freeService: FreeService;
    @inject('freeService') anotherFreeService: FreeService;
}

describe('inject', () => {
    it('should add __ProxyDI_injects', () => {
        const service = new DependentService() as any;
        expect(service.__ProxyDI_injects).is.not.undefined;
        expect(service.__ProxyDI_injects.length).equal(2);
    });

    it("@inject itself doesn't inject anything", () => {
        const service = new DependentService() as any;
        expect(service.freeService).is.undefined;
        expect(service.anotherFreeService).is.undefined;
    });

    it('Service ID could be taken from property name', () => {
        const service = new DependentService() as any;

        const inject = service.__ProxyDI_injects[0] as Inject;
        expect(inject.property).equal('freeService');
        expect(inject.serviceId).equal('freeService');
    });

    it('Service ID could be set directly', () => {
        const service = new DependentService() as any;

        const inject2 = service.__ProxyDI_injects[1] as Inject;
        expect(inject2.property).equal('anotherFreeService');
        expect(inject2.serviceId).equal('freeService');
    });

    it('Injected data should allow set value', () => {
        const service = new DependentService() as any;

        const inject = service.__ProxyDI_injects[0] as Inject;
        inject.set(service, new FreeService());
        expect(service.freeService).is.not.undefined;
        expect(service.freeService.name).equal('Free service');
        expect(service.freeService instanceof FreeService).is.true;

        const inject2 = service.__ProxyDI_injects[1] as Inject;
        inject2.set(service, new FreeService('Another free service'));
        expect(service.anotherFreeService).is.not.undefined;
        expect(service.anotherFreeService.name).equal('Another free service');
        expect(service.anotherFreeService instanceof FreeService).is.true;
    });
});
