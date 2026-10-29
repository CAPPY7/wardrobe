import { HashRouter, Route, Routes } from "react-router-dom";
import InstallHint from "./components/InstallHint.jsx";
import ProgressStrip from "./components/ProgressStrip.jsx";
import TabBar from "./components/TabBar.jsx";
import UpdateToast from "./components/UpdateToast.jsx";
import Add from "./screens/Add.jsx";
import Closet from "./screens/Closet.jsx";
import History from "./screens/History.jsx";
import ItemDetail from "./screens/ItemDetail.jsx";
import Onboarding from "./screens/Onboarding.jsx";
import Settings from "./screens/Settings.jsx";
import Today from "./screens/Today.jsx";
import { useWardrobe, WardrobeProvider } from "./store.jsx";

function Shell() {
  const { job, online, booted } = useWardrobe();
  return (
    <div className="app">
      <div className="wrap stack">
        {!online ? <div className="banner">Offline. Closet and outfits still work. Weather and tagging wait.</div> : null}
        <ProgressStrip label={job} />
        {booted ? (
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/closet" element={<Closet />} />
            <Route path="/add" element={<Add />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        ) : (
          <p>Opening your closet…</p>
        )}
        <InstallHint />
      </div>
      <Onboarding />
      <UpdateToast />
      <TabBar />
    </div>
  );
}

export default function App() {
  return (
    <WardrobeProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </WardrobeProvider>
  );
}
