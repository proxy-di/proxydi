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
        container.register(Agent007, 'role');

        const actor = container.resolve(Actor);

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
        container.register(Agent007, 'Role');
        container.register(Actor, 'Actor');

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
        container.register(Actor, 'Actor');
        container.register(Director, 'Director');
        container.register(Agent007, 'Role');

        const actor = container.resolve<Actor>('Actor');
        expect(actor.play()).equal('Bond... James Bond!');
    });

    it('Hierarchy of containers', () => {
        class GameLevel {
            constructor(public readonly settings: { undewater: boolean }) {}
        }

        class Character {
            public health = 100;
            private onHiters: any[] = [];

            on(_event: string, callback: () => void) {
                this.onHiters.push(callback);
            }

            hit(abount: number) {
                this.health -= abount;
                this.onHiters.forEach((callback) => callback());
            }
        }

        class UnderwaterShield {
            @inject('level') private level: GameLevel;
            @inject('character') private character: Character;

            constructor(private amount: number) {}

            init() {
                this.character.on('hit', this.act);
            }

            act = () =>
                this.level.settings.undewater &&
                (this.character.health += this.amount);
        }

        const tutorialContainer = new ProxyDiContainer();
        tutorialContainer.register(new GameLevel({ undewater: true }), 'level');

        const heroContainer = tutorialContainer.createChildContainer();
        const hero = heroContainer.register<Character>(Character, 'character');

        const perksContainer = heroContainer.createChildContainer();
        const perk = perksContainer.register(new UnderwaterShield(10), 'perk');
        perk.init();

        expect(hero.health).equal(100);

        hero.hit(10);
        expect(hero.health).equal(100);

        hero.hit(20);
        expect(hero.health).equal(90);
    });
});
