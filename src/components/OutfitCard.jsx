import { Photo, Button } from "./Bits.jsx";

export default function OutfitCard({ outfit, note, onWear, onSkip, onLike }) {
  return (
    <article className="card stack">
      <div className="outfit-photos">
        {outfit.items.map((item) => (
          <Photo key={item.id} blob={item.thumbBlob || item.imageBlob} className="piece" alt={item.name} />
        ))}
      </div>
      <div>
        <strong>{outfit.items.map((item) => item.name).join(" + ")}</strong>
        <p className="muted">{note || outfit.reason}</p>
      </div>
      <div className="row">
        <Button onClick={onWear}>Wear this</Button>
        <Button variant="soft" onClick={onSkip}>Skip</Button>
        <Button variant="soft" onClick={onLike}>Heart</Button>
      </div>
    </article>
  );
}
