import { describe, it, expect } from 'vitest';
import { greet } from './index';

describe('greet', () => {
  it('should return greeting with name', () => {
    expect(greet('World')).toBe('Hello, World!');
  });
});