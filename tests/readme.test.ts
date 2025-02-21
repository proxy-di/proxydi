import { describe, it, expect } from 'vitest';
import { autoInjectable, inject, ProxyDiContainer } from '../src';

describe('README', () => {
    it('Quick start', () => {
        interface Character {
            greet(): string;
        }

        @autoInjectable()
        class Actor {
            @inject() role: Character;

            play = () => this.role.greet();
        }

        class Agent007 implements Character {
            greet = () => 'Bond... James Bond';
        }

        const container = new ProxyDiContainer();
        container.registerDependency(Agent007, 'role');

        const actor = container.resolveAutoInjectable(Actor);

        expect(actor.play()).equal('Bond... James Bond');
    });

    it("Quick start with ID's", () => {
        interface Character {
            greet(): string;
        }
        class Actor {
            @inject('Role') role: Character;

            play = () => this.role.greet();
        }

        class Agent007 implements Character {
            greet = () => 'Bond... James Bond';
        }

        const container = new ProxyDiContainer();
        container.registerDependency(Agent007, 'Role');
        container.registerDependency(Actor, 'Actor');

        const actor = container.resolve<Actor>('Actor');

        expect(actor.play()).equal('Bond... James Bond');
    });

    it('Circular dependencies with actor/director example', () => {
        interface Character {
            greet(): string;
        }

        class Director {
            @inject('Actor') private actor: Actor;
            private passionLevel = 1;

            direct(line: string) {
                return this.actor.perform(line, this.passionLevel);
            }
        }

        class Actor {
            @inject('Role') private role: Character;
            @inject('Director') private director: Director;

            play() {
                const line = this.role.greet();
                // Here actor asks director how to perform the line
                return this.director.direct(line);
            }

            perform(line: string, loudness: number = 0) {
                return line + '!'.repeat(loudness);
            }
        }

        class Agent007 implements Character {
            greet = () => 'Bond... James Bond';
        }

        const container = new ProxyDiContainer();
        container.registerDependency(Actor, 'Actor');
        container.registerDependency(Director, 'Director');
        container.registerDependency(Agent007, 'Role');

        const actor = container.resolve<Actor>('Actor');
        expect(actor.play()).equal('Bond... James Bond!');
    });
});
