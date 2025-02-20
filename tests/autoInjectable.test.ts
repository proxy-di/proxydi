import { describe, it, expect } from 'vitest';
import { inject, ProxyDiContainer, autoInjectable } from '../src/index';

@autoInjectable()
class First {
    name = "I'm first!";
    @inject() second: Second;
}

@autoInjectable('second')
class Second {
    name = "I'm second!";
    @inject('First') first: First;
}

describe('@autoInjectableService()', () => {
    it("should resolve dependency just by @autoInjectable ID's without registration", () => {
        const container = new ProxyDiContainer();

        const service1 = container.resolve<First>('First');
        const service2 = container.resolve<Second>('second');

        expect(service1.second.name).is.equals("I'm second!");
        expect(service2.first.name).is.equals("I'm first!");
    });

    it('should throw error for service ID duplicate ', () => {
        expect(() => {
            @autoInjectable('second')
            class SecondAgain {}
        }).toThrowError(
            `ProxyDi autoInjectable already has dependency ID: second`
        );
    });

    it('should decorate class', () => {
        expect(() => {
            const anyautoInjectable = autoInjectable as any;

            class Test {
                @anyautoInjectable()
                field: true;
            }
        }).toThrowError('@autoInjectable decorator should decorate classes');
    });
});
