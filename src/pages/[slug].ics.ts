import type { APIRoute } from 'astro';
import { events, type HadirEvent } from '../lib/events';
import { eventCopy } from '../lib/copy';

// Served only to iOS, where .ics opens the native "Add to Calendar" sheet instead of downloading.
export function getStaticPaths() {
  return events.map((event) => ({ params: { slug: event.slug }, props: { event } }));
}

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');

export const GET: APIRoute = ({ props }) => {
  const e = props.event as HadirEvent;
  const title = `${eventCopy[e.type][e.lang].title}: ${e.hostNames}`;
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hadir.my//invite//MS', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.slug}@hadir.my`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(e.startsAt)}`,
    `DTEND:${stamp(e.endsAt)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(`${e.venue.name}, ${e.venue.address}`)}`,
    `GEO:${e.venue.lat};${e.venue.lng}`,
    `URL:https://hadir.my/${e.slug}`,
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
  return new Response(body, { headers: { 'content-type': 'text/calendar; charset=utf-8' } });
};
