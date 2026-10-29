import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Chip } from "../components/Bits.jsx";
import ItemCard from "../components/ItemCard.jsx";
import { KINDS, KIND_LABEL, OCCASIONS, SEASONS } from "../lib/constants.js";
import { useWardrobe } from "../store.jsx";

export default function Closet() {
  const { items } = useWardrobe();
  const [kind, setKind] = useState("all");
  const [season, setSeason] = useState("all");
  const [occasion, setOccasion] = useState("all");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (season !== "all" && !(item.seasons || []).includes(season) && !(item.seasons || []).includes("all")) return false;
      if (occasion !== "all" && !(item.occasions || []).includes(occasion)) return false;
      if (!q) return true;
      return `${item.name} ${item.type} ${(item.colors || []).join(" ")}`.toLowerCase().includes(q);
    });
  }, [items, kind, season, occasion, query]);

  return (
    <section className="stack">
      <div className="hero">
        <h1>Closet</h1>
        <Link className="btn primary" to="/add">+</Link>
      </div>
      <input className="field" value={query} placeholder="Search" onChange={(event) => setQuery(event.target.value)} />
      <div className="row">
        <Chip active={kind === "all"} onClick={() => setKind("all")}>All</Chip>
        {KINDS.map((key) => (
          <Chip key={key} active={kind === key} onClick={() => setKind(key)}>{KIND_LABEL[key]}</Chip>
        ))}
      </div>
      <div className="row">
        {SEASONS.map((key) => (
          <Chip key={key} active={season === key} onClick={() => setSeason(key)}>{key}</Chip>
        ))}
        {OCCASIONS.map((item) => (
          <Chip key={item.key} active={occasion === item.key} onClick={() => setOccasion(occasion === item.key ? "all" : item.key)}>
            {item.label}
          </Chip>
        ))}
      </div>
      {shown.length ? (
        <div className="grid">
          {shown.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="muted">Nothing in this filter yet.</p>
      )}
    </section>
  );
}
