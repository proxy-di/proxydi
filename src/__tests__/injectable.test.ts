import { describe, it, expect } from 'vitest';
import { inject, ProxyDiContainer, injectable } from '../index';

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

@injectable('third', ['First'])
class Third {
    constructor(public readonly first: First) {}
}

@injectable(['First'])
class Forth {
    constructor(public readonly first: First) {}
}

describe('@injectable()', () => {
    it("should resolve dependency just by @injectable ID's without registration", () => {
        const container = new ProxyDiContainer();

        const dependency1 = container.resolve<First>('First');
        const dependency2 = container.resolve<Second>('second');

        expect(dependency1.second.name).is.equals("I'm second!");
        expect(dependency2.first.name).is.equals("I'm first!");
    });

    it('should throw error for dependency ID duplicate ', () => {
        expect(() => {
            @injectable('second')
            class SecondAgain {}
        }).toThrowError(`ProxyDi has already regisered dependency`);
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

    it('should pass injections to constructor with depenency', () => {
        const container = new ProxyDiContainer();

        const third = container.resolve<Third>('third');

        expect(third.first).is.not.undefined;
        expect(third.first.name).equal("I'm first!");
    });

    it('should pass injections to constructor', () => {
        const container = new ProxyDiContainer();

        const forth = container.resolve(Forth);

        expect(forth.first).is.not.undefined;
        expect(forth.first.name).equal("I'm first!");
    });
});
