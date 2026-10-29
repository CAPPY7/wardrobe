import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, useBlob } from "../components/Bits.jsx";
import { SHOOT_ALWAYS, SHOOTS } from "../lib/constants.js";
import { measureFrame } from "../lib/quality.js";
import { useWardrobe } from "../store.jsx";

export default function Add() {
  const { savePhoto } = useWardrobe();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [shoot, setShoot] = useState(null);
  const [error, setError] = useState("");
  const [meter, setMeter] = useState(null);
  const [shot, setShot] = useState(null);
  const [quick, setQuick] = useState(true);
  const [pendingDup, setPendingDup] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sheetNote, setSheetNote] = useState("");
  const preview = useBlob(shot);

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!shoot || shot) return undefined;
    let timer = 0;
    let dead = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (dead) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        timer = window.setInterval(() => {
          if (videoRef.current && videoRef.current.videoWidth) setMeter(measureFrame(videoRef.current));
        }, 500);
      } catch {
        setError("Camera is blocked. Use the file button instead.");
      }
    })();
    return () => {
      dead = true;
      window.clearInterval(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [shoot, shot]);

  async function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      setError("Camera is not ready yet.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) {
      setError("Could not save that frame. Try Upload.");
      return;
    }
    setError("");
    setShot(blob);
  }

  async function useFile(file) {
    if (!file) return;
    setShot(file);
    setError("");
  }

  async function usePhoto(force = false) {
    if (!shot || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await savePhoto({ blob: shot, kind: shoot.kind, force });
      if (result?.duplicate && !force) {
        setPendingDup(result);
        return;
      }
      setPendingDup(null);
      setShot(null);
      setSheetNote(result?.needsSheet ? "Saved a tighter crop. Retake on a bedsheet for a clean cutout." : "");
      if (!quick) setShoot(null);
    } catch (error) {
      setError(error?.message || "Could not save that photo.");
    } finally {
      setBusy(false);
    }
  }

  if (!shoot) {
    return (
      <section className="stack">
        <h1>Add</h1>
        <p className="muted">{SHOOT_ALWAYS}</p>
        <div className="grid">
          {SHOOTS.map((item) => (
            <button key={item.id} type="button" className="card" onClick={() => setShoot(item)}>
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="hero">
        <h1>{shoot.label}</h1>
        <Button variant="soft" onClick={() => { setShoot(null); setShot(null); }}>Back</Button>
      </div>
      {error ? <div className="banner">{error}</div> : null}
      {sheetNote ? <div className="banner">{sheetNote}</div> : null}
      {!shot ? (
        <div className="camera-wrap">
          <video ref={videoRef} playsInline muted autoPlay />
          <div className={`frame ${meter && !meter.tooDark && !meter.blurry ? "ok" : ""}`} />
          <div className="guide">
            <div>{shoot.guide}</div>
            <div>{SHOOT_ALWAYS}</div>
            {meter?.tooDark ? <strong>Too dark, move to light</strong> : null}
            {meter && !meter.tooDark && meter.blurry ? <span>Hold still</span> : null}
          </div>
        </div>
      ) : (
        <img src={preview} alt="Shot preview" />
      )}
      <label className="row">
        <input type="checkbox" checked={quick} onChange={(event) => setQuick(event.target.checked)} />
        Quick add (stay on the camera)
      </label>
      <div className="row">
        {!shot ? (
          <Button onClick={capture} disabled={!meter || meter.tooDark}>
            Shutter
          </Button>
        ) : (
          <>
            <Button onClick={() => usePhoto(false)} disabled={busy}>{busy ? "Saving…" : "Use photo"}</Button>
            <Button variant="soft" onClick={() => setShot(null)} disabled={busy}>Retake</Button>
          </>
        )}
        <label className="btn soft">
          Upload
          <input
            hidden
            type="file"
            accept="image/*"
            onChange={(event) => {
              useFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      <Link to="/closet">Review closet</Link>
      {pendingDup ? (
        <div className="modal">
          <div className="card stack">
            <strong>Looks like you already have this.</strong>
            <p className="muted">Similar to {pendingDup.duplicate.name}. Add anyway?</p>
            <div className="row">
              <Button onClick={() => usePhoto(true)}>Add anyway</Button>
              <Button variant="soft" onClick={() => { setPendingDup(null); setShot(null); }}>Skip</Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
