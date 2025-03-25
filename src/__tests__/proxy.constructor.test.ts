import { describe, it, expect } from 'vitest';
import { ProxyDiContainer } from '..';
import { makeConstructorDependencyProxy } from '../makeConstructorDependencyProxy';

class First {
    name = "I'm first!";
}

describe('makeConstructorDependencyProxy', () => {
    it('errorfor unknon depndency', () => {
        const container = new ProxyDiContainer();
        container.register(First, 'First');

        const firstParam = makeConstructorDependencyProxy<any>(
            container,
            'First'
        );

        expect(firstParam.name).equal("I'm first!");
    });

    it('has property', () => {
        const container = new ProxyDiContainer();
        container.register(First, 'First');

        const firstParam = makeConstructorDependencyProxy<any>(
            container,
            'First'
        );

        expect('name' in firstParam).is.true;
    });

    it('errorfor unknon depndency', () => {
        const container = new ProxyDiContainer();

        const contstructorParamProxy = makeConstructorDependencyProxy<any>(
            container,
            'unknown'
        );

        expect(() => {
            contstructorParamProxy.anyParam;
        }).toThrowError('Unknown dependency');
    });
});
