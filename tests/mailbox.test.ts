import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mailboxLines } from '../src/protocol.js';
import { extractResp, extractSessionHex } from '../src/prefs.js';

// Shape of a Resolve 21.1.2 OTIO export (measured 2026-10-28): the marker note sits in metadata.Resolve_OTIO.Note.
function otio(notes: Record<string, string>): string {
  const markers = Object.entries(notes).map(([name, note]) => ({
    OTIO_SCHEMA: 'Marker.2',
    metadata: { Resolve_OTIO: { Keywords: [], Note: note } },
    name,
    color: 'BLUE',
  }));
  return JSON.stringify({ OTIO_SCHEMA: 'Timeline.1', name: '__claude_bridge__', tracks: { OTIO_SCHEMA: 'Stack.1', children: [], markers } });
}

test('mailboxLines returns the RLB marker note only', () => {
  const text = otio({ RLB: 'RLBSession = "aa"\nRLBResp = "id1:bb"', LOG: 'ignored' });
  assert.equal(mailboxLines(text), 'RLBSession = "aa"\nRLBResp = "id1:bb"');
});

test('mailboxLines is empty for a half-written file', () => {
  assert.equal(mailboxLines('{"OTIO_SCHEMA": "Timeline.1", "tra'), '');
});

test('the prefs parsers read the mailbox lines and the mailbox wins', () => {
  const channel = `RLBResp = "old:00"\nRLBSession = "11"\n${mailboxLines(otio({ RLB: 'RLBSession = "22"\nRLBResp = "new:ff"' }))}`;
  assert.deepEqual(extractResp(channel), { id: 'new', hex: 'ff' });
  assert.equal(extractSessionHex(channel), '22');
});
