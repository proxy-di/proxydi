import { describe, it, expect } from 'vitest';
import { autoInjectableService, inject, ProxyDiContainer } from '../src';

describe('README', () => {
    it('Quick start', () => {
        interface Character {
            greet(): string;
        }

        @autoInjectableService()
        class Actor {
            @inject() role: Character;

            greet = () => this.role.greet();
        }

        class Agent007 implements Character {
            greet = () => 'Bond... James Bond';
        }

        const container = new ProxyDiContainer();
        container.createService('role', Agent007);

        const actor = container.resolveAutoInjectable(Actor);

        expect(actor.greet()).equal('Bond... James Bond');
    });
});
