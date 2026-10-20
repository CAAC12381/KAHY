import { RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { UPDATE_READY_EVENT } from "../lib/offlineApp";

/** Avisa que se descargó una versión nueva de KAHY; se aplica al recargar. */
export default function UpdateToast() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const show = () => setReady(true);
    window.addEventListener(UPDATE_READY_EVENT, show);
    return () => window.removeEventListener(UPDATE_READY_EVENT, show);
  }, []);

  if (!ready) return null;
  return (
    <div className="update-toast" role="status">
      <RefreshCw size={17} aria-hidden="true" />
      <span><strong>Hay una versión nueva de KAHY.</strong> Tus datos se conservan al actualizar.</span>
      <button className="update-toast-action" onClick={() => window.location.reload()}>Actualizar</button>
      <button className="update-toast-close" onClick={() => setReady(false)} aria-label="Actualizar después"><X size={16} /></button>
    </div>
  );
}
