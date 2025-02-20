import { ContainerSettings } from './types';

export const DEFAULT_SETTINGS: Required<ContainerSettings> = {
    allowRegisterAnything: false,
    allowRewriteDependencies: false,
};

export const TESTS_SETTINGS: Required<ContainerSettings> = {
    allowRegisterAnything: false,
    allowRewriteDependencies: true,
};
