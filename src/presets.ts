import { ContainerSettings } from './types';

export const DEFAULT_SETTINGS: Required<ContainerSettings> = {
    allowRegisterAnything: false,
    allowRewriteDependencies: false,
    resolveInContainerContext: false,
};
