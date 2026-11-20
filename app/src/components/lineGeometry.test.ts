import { describe, expect, it } from 'vitest';
import { bridgeBackPath, bridgeTenPath, buildArcs, divisionPath, multiplicationPath, xOf } from './lineGeometry';

describe('number line geometry', () => {
  it('places 0 and 20 inside the 1232px line', () => {
    expect(xOf(0)).toBe(36);
    expect(xOf(20)).toBe(1196);
  });

  it('builds forward arcs for 3 × 4', () => {
    const arcs = buildArcs(multiplicationPath(3, 4));
    expect(arcs.map((a) => a.label)).toEqual(['+3', '+3', '+3', '+3']);
    expect(arcs[0]).toMatchObject({ from: 0, to: 3, left: 36, width: 174, forward: true });
  });

  it('builds backward arcs for 12 : 3 with a jump counter', () => {
    const path = divisionPath(12, 3);
    expect(path).toEqual([12, 9, 6, 3, 0]);
    const arcs = buildArcs(path, 'count');
    expect(arcs.map((a) => a.label)).toEqual(['1', '2', '3', '4']);
    expect(arcs.every((a) => !a.forward)).toBe(true);
  });

  it('rejects division with a remainder', () => {
    expect(() => divisionPath(13, 3)).toThrow();
  });

  it('bridges through ten', () => {
    expect(bridgeTenPath(7, 8)).toEqual([7, 10, 15]);
    expect(bridgeTenPath(6, 3)).toEqual([6, 9]);
    expect(bridgeTenPath(10, 5)).toEqual([10, 15]);
    expect(buildArcs(bridgeTenPath(7, 8)).map((a) => a.label)).toEqual(['+3', '+5']);
  });

  it('bridges back through ten', () => {
    expect(bridgeBackPath(13, 6)).toEqual([13, 10, 7]);
    expect(bridgeBackPath(12, 2)).toEqual([12, 10]);
    expect(bridgeBackPath(8, 3)).toEqual([8, 5]);
    expect(buildArcs(bridgeBackPath(13, 6)).map((a) => a.label)).toEqual(['−3', '−3']);
  });

  it('drops points off the line and zero-length jumps', () => {
    expect(buildArcs([0, 5, 5, 25])).toHaveLength(1);
  });
});
