import { describe, it, expect } from 'vitest';
import { inject, ProxyDI } from '../src/index';
import { autoInjectableService } from '../src/autoInjectableService';

@autoInjectableService()
class FirstService {
    name = "I'm first!";
    @inject() second: SecondService;
}

@autoInjectableService('second')
class SecondService {
    name = "I'm second!";
    @inject('FirstService') first: FirstService;
}

describe('@autoInjectableService()', () => {
    it("should resolve dependency just by @autoInjectableService ID's without registration", () => {
        const container = new ProxyDI();

        const service1 = container.resolve<FirstService>('FirstService');
        const service2 = container.resolve<SecondService>('second');

        expect(service1.second.name).is.equals("I'm second!");
        expect(service2.first.name).is.equals("I'm first!");
    });

    it('should throw error for service ID duplicate ', () => {
        expect(() => {
            @autoInjectableService('second')
            class SecondAgain {}
        }).toThrowError(
            `ProxyDI autoInjectableService already has service ID: second`
        );
    });

    it('should decorate class', () => {
        expect(() => {
            const anyautoInjectableService = autoInjectableService as any;

            class Test {
                @anyautoInjectableService()
                field: true;
            }
        }).toThrowError(
            '@autoInjectableService decorator should decorate classes'
        );
    });
});
