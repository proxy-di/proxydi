import { describe, it, expect } from 'vitest';
import {
    injectable,
    inject,
    injectAll,
    ProxyDiContainer,
    ON_CONTAINERIZED,
    middleware,
    MiddlewareContext,
} from '../index';

describe('README Proposal Examples', () => {
    describe('Part 1: Core Concepts', () => {
        it('Your First Dependency', () => {
            @injectable()
            class Hamlet {
                speak() {
                    return 'To be, or not to be';
                }
            }

            const production = new ProxyDiContainer();
            const hamlet = production.resolve(Hamlet);

            expect(hamlet.speak()).toBe('To be, or not to be');
        });

        it('Dependencies Referencing Each Other', () => {
            @injectable()
            class OpheliaRef {
                respond() {
                    return 'My lord, I have remembrances of yours';
                }
            }

            @injectable()
            class HamletRef {
                @inject(OpheliaRef) ophelia: OpheliaRef;

                speakTo() {
                    return `Hamlet: "Are you fair?" | Ophelia: "${this.ophelia.respond()}"`;
                }
            }

            const production = new ProxyDiContainer();
            const hamlet = production.resolve(HamletRef);

            expect(hamlet.speakTo()).toBe(
                'Hamlet: "Are you fair?" | Ophelia: "My lord, I have remembrances of yours"'
            );
        });

        it('Circular Dependencies', () => {
            @injectable('OpheliaCirc')
            class OpheliaCirc {
                @inject('HamletCirc') hamlet: any;

                respond() {
                    return `My lord ${this.hamlet.getName()}`;
                }
            }

            @injectable('HamletCirc')
            class HamletCirc {
                @inject('OpheliaCirc') ophelia: OpheliaCirc;

                getName() {
                    return 'Hamlet';
                }

                speakTo() {
                    return `Ophelia says: "${this.ophelia.respond()}"`;
                }
            }

            const production = new ProxyDiContainer();
            const hamlet = production.resolve<HamletCirc>('HamletCirc');

            expect(hamlet.speakTo()).toBe('Ophelia says: "My lord Hamlet"');
        });

        it('Hierarchical Containers', () => {
            class Director {
                constructor(public name: string) {}
            }

            @injectable()
            class HamletBrochure {
                @inject(Director) director: Director;

                print() {
                    return `Hamlet - Directed by ${this.director.name}`;
                }
            }

            const theater = new ProxyDiContainer();
            theater.register(new Director('John Smith'));

            const hamletProduction = theater.createChildContainer();
            const brochure = hamletProduction.resolve(HamletBrochure);

            expect(brochure.print()).toBe('Hamlet - Directed by John Smith');
        });

        it('Inject Multiple Instances', () => {
            interface Role {
                line(): string;
            }

            class Hamlet implements Role {
                line() {
                    return 'To be, or not to be';
                }
            }

            class Ophelia implements Role {
                line() {
                    return 'My lord, I have remembrances of yours';
                }
            }

            class Actor {
                @inject('role') role: Role;

                constructor(public readonly name: string) {}

                sayLine() {
                    return `${this.name}: "${this.role.line()}"`;
                }
            }

            @injectable()
            class Director {
                @injectAll(Actor) actors: Actor[];

                rehearse() {
                    return this.actors.map((actor) => actor.sayLine());
                }
            }

            const production = new ProxyDiContainer();
            const director = production.resolve(Director);

            const olivierContainer = production.createChildContainer();
            olivierContainer.register(new Hamlet(), 'role');
            olivierContainer.register(new Actor('Laurence Olivier'));

            const bloomContainer = production.createChildContainer();
            bloomContainer.register(new Ophelia(), 'role');
            bloomContainer.register(new Actor('Claire Bloom'));

            const lines = director.rehearse();
            expect(lines).toEqual([
                'Laurence Olivier: "To be, or not to be"',
                'Claire Bloom: "My lord, I have remembrances of yours"',
            ]);
        });
    });

    describe('Part 2: Technical Details', () => {
        it('Container Settings', () => {
            const container = new ProxyDiContainer({
                allowRegisterAnything: false,
                allowRewriteDependencies: false,
                resolveInContainerContext: false,
            });

            expect(container.settings.allowRegisterAnything).toBe(false);
            expect(container.settings.allowRewriteDependencies).toBe(false);
            expect(container.settings.resolveInContainerContext).toBe(false);
        });

        it('Custom Dependency IDs - Multiple instances', () => {
            @injectable()
            class StageCustomIds {
                setup() {
                    return 'Castle';
                }
            }

            class HamletCustomIds {
                @inject('stage') stage: StageCustomIds;

                constructor(public readonly interpretation: string) {}
            }

            const production = new ProxyDiContainer();

            const traditionalHamlet = production.register(
                new HamletCustomIds('traditional'),
                'traditionalHamlet'
            );
            const modernHamlet = production.register(
                new HamletCustomIds('modern'),
                'modernHamlet'
            );

            expect(traditionalHamlet.interpretation).toBe('traditional');
            expect(modernHamlet.interpretation).toBe('modern');
        });

        it('Custom Dependency IDs - Register without @injectable', () => {
            class StageRegister {
                setup() {
                    return 'Castle';
                }
            }

            const production = new ProxyDiContainer();
            production.register(StageRegister, 'stage');

            const stage = production.resolve<StageRegister>('stage');
            expect(stage.setup()).toBe('Castle');
        });

        it('Custom Dependency IDs - Register instance', () => {
            class StageInstance {
                setup() {
                    return 'Castle';
                }
            }

            const production = new ProxyDiContainer();
            production.register(new StageInstance(), 'stage');

            const stage = production.resolve<StageInstance>('stage');
            expect(stage.setup()).toBe('Castle');
        });

        it('Performance and Baking - Auto-baking', () => {
            @injectable()
            class OpheliaBaking {
                respond() {
                    return 'My lord';
                }
            }

            @injectable()
            class HamletBaking {
                @inject(OpheliaBaking) ophelia: OpheliaBaking;
            }

            const theater = new ProxyDiContainer();
            const hamlet = theater.resolve(HamletBaking);

            expect(hamlet.ophelia.respond()).toBe('My lord');
            expect(hamlet.ophelia.respond()).toBe('My lord');
        });

        it('Performance and Baking - Manual baking', () => {
            @injectable()
            class OpheliaManualBake {
                respond() {
                    return 'My lord';
                }
            }

            @injectable()
            class HamletManualBake {
                @inject(OpheliaManualBake) ophelia: OpheliaManualBake;
            }

            const theater = new ProxyDiContainer();
            theater.resolve(HamletManualBake);

            theater.bakeInjections();

            expect(theater.settings.allowRewriteDependencies).toBe(false);
        });

        it('ON_CONTAINERIZED lifecycle hook', () => {
            let called = false;

            @injectable()
            class ActorLifecycle {
                private script: string = '';

                [ON_CONTAINERIZED](container: ProxyDiContainer) {
                    this.script = 'Hamlet script loaded';
                    called = true;
                }

                getScript() {
                    return this.script;
                }
            }

            const theater = new ProxyDiContainer();
            const actor = theater.resolve(ActorLifecycle);

            expect(called).toBe(true);
            expect(actor.getScript()).toBe('Hamlet script loaded');
        });

        it('Middleware System', () => {
            const events: string[] = [];

            @middleware()
            @injectable()
            class LoggingMiddlewareTest {
                onRegister(context: MiddlewareContext<any>) {
                    events.push(`Registered: ${String(context.dependencyId)}`);
                }

                onResolve(context: MiddlewareContext<any>) {
                    events.push(`Resolved: ${String(context.dependencyId)}`);
                    return context;
                }

                onRemove(context: MiddlewareContext<any>) {
                    events.push(`Removed: ${String(context.dependencyId)}`);
                }
            }

            @injectable()
            class HamletMiddleware {}

            const theater = new ProxyDiContainer();
            theater.resolve(LoggingMiddlewareTest);

            theater.register(HamletMiddleware, 'hamlet');
            theater.resolve('hamlet');

            expect(events).toContain('Registered: hamlet');
            expect(events).toContain('Resolved: hamlet');
        });

        it('Container Context Resolution - default behavior', () => {
            class StageContextDefault {
                constructor(public readonly name: string = 'Stage') {}

                setup() {
                    return this.name;
                }
            }

            @injectable()
            class DirectorContextDefault {
                @inject('stage') stage: StageContextDefault;

                checkStage() {
                    return this.stage.setup();
                }
            }

            const mainProduction = new ProxyDiContainer();
            mainProduction.register(
                new StageContextDefault('Main stage'),
                'stage'
            );

            const rehearsal = mainProduction.createChildContainer();
            rehearsal.register(
                new StageContextDefault('Rehearsal stage'),
                'stage'
            );

            const director = rehearsal.resolve(DirectorContextDefault);
            expect(director.checkStage()).toBe('Rehearsal stage');
        });

        it('Container Context Resolution - with resolveInContainerContext', () => {
            @injectable()
            class ProductionInfo {
                name = 'Hamlet';
                date = '2024-03-15';
            }

            @injectable()
            class DirectorContextResolution {
                @inject(ProductionInfo) production: ProductionInfo;

                announce() {
                    return `I'm directing ${this.production.name} on ${this.production.date}`;
                }
            }

            const theater = new ProxyDiContainer({
                resolveInContainerContext: true,
            });
            theater.register(DirectorContextResolution);

            const hamletProduction = theater.createChildContainer();
            hamletProduction.register(ProductionInfo);

            const director = hamletProduction.resolve(
                DirectorContextResolution
            );
            expect(director.announce()).toBe(
                "I'm directing Hamlet on 2024-03-15"
            );
        });
    });
});
