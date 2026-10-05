import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameKey, normalisePhone, parseRsvp, parseTrack, parseWaitlist } from './validate.ts';

test('rsvp: attending needs pax within the cap', () => {
  assert.equal(parseRsvp({ name: 'Mak Long', status: 'hadir', pax: 3 }, 10).ok, true);
  assert.deepEqual(parseRsvp({ name: 'Mak Long', status: 'hadir', pax: 0 }, 10), { ok: false, error: 'pax' });
  assert.deepEqual(parseRsvp({ name: 'Mak Long', status: 'hadir', pax: 11 }, 10), { ok: false, error: 'pax' });
  assert.deepEqual(parseRsvp({ name: 'Mak Long', status: 'hadir', pax: 1.5 }, 10), { ok: false, error: 'pax' });
});

test('rsvp: not attending stores zero pax and keeps the doa', () => {
  const r = parseRsvp({ name: 'Tok', status: 'tak_hadir', pax: 4, message: '  Selamat pengantin baru ' }, 10);
  assert.ok(r.ok);
  assert.equal(r.value.pax, 0);
  assert.equal(r.value.message, 'Selamat pengantin baru');
});

test('rsvp: name is required and trimmed', () => {
  assert.deepEqual(parseRsvp({ name: '   ', status: 'hadir', pax: 1 }, 10), { ok: false, error: 'name' });
  const r = parseRsvp({ name: '  Aina   binti  Ali ', status: 'hadir', pax: 1 }, 10);
  assert.ok(r.ok);
  assert.equal(r.value.name, 'Aina binti Ali');
});

test('rsvp: bad status rejected', () => {
  assert.deepEqual(parseRsvp({ name: 'A', status: 'insyaallah', pax: 1 }, 10), { ok: false, error: 'status' });
});

test('phone: optional, normalised, length-checked', () => {
  assert.deepEqual(normalisePhone(''), { ok: true, value: null });
  assert.deepEqual(normalisePhone('012-345 6789'), { ok: true, value: '0123456789' });
  assert.deepEqual(normalisePhone('+60 12-345 6789'), { ok: true, value: '+60123456789' });
  assert.deepEqual(normalisePhone('123'), { ok: false, error: 'phone' });
});

test('nameKey: same person, different typing', () => {
  assert.equal(nameKey('Mak  Long'), nameKey('mak long'));
  assert.equal(nameKey("Siti Nur'aina"), nameKey('siti nur aina'));
});

test('track: drops PII-looking props and bad names', () => {
  const r = parseTrack({ name: 'rsvp_submitted', props: { slug: 'a', pax: 2, guest_name: 'X', phone: '01', email: 'e' } });
  assert.ok(r.ok);
  assert.deepEqual(r.value.props, { slug: 'a', pax: 2 });
  assert.equal(parseTrack({ name: 'DROP TABLE' }).ok, false);
});

test('waitlist: email required, price only from the test set', () => {
  assert.equal(parseWaitlist({ email: 'nope' }).ok, false);
  const r = parseWaitlist({ email: ' Sofea@Example.com ', price: 35, eventMonth: '2027-03' });
  assert.ok(r.ok);
  assert.deepEqual(r.value, { email: 'sofea@example.com', eventMonth: '2027-03', source: 'harga', price: 35 });
  const r2 = parseWaitlist({ email: 'a@b.co', price: 99 });
  assert.ok(r2.ok);
  assert.equal(r2.value.price, null);
});
