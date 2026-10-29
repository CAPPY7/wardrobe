import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { OCCASION_MAP } from "../lib/constants.js";
import { closetReport } from "../lib/outfits.js";
import { Photo } from "../components/Bits.jsx";
import { weatherFor } from "../lib/weather.js";
import { useWardrobe } from "../store.jsx";

function dateKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export default function History() {
  const wardrobe = useWardrobe();
  const { wearLog, items, feedback, settings, online } = wardrobe;
  const [cursor, setCursor] = useState(() => new Date());
  const [picked, setPicked] = useState(dateKey(new Date()));
  const weather = weatherFor(settings || {}, online);
  const liked = feedback.filter((row) => row.verdict === "like");
  const names = (ids) => ids.map((id) => items.find((row) => String(row.id) === String(id))?.name).filter(Boolean).join(" + ");
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  const byDay = useMemo(() => {
    const map = new Map();
    for (const entry of wearLog) {
      const list = map.get(entry.date) || [];
      list.push(entry);
      map.set(entry.date, list);
    }
    return map;
  }, [wearLog]);
  const report = useMemo(() => closetReport(items, weather), [items, weather.temp, weather.rain]);
  const never = items.filter((item) => !item.timesWorn && !item.laundry);
  const selected = byDay.get(picked) || [];

  return (
    <section className="stack">
      <div className="hero">
        <h1>History</h1>
        <div className="row">
          <button className="btn soft" type="button" onClick={() => setCursor(new Date(year, month - 1, 1))}>Prev</button>
          <strong>{first.toLocaleString(undefined, { month: "long", year: "numeric" })}</strong>
          <button className="btn soft" type="button" onClick={() => setCursor(new Date(year, month + 1, 1))}>Next</button>
        </div>
      </div>
      <div className="month">
        {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
          <small key={`${label}${index}`} className="muted">{label}</small>
        ))}
        {cells.map((day, index) => {
          if (!day) return <span key={`e${index}`} />;
          const key = `${year}-${month + 1}-${day}`;
          const entry = (byDay.get(key) || [])[0];
          const piece = entry ? items.find((item) => item.id === entry.itemIds?.[0]) : null;
          return (
            <button key={key} type="button" className={`day ${picked === key ? "on" : ""}`} onClick={() => setPicked(key)}>
              <small>{day}</small>
              {piece ? <Photo blob={piece.thumbBlob || piece.imageBlob} className="dot" alt="" /> : null}
            </button>
          );
        })}
      </div>
      {selected.length ? selected.map((entry) => (
        <article key={entry.id} className="card">
          <strong>{entry.date}</strong>
          <p className="muted">{OCCASION_MAP[entry.occasion]?.label || entry.occasion}</p>
          <p>{names(entry.itemIds || [])}</p>
        </article>
      )) : <p className="muted">Nothing logged on this day.</p>}

      <h2>Closet report</h2>
      {report.map((row) => (
        <p key={row.occasion}>
          <strong>{OCCASION_MAP[row.occasion]?.label || row.occasion}</strong>
          {" · "}{row.status}
          {row.missing ? ` · ${row.missing}` : ` · ${row.count} looks`}
        </p>
      ))}

      <h2>Never worn</h2>
      {never.length === 0 ? <p className="muted">Every piece has been worn at least once.</p> : null}
      <div className="row">
        {never.map((item) => (
          <Link key={item.id} to={`/item/${item.id}`}>{item.name}</Link>
        ))}
      </div>

      <h2>Liked</h2>
      {liked.length === 0 ? <p className="muted">Hearts you tap show up here.</p> : null}
      {liked.map((row) => (
        <p key={row.id} className="muted">
          {names(String(row.comboKey).split("-")) || "Removed pieces"} · {row.at ? new Date(row.at).toLocaleDateString() : ""}
        </p>
      ))}
    </section>
  );
}