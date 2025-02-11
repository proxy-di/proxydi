import { describe, it, expect } from 'vitest';
import { inject, Inject, ProxyDI } from '../src/index';
import { injectable } from '../src/injectable';

@injectable()
class FirstService {
    name = "I'm first!";
    @inject() second: SecondService;
}

@injectable('second')
class SecondService {
    name = "I'm second!";
    @inject('FirstService') first: FirstService;
}

describe('injectable', () => {
    it("should resolve dependency just by @injectable ID's without registration", () => {
        const container = new ProxyDI();

        const service1 = container.resolve<FirstService>('FirstService');
        const service2 = container.resolve<SecondService>('second');

        expect(service1.second.name).is.equals("I'm second!");
        expect(service2.first.name).is.equals("I'm first!");
    });

    it('should throw error for service ID duplicate ', () => {
        expect(() => {
            @injectable('second')
            class SecondAgain {}
        }).toThrowError(
            `ProxyDI injectable classes already has service ID: second`
        );
    });
});
