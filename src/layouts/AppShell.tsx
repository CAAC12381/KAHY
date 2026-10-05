import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Home,
  Leaf,
  LogOut,
  MessageCircle,
  Menu,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BackNavigationContext, type BackEntry, type BackRegistry } from "../lib/backNavigation";
import { navItems } from "../mock/data";
import type { MainView, MascotId, Preferences } from "../types";
import Mascot from "../components/Mascot";
import BrandMark from "../components/BrandMark";

const icons = {
  home: Home,
  chat: MessageCircle,
  activities: Leaf,
  screening: ClipboardList,
  specialists: Users,
  profile: User,
  resources: BookOpen,
};

const mobilePrimaryIds: MainView[] = ["home", "chat", "activities", "screening"];
const mobileMoreItems: Array<{ id: MainView; label: string }> = [
  { id: "specialists", label: "Directorio" },
  { id: "profile", label: "Perfil y ajustes" },
  { id: "resources", label: "Recursos y fuentes" },
];

export default function AppShell({
  children,
  currentView,
  onNavigate,
  onHelp,
  onExit,
  mascot,
  preferences,
}: {
  children: ReactNode;
  currentView: MainView;
  onNavigate: (view: MainView) => void;
  onHelp: () => void;
  /** "Salir": regresa a la pantalla de acceso. */
  onExit: () => void;
  mascot: MascotId;
  preferences: Preferences;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMoreActive = mobileMoreItems.some((item) => item.id === currentView);

  // Flecha de regreso de la barra superior: la pide la pantalla abierta con useBackNavigation.
  const [backEntries, setBackEntries] = useState<Record<number, BackEntry>>({});
  const backRegistry = useMemo<BackRegistry>(() => ({
    set: (level, entry) => setBackEntries((current) => {
      const next = { ...current };
      if (entry) next[level] = entry;
      else delete next[level];
      return next;
    }),
  }), []);
  const backLevel = Object.keys(backEntries).map(Number).sort((a, b) => b - a)[0];
  const back = backLevel === undefined ? null : backEntries[backLevel];
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentView]);

  // Al cambiar de sección o de nivel se empieza desde arriba; antes se conservaba el desplazamiento de la pantalla anterior.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [currentView, backLevel, back?.label]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  function navigateFromMobile(view: MainView) {
    setMobileMenuOpen(false);
    onNavigate(view);
  }

  return (
    <BackNavigationContext.Provider value={backRegistry}>
    <div className={`app-shell ${collapsed ? "app-shell--collapsed" : ""}`}>
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brand-row">
          <button className="brand" onClick={() => onNavigate("home")} aria-label="Ir al inicio">
            <BrandMark size="small" />
            {!collapsed && <span>KAHY</span>}
          </button>
          <button className="icon-button collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expandir menú" : "Contraer menú"}>
            {collapsed ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}
          </button>
        </div>

        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = icons[item.id as keyof typeof icons];
            return (
              <button
                key={item.id}
                className={currentView === item.id ? "active" : ""}
                onClick={() => onNavigate(item.id)}
                aria-current={currentView === item.id ? "page" : undefined}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
          <button className={currentView === "resources" ? "active" : ""} onClick={() => onNavigate("resources")} title={collapsed ? "Recursos" : undefined}>
            <BookOpen size={20} />
            {!collapsed && <span>Recursos</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-exit" onClick={onExit} title={collapsed ? "Salir" : undefined}>
            <LogOut size={20} />
            {!collapsed && <span>Salir</span>}
          </button>
          {!collapsed && (
            <div className="sidebar-note">
              {preferences.showMascot && <Mascot id={mascot} size="tiny" />}
              <div><strong>Orientación privada</strong><small>Chat activo · sin expediente clínico.</small></div>
            </div>
          )}
        </div>
      </aside>

      <div className="app-main">
        <header className={back ? "topbar topbar--has-back" : "topbar"}>
          <button className="mobile-brand" onClick={() => onNavigate("home")}><BrandMark size="small" /> KAHY</button>
          {back && <button className="topbar-back" onClick={back.onBack}><ArrowLeft size={18} /><span>{back.label}</span></button>}
          <span className="prototype-label">Vista demostrativa</span>
          <button className="help-button" onClick={onHelp}>Necesito ayuda ahora</button>
        </header>
        <main id="main-content" ref={mainRef} className={currentView === "chat" ? "content content--chat" : "content"}>{children}</main>
      </div>

      {mobileMenuOpen && <>
        <button className="mobile-more-backdrop" onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar menú" />
        <aside id="mobile-more-menu" className="mobile-more-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title">
          <div className="mobile-more-heading"><div><span className="eyebrow">Navegación</span><h2 id="mobile-more-title">Más secciones</h2></div><button className="icon-button" onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar menú"><X size={21} /></button></div>
          <div className="mobile-more-links">{mobileMoreItems.map((item) => {
            const Icon = icons[item.id as keyof typeof icons];
            return <button key={item.id} className={currentView === item.id ? "active" : ""} onClick={() => navigateFromMobile(item.id)} aria-current={currentView === item.id ? "page" : undefined}><Icon size={21} /><span>{item.label}</span><ChevronRight size={18} /></button>;
          })}
            <button className="mobile-more-exit" onClick={() => { setMobileMenuOpen(false); onExit(); }}><LogOut size={21} /><span>Salir</span></button>
          </div>
        </aside>
      </>}

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {navItems.filter((item) => mobilePrimaryIds.includes(item.id)).map((item) => {
          const Icon = icons[item.id as keyof typeof icons];
          return (
            <button key={item.id} className={currentView === item.id ? "active" : ""} onClick={() => navigateFromMobile(item.id)} aria-current={currentView === item.id ? "page" : undefined}>
              <Icon size={20} /><span>{item.label}</span>
            </button>
          );
        })}
        <button className={mobileMoreActive || mobileMenuOpen ? "active" : ""} onClick={() => setMobileMenuOpen((value) => !value)} aria-expanded={mobileMenuOpen} aria-controls="mobile-more-menu"><Menu size={20} /><span>Más</span></button>
      </nav>
    </div>
    </BackNavigationContext.Provider>
  );
}
