import { useEffect, useState } from "react";
import { Button, Chip } from "../components/Bits.jsx";
import { APP_VERSION } from "../lib/constants.js";
import { WORKER_URL } from "../lib/config.js";
import { readPosition, searchCities } from "../lib/weather.js";
import { useWardrobe } from "../store.jsx";

export default function Settings() {
  const wardrobe = useWardrobe();
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState([]);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [storage, setStorage] = useState("");
  const settings = wardrobe.settings || {};
  const pending = wardrobe.items.filter((item) => item.status === "pending_analysis").length;

  useEffect(() => {
    if (!navigator.storage?.estimate) return;
    navigator.storage.estimate().then((est) => {
      const used = Math.round((est.usage || 0) / 1024 / 1024);
      const quota = Math.round((est.quota || 0) / 1024 / 1024);
      setStorage(`${used} MB of about ${quota} MB`);
      if (quota && est.usage / est.quota > 0.85) setMessage("Phone storage for this app is almost full. Export a backup.");
    });
  }, [wardrobe.items.length]);

  return (
    <section className="stack">
      <h1>Settings</h1>
      {message ? <div className="banner">{message}</div> : null}
      <article className="card stack">
        <h2>City</h2>
        <p className="muted">{settings.locationName || "No city yet. Suggestions use a mild day until you set one."}</p>
        <div className="row">
          <input className="field" value={query} placeholder="Pune" onChange={(event) => setQuery(event.target.value)} />
          <Button
            variant="soft"
            onClick={() => searchCities(query).then(setCities).catch((error) => setMessage(error.message))}
          >
            Search
          </Button>
        </div>
        {cities.map((city) => (
          <Button
            key={city.label}
            variant="soft"
            onClick={() => wardrobe.updateSettings({ locationName: city.label, lat: city.lat, lon: city.lon, weatherCache: null }).then(() => setMessage(`Using ${city.label}.`))}
          >
            {city.label}
          </Button>
        ))}
        <Button
          variant="soft"
          onClick={() => readPosition()
            .then((pos) => wardrobe.updateSettings({ lat: pos.lat, lon: pos.lon, locationName: "This phone", weatherCache: null }))
            .catch((error) => setMessage(error.message))}
        >
          Use this phone's location
        </Button>
      </article>
      <article className="card stack">
        <h2>Preview weather</h2>
        <div className="row">
          {["off", "hot", "cold", "rain"].map((mode) => (
            <Chip key={mode} active={settings.debugWeather === mode} onClick={() => wardrobe.updateSettings({ debugWeather: mode })}>
              {mode}
            </Chip>
          ))}
        </div>
      </article>
      <article className="card stack">
        <h2>AI note</h2>
        <p className="muted">{settings.aiNoteEnabled ? "On. It calls the Worker only when you open Today." : "Off. The written reason still shows."}</p>
        <Button variant="soft" onClick={() => wardrobe.updateSettings({ aiNoteEnabled: !settings.aiNoteEnabled })}>
          {settings.aiNoteEnabled ? "Turn AI note off" : "Turn AI note on"}
        </Button>
        <Button variant="soft" onClick={() => wardrobe.retryPending().then((n) => setMessage(n ? "Retrying photos that are waiting." : "No photos are waiting."))}>
          Retry pending AI analysis ({pending})
        </Button>
        <p className="muted">Worker: {settings.workerUrl || WORKER_URL}</p>
      </article>
      <article className="card stack">
        <h2>Backup</h2>
        <p className="muted">Storage used: {storage || "checking…"}</p>
        <Button onClick={() => wardrobe.exportBackup().catch((error) => setMessage(error.message))}>Export backup</Button>
        <label className="btn soft">
          Import backup
          <input
            hidden
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) wardrobe.importBackupFile(file).then(setMessage).catch((error) => setMessage(error.message));
            }}
          />
        </label>
        <Button variant="soft" onClick={() => wardrobe.addSamples().then((n) => setMessage(n ? `Added ${n} sample pieces.` : "Sample closet is already here."))}>
          Load sample closet
        </Button>
        {confirm ? (
          <Button variant="danger" onClick={() => wardrobe.deleteAll().then(() => { setConfirm(false); setMessage("Closet cleared."); })}>
            Yes, delete everything on this phone
          </Button>
        ) : (
          <Button variant="danger" onClick={() => setConfirm(true)}>Delete all data</Button>
        )}
      </article>
      <p className="muted">Wardrobe {APP_VERSION}. Photos stay in this browser. Free Gemini limits can change.</p>
    </section>
  );
}
