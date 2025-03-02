import { describe, it, expect } from 'vitest';
import { injectable, inject, ProxyDiContainer, resolveAll } from '../src';

describe('README', () => {
    it('Quick start', () => {
        interface Character {
            greet(): string;
        }

        @injectable()
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

    it('Kindom', () => {
        @injectable(['Queen'])
        class King {
            name: string = `I'm a king`;
            constructor(public readonly queen: Queen) {
                queen.name = `I'm a king's queen`;
            }
        }

        @injectable(['King'])
        class Queen {
            name: string = `I'm a queen`;
            constructor(public readonly king: King) {
                // king.name = `I'm a queen's king`;
            }
        }

        const container = new ProxyDiContainer();

        const king = container.resolve(King);
        const queen = container.resolve(Queen);

        expect(king.queen.name).equal(`I'm a king's queen`);
        expect(queen.king.name).equal(`I'm a king`);
        // TODO: Make it work
        // expect(queen.king.name).equal(`I'm a queen's king`);
    });

    it('Hierarchy of containers', () => {
        class GameLevel {
            constructor(public readonly settings: { undewater: boolean }) {}
        }

        interface Perk {
            activate(): void;
        }

        class Character {
            public health = 100;

            hit(abount: number) {
                this.health -= abount;

                const perks = resolveAll<Perk>(this, 'perk');
                perks.forEach((perk) => perk.activate());
            }
        }

        class UnderwaterShield {
            @inject('level') private level: GameLevel;
            @inject('character') private character: Character;

            constructor(private amount: number) {}

            activate = () =>
                this.level.settings.undewater &&
                (this.character.health += this.amount);
        }

        const tutorialContainer = new ProxyDiContainer();
        tutorialContainer.register(new GameLevel({ undewater: true }), 'level');

        const heroContainer = tutorialContainer.createChildContainer();
        const hero = heroContainer.register<Character>(Character, 'character');

        const perksContainer = heroContainer.createChildContainer();
        perksContainer.register(new UnderwaterShield(10), 'perk');

        expect(hero.health).equal(100);

        hero.hit(10);
        expect(hero.health).equal(100);

        hero.hit(20);
        expect(hero.health).equal(90);
    });
});
