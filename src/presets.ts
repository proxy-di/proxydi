import { ProxyDISettings } from './types';

export const DEFAULT_SETTINGS: Required<ProxyDISettings> = {
    allowRegisterAnythingAsInstance: false,
    allowRewriteClasses: false,
    allowRewriteInstances: false,
};

export const TESTS_SETTINGS: Required<ProxyDISettings> = {
    allowRegisterAnythingAsInstance: false,
    allowRewriteClasses: true,
    allowRewriteInstances: true,
};
