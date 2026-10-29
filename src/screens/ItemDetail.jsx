import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Chip, Photo } from "../components/Bits.jsx";
import { COLOR_NAMES, KIND_LABEL, KINDS, MATERIALS, OCCASIONS, PATTERNS, SEASONS } from "../lib/constants.js";
import { useWardrobe } from "../store.jsx";

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const wardrobe = useWardrobe();
  const item = wardrobe.items.find((row) => String(row.id) === id);
  const [confirm, setConfirm] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [name, setName] = useState("");
  const [typeName, setTypeName] = useState("");
  const [notes, setNotes] = useState("");
  const [price, setPrice] = useState("");
  if (item && draftId !== item.id) {
    setDraftId(item.id);
    setName(item.name || "");
    setTypeName(item.type || "");
    setNotes(item.notes || "");
    setPrice(item.price ? String(item.price) : "");
  }
  if (!wardrobe.booted) return <p>Opening…</p>;
  if (!item) return <p>That piece is gone.</p>;

  const patch = (next) => wardrobe.updateItem(item.id, next);
  const toggle = (list, value) => ((list || []).includes(value) ? (list || []).filter((v) => v !== value) : [...(list || []), value]);

  return (
    <section className="stack">
      <Link to="/closet">Back to closet</Link>
      {item.needsSheet ? <div className="banner">The background is a room. <Link to="/add">Retake on a bedsheet</Link> for a clean cutout.</div> : null}
      <Photo className="detail-photo" blob={item.imageBlob || item.thumbBlob} alt={item.name} />
      <h1>{item.name}</h1>
      <p className="muted">
        Worn {item.timesWorn || 0} times
        {item.price && item.timesWorn ? ` · ₹${Math.round(Number(item.price) / item.timesWorn)} a wear` : ""}
        {item.lastWornAt ? ` · last ${new Date(item.lastWornAt).toLocaleDateString()}` : " · never worn"}
        {item.laundry ? " · in the wash" : ""}
        {item.status === "pending_analysis" ? " · Waiting for tags" : ""}
        {item.status === "needs_review" ? " · Check tags" : ""}
        {item.advice ? ` · ${item.advice}` : ""}
      </p>
      <Link className="btn primary" to={`/?with=${item.id}`}>Wear with this</Link>
      <input
        className="field"
        value={name}
        aria-label="Name"
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          const next = name.trim() || item.name;
          setName(next);
          if (next !== item.name) patch({ name: next, status: "ready" });
        }}
      />
      <input
        className="field"
        value={typeName}
        aria-label="Type"
        placeholder="Type, such as shirt, kurta, sneakers"
        onChange={(event) => setTypeName(event.target.value)}
        onBlur={() => {
          const next = typeName.trim() || "item";
          setTypeName(next);
          if (next !== item.type) patch({ type: next });
        }}
      />
      <input
        className="field"
        value={price}
        aria-label="Price"
        inputMode="decimal"
        placeholder="Price in ₹, optional"
        onChange={(event) => setPrice(event.target.value)}
        onBlur={() => {
          const next = price.trim() === "" ? null : Number(price);
          if (next !== null && !Number.isFinite(next)) return;
          if (next !== (item.price ?? null)) patch({ price: next });
        }}
      />
      <input
        className="field"
        value={notes}
        aria-label="Notes"
        placeholder="Notes"
        onChange={(event) => setNotes(event.target.value)}
        onBlur={() => {
          if (notes !== (item.notes || "")) patch({ notes });
        }}
      />
      <div className="row">
        {COLOR_NAMES.map(([color]) => (
          <Chip key={color} active={(item.colors || []).map((name) => name.toLowerCase()).includes(color)} onClick={() => patch({ colors: toggle((item.colors || []).map((name) => name.toLowerCase()), color).slice(0, 3), status: "ready" })}>
            {color}
          </Chip>
        ))}
      </div>
      <div className="row">
        {KINDS.map((kind) => (
          <Chip key={kind} active={item.kind === kind} onClick={() => patch({ kind, status: "ready" })}>{KIND_LABEL[kind]}</Chip>
        ))}
      </div>
      <div className="row">
        {PATTERNS.map((pattern) => (
          <Chip key={pattern} active={item.pattern === pattern} onClick={() => patch({ pattern })}>{pattern}</Chip>
        ))}
      </div>
      <div className="row">
        {MATERIALS.map((material) => (
          <Chip key={material} active={item.material === material} onClick={() => patch({ material })}>{material}</Chip>
        ))}
      </div>
      <div className="row">
        {SEASONS.map((season) => (
          <Chip key={season} active={(item.seasons || []).includes(season)} onClick={() => patch({ seasons: toggle(item.seasons, season) })}>{season}</Chip>
        ))}
      </div>
      <div className="row">
        {OCCASIONS.map((occasion) => (
          <Chip key={occasion.key} active={(item.occasions || []).includes(occasion.key)} onClick={() => patch({ occasions: toggle(item.occasions, occasion.key) })}>
            {occasion.label}
          </Chip>
        ))}
      </div>
      <div className="row">
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip key={n} active={item.formality === n} onClick={() => patch({ formality: n })}>Formal {n}</Chip>
        ))}
      </div>
      <div className="row">
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip key={n} active={item.warmth === n} onClick={() => patch({ warmth: n })}>Warm {n}</Chip>
        ))}
      </div>
      <div className="row">
        <Button variant="soft" onClick={() => patch({ laundry: !item.laundry })}>
          {item.laundry ? "In the wash" : "Mark in laundry"}
        </Button>
        <Button variant="soft" onClick={() => patch({ favourite: !item.favourite })}>
          {item.favourite ? "Favourited" : "Favourite"}
        </Button>
      </div>
      {confirm ? (
        <div className="row">
          <Button variant="danger" onClick={() => wardrobe.deleteItem(item.id).then(() => navigate("/closet"))}>Delete this piece</Button>
          <Button variant="soft" onClick={() => setConfirm(false)}>Cancel</Button>
        </div>
      ) : (
        <Button variant="danger" onClick={() => setConfirm(true)}>Delete</Button>
      )}
    </section>
  );
}
