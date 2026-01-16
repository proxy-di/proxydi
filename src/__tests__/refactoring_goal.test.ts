import { describe, it, expect } from 'vitest';
import {
    ProxyDiContainer,
    injectable,
    injectAll,
    ResolveScope,
    inject,
    DuplicateStrategy,
} from '../index';

interface AgentHook {
    handle(): string;
}

const AGENT_HOOKS_HANDLER = Symbol('AGENT_HOOKS_HANDLER');
class AgentService {
    @injectAll(
        AGENT_HOOKS_HANDLER,
        ResolveScope.Children | ResolveScope.Current
    )
    public handlers!: AgentHook[];

    @inject(AGENT_HOOKS_HANDLER) public fitrstHandler!: AgentHook;
}

@injectable(AGENT_HOOKS_HANDLER)
class AgentHookOne implements AgentHook {
    handle(): string {
        return 'hook one';
    }
}

class AgentHookTwo implements AgentHook {
    handle(): string {
        return 'hook two';
    }
}

@injectable(AGENT_HOOKS_HANDLER)
class AgentHookThree implements AgentHook {
    handle(): string {
        return 'hook three';
    }
}

describe('refactoring full case', () => {
    it('should work with multiple instances from multiple containers', () => {
        class Hook2Client {
            @inject(AgentHookTwo, ResolveScope.Children)
            public hook2!: AgentHookTwo;
        }

        const container = new ProxyDiContainer();
        container.register(AgentService);
        container.register(AgentHookOne);
        container.register(Hook2Client);

        const childContainer = container.createChildContainer();
        childContainer.register(AgentHookTwo, {
            dependencyId: [AGENT_HOOKS_HANDLER],
            duplicateStrategy: DuplicateStrategy.AlwaysAdd,
        });
        childContainer.register(AgentHookThree, {
            dependencyId: [AGENT_HOOKS_HANDLER],
            duplicateStrategy: DuplicateStrategy.AlwaysAdd,
        });

        const agentService = childContainer.resolve(AgentService);
        expect(agentService.handlers.length).toEqual(3);
        const results = agentService.handlers.map((h) => h.handle());
        expect(results).toContain('hook one');
        expect(results).toContain('hook two');
        expect(results).toContain('hook three');

        expect(agentService.fitrstHandler.handle()).toEqual('hook one');

        const hookClient = container.resolve(Hook2Client);
        expect(hookClient.hook2.handle()).toEqual('hook two');
    });

    it('should throw error', () => {
        class Hook2Client {
            @inject(AgentHookTwo)
            public hook2!: AgentHookTwo;
        }

        const container = new ProxyDiContainer();
        container.register(AgentService);
        container.register(AgentHookOne);
        container.register(Hook2Client);

        const childContainer = container.createChildContainer();
        childContainer.register(AgentHookTwo, {
            dependencyId: [AGENT_HOOKS_HANDLER],
            duplicateStrategy: DuplicateStrategy.AlwaysAdd,
        });
        childContainer.register(AgentHookThree, {
            dependencyId: [AGENT_HOOKS_HANDLER],
            duplicateStrategy: DuplicateStrategy.AlwaysAdd,
        });

        const agentService = childContainer.resolve(AgentService);
        expect(agentService.handlers.length).toEqual(3);
        const results = agentService.handlers.map((h) => h.handle());
        expect(results).toContain('hook one');
        expect(results).toContain('hook two');
        expect(results).toContain('hook three');

        expect(agentService.fitrstHandler.handle()).toEqual('hook one');

        const hookClient = container.resolve(Hook2Client);
        expect(() => hookClient.hook2.handle()).toThrowError(
            'Unknown dependency: AgentHookTwo'
        );
    });
});
