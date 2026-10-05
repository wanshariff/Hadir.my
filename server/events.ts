import events from './events.generated.json';

export interface ServerEvent { maxPax: number; hostKeyHash: string }

export function getServerEvent(slug: unknown): ServerEvent | undefined {
  if (typeof slug !== 'string' || !Object.hasOwn(events, slug)) return undefined;
  return (events as Record<string, ServerEvent>)[slug];
}
