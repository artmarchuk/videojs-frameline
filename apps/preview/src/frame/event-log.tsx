/**
 * Development tool, shown only with `?debug`: the events the skin emits, newest first. `frame:change` fires on every
 * frame, so repeats of the same event are folded into the newest line.
 */
export default function EventLog({ events }: { events: string[] }) {
  const folded: { name: string; line: string; count: number }[] = [];
  for (const line of events) {
    const name = line.slice(0, line.indexOf(' '));
    const last = folded[folded.length - 1];
    if (last && last.name === name && name === 'frame:change') last.count += 1;
    else folded.push({ name, line, count: 1 });
  }

  return (
    <section className="preview-log" aria-label="Skin events (development)">
      <h2>Events</h2>
      {folded.length === 0 && <p>None yet. Set a range, select a marker, copy a link.</p>}
      <ol data-event-log>
        {folded.slice(0, 8).map((entry, index) => (
          <li key={`${index}-${entry.line}`}>
            {entry.line}
            {entry.count > 1 ? ` (+${entry.count - 1} more)` : ''}
          </li>
        ))}
      </ol>
    </section>
  );
}
