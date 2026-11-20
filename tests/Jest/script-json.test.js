import { toScriptJson } from '../../src/utils/script-json.js';

describe('toScriptJson', () => {
  it('escapes every "<", so the JSON cannot close the script it sits in', () => {
    expect(toScriptJson({ name: '</script><!--' })).toBe('{"name":"\\u003c/script>\\u003c!--"}');
  });

  it('still describes the same data', () => {
    const data = [{ id: 'c1', name: 'Berlin <Mitte>', neighborhoods: [{ id: 'n1', name: 'A & B' }] }];

    expect(JSON.parse(toScriptJson(data))).toEqual(data);
  });
});
