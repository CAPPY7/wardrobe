import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import OutfitCard from "../components/OutfitCard.jsx";
import { Chip } from "../components/Bits.jsx";
import { OCCASIONS, OCCASION_MAP } from "../lib/constants.js";
import { closetReport, suggest } from "../lib/outfits.js";
import { stylistNote } from "../lib/ai.js";
import { WORKER_URL } from "../lib/config.js";
import { weatherFor, formatTemp } from "../lib/weather.js";
import { useWardrobe } from "../store.jsx";

export default function Today() {
  const wardrobe = useWardrobe();
  const [params] = useSearchParams();
  const lockedId = Number(params.get("with")) || null;
  const locked = wardrobe.items.find((item) => item.id === lockedId) || null;
  const [occasion, setOccasion] = useState("casual_outing");
  const [hidden, setHidden] = useState([]);
  const [worn, setWorn] = useState([]);
  const [note, setNote] = useState("");
  const units = wardrobe.settings?.units || "C";
  const weather = weatherFor(wardrobe.settings || {}, wardrobe.online);
  const dayKey = new Date().toDateString();

  const result = useMemo(() => {
    if (!wardrobe.booted) return { outfits: [], missing: "" };
    return suggest({
      items: wardrobe.items,
      occasion,
      weather,
      wearLog: wardrobe.wearLog,
      feedback: wardrobe.feedback,
      dayKey,
      lockedId,
    });
  }, [wardrobe.booted, wardrobe.items, wardrobe.wearLog, wardrobe.feedback, occasion, weather.temp, weather.rain, dayKey, lockedId]);

  const gaps = useMemo(
    () => (wardrobe.booted ? closetReport(wardrobe.items, weather).filter((row) => row.status !== "Covered") : []),
    [wardrobe.booted, wardrobe.items, weather.temp, weather.rain],
  );

  const visible = result.outfits.filter((outfit) => !hidden.includes(outfit.itemIds.join("-")));

  useEffect(() => {
    const key = visible[0]?.itemIds.join("-") || "";
    if (!key || !wardrobe.settings?.aiNoteEnabled || !wardrobe.online) {
      setNote("");
      return undefined;
    }
    let stop = false;
    const url = (wardrobe.settings.workerUrl || WORKER_URL).replace(/\/$/, "");
    stylistNote(url, visible[0], { occasion, weather: { temp: weather.temp, rain: weather.rain } })
      .then((text) => {
        if (!stop) setNote(text);
      })
      .catch(() => {
        if (!stop) setNote("");
      });
    return () => {
      stop = true;
    };
  }, [visible[0]?.itemIds.join("-"), occasion, wardrobe.online, wardrobe.settings?.aiNoteEnabled, weather.temp, weather.rain]);

  return (
    <section className="stack">
      <div className="hero">
        <div>
          <h1>Today</h1>
          <p className="muted">Photograph it once. Dress for the day.</p>
        </div>
        <Link className="btn primary" to="/add">
          Add
        </Link>
      </div>
      <article className="card weather">
        <strong>{formatTemp(weather.temp, units)}</strong>
        <p className="muted">
          Feels {formatTemp(weather.feels, units)} · rain {Math.round(weather.rain)}% · {weather.text}
          {weather.offline ? " · offline" : ""}
          {wardrobe.settings?.locationName ? ` · ${wardrobe.settings.locationName}` : ""}
        </p>
      </article>
      <div className="row">
        {OCCASIONS.map((item) => (
          <Chip key={item.key} active={occasion === item.key} onClick={() => { setOccasion(item.key); setHidden([]); }}>
            {item.label}
          </Chip>
        ))}
      </div>
      {wardrobe.items.length < 3 ? (
        <div className="card">
          <p>Add at least 3 items to get suggestions.</p>
          <Link className="btn primary" to="/add">Add a piece</Link>
          <p className="muted">Or open Settings and load the sample closet.</p>
        </div>
      ) : null}
      {locked ? (
        <div className="banner">
          Building around {locked.name}. <Link to="/">Clear</Link>
        </div>
      ) : null}
      {result.missing ? <div className="banner">{result.missing}</div> : null}
      {!locked && gaps.length ? (
        <p className="muted">
          {gaps.slice(0, 3).map((row) => `${OCCASION_MAP[row.occasion]?.label || row.occasion} is ${row.status.toLowerCase()}`).join(" · ")}
          {" · "}
          <Link to="/history">Closet report</Link>
        </p>
      ) : null}
      <div className="snap">
        {visible.map((outfit, index) => (
          <OutfitCard
            key={outfit.itemIds.join("-")}
            outfit={outfit}
            note={index === 0 && note ? note : outfit.reason}
            worn={worn.includes(outfit.itemIds.join("-"))}
            onWear={() => {
              const key = outfit.itemIds.join("-");
              if (worn.includes(key)) return;
              setWorn((list) => [...list, key]);
              wardrobe.wear(outfit, occasion, formatTemp(weather.temp, units));
            }}
            onSkip={() => {
              wardrobe.feedbackOn(outfit.itemIds, "skip");
              setHidden((list) => [...list, outfit.itemIds.join("-")]);
            }}
            onLike={() => wardrobe.feedbackOn(outfit.itemIds, "like")}
          />
        ))}
      </div>
      {wardrobe.items.length >= 3 && !visible.length ? <p className="muted">Nothing else for this occasion. Try another chip.</p> : null}
    </section>
  );
}
