import { Photo, Button } from "./Bits.jsx";

const ORDER = { top: 0, ethnic: 0, one_piece: 0, bottom: 1, layer: 2, footwear: 3, bag: 4, watch: 5, accessory: 6, other: 7 };

export default function OutfitCard({ outfit, note, onWear, onSkip, onLike, worn }) {
  const ordered = [...outfit.items].sort((a, b) => (ORDER[a.kind] ?? 9) - (ORDER[b.kind] ?? 9));
  return (
    <article className="card stack">
      <div className="look">
        {ordered.map((item) => (
          <Photo key={item.id} blob={item.thumbBlob || item.imageBlob} className="piece" alt={item.name} />
        ))}
      </div>
      <div>
        <strong>{ordered.map((item) => item.name).join(" + ")}</strong>
        <p className="muted">{note || outfit.reason}</p>
      </div>
      <div className="row">
        <Button onClick={onWear} disabled={worn}>{worn ? "Worn" : "Wear this"}</Button>
        <Button variant="soft" onClick={onSkip}>Skip</Button>
        <Button variant="soft" onClick={onLike}>Heart</Button>
      </div>
    </article>
  );
}