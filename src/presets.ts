import { ProxyDiSettings } from './types';

export const DEFAULT_SETTINGS: Required<ProxyDiSettings> = {
    allowRegisterAnythingAsInstance: false,
    allowRewriteServices: false,
};

export const TESTS_SETTINGS: Required<ProxyDiSettings> = {
    allowRegisterAnythingAsInstance: false,
    allowRewriteServices: true,
};
