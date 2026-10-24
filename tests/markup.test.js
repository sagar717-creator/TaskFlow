import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync('app/static/js/app.js', 'utf8');

describe('markup sanity', () => {
  it('has no tag glued to its first attribute', () => {
    expect(src.match(/<(div|span|button|section|article|label|input|select|textarea|canvas|a|i|p|td|tr|th|h1|h2)(class|id|style|data-[a-z-]+|aria-[a-z-]+)=/g)).toBeNull();
  });
  it('has no attribute glued to the previous one', () => {
    expect(src.match(/"(class|id|style|data-[a-z-]+|aria-[a-z-]+)=/g)).toBeNull();
  });
});