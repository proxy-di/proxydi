import { injectable } from '../../src';
import { KindomKing } from './King';

@injectable(['KindomKing'])
export class KindomQueen {
    readonly name = `I'm a queen`;
    constructor(public readonly king: KindomKing) {}
}
