import { describe, it, expect, beforeEach } from 'vitest';
import { inject, ProxyDiContainer, injectable } from '../src/index';

@injectable()
class First {
    name = "I'm first!";
    @inject() second: Second;
}

@injectable('second')
class Second {
    name = "I'm second!";
    @inject('First') first: First;
}

describe('@injectable()', () => {
    it("should resolve dependency just by @injectable ID's without registration", () => {
        const container = new ProxyDiContainer();

        const dependency1 = container.resolve<First>('First');
        const dependency2 = container.resolve<Second>('second');

        expect(dependency1.second.name).is.equals("I'm second!");
        expect(dependency2.first.name).is.equals("I'm first!");
    });

    it.only('should throw error for dependency ID duplicate ', () => {
        expect(() => {
            @injectable('second')
            class SecondAgain {}
        }).toThrowError(`ProxyDi has already regisered dependency`)
    });

    it('should decorate class', () => {
        expect(() => {
            const anyInjectable = injectable as any;

            class Test {
                @anyInjectable()
                field: true;
            }
        }).toThrowError('@injectable decorator should decorate classes');
    });
});
