import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { flushSync, pendingSyncCount, SYNC_CHANGED_EVENT } from "../services/syncOutbox";

export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

function usePendingSync() {
  const [pending, setPending] = useState(() => pendingSyncCount());
  useEffect(() => {
    const update = () => setPending(pendingSyncCount());
    window.addEventListener(SYNC_CHANGED_EVENT, update);
    return () => window.removeEventListener(SYNC_CHANGED_EVENT, update);
  }, []);
  return pending;
}

/**
 * Aviso de conexión visible en todas las secciones (antes solo el chat
 * decía que no había internet, y en teléfono ni eso). Sin conexión explica
 * qué sigue funcionando; al volver, avisa unos segundos y sincroniza.
 */
export default function ConnectionBanner({ context = "app" }: { context?: "app" | "access" }) {
  const online = useOnlineStatus();
  const pending = usePendingSync();
  const [recovered, setRecovered] = useState(false);
  const wasOffline = useRef(!navigator.onLine);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setRecovered(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setRecovered(true);
    void flushSync();
    const timer = window.setTimeout(() => setRecovered(false), 5000);
    return () => window.clearTimeout(timer);
  }, [online]);

  if (online && !recovered) return null;

  if (online) {
    return (
      <div className={`connection-banner connection-banner--back ${context === "access" ? "connection-banner--access" : ""}`} role="status">
        <Wifi size={16} aria-hidden="true" />
        <span><strong>Conexión restablecida.</strong> {context === "access" ? "Ya puedes crear una cuenta o iniciar sesión." : pending > 0 ? "Enviando los cambios que hiciste sin conexión…" : "La IA en línea vuelve a estar disponible."}</span>
      </div>
    );
  }

  return (
    <div className={`connection-banner ${context === "access" ? "connection-banner--access" : ""}`} role="status">
      <WifiOff size={16} aria-hidden="true" />
      {context === "access"
        ? <span><strong>Sin conexión.</strong> Puedes explorar KAHY sin cuenta; crear una cuenta o iniciar sesión necesita internet.</span>
        : <span><strong>Sin conexión.</strong> KAHY sigue funcionando en este dispositivo: el chat responde con el motor local y todo lo que hagas se guarda aquí.</span>}
    </div>
  );
}
