import { injectable } from '../../injectable.decorator';
import { KindomQueen } from './Queen';

@injectable(['KindomQueen'])
export class KindomKing {
    readonly name = `I'm a king`;
    constructor(public readonly queen: KindomQueen) {}
}
