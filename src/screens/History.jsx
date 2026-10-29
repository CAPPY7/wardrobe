import { OCCASION_MAP } from "../lib/constants.js";
import { Photo } from "../components/Bits.jsx";
import { useWardrobe } from "../store.jsx";

export default function History() {
  const { wearLog, items, feedback, outfits } = useWardrobe();
  const liked = feedback.filter((row) => row.verdict === "like");
  return (
    <section className="stack">
      <h1>History</h1>
      {wearLog.length === 0 ? <p className="muted">Nothing worn yet. Use Wear this on Today.</p> : null}
      {wearLog.map((entry) => (
        <article key={entry.id} className="card">
          <strong>{entry.date}</strong>
          <p className="muted">{OCCASION_MAP[entry.occasion]?.label || entry.occasion}</p>
          <div className="outfit-photos">
            {entry.itemIds.map((id) => {
              const item = items.find((row) => row.id === id);
              return item ? <Photo key={id} blob={item.thumbBlob || item.imageBlob} className="piece" alt={item.name} /> : null;
            })}
          </div>
        </article>
      ))}
      <h2>Liked</h2>
      {liked.length === 0 ? <p className="muted">Hearts you tap show up here.</p> : null}
      {liked.map((row) => (
        <p key={row.id} className="muted">
          {row.comboKey} · {new Date(row.at).toLocaleDateString()}
          {outfits.length ? "" : ""}
        </p>
      ))}
    </section>
  );
}
