import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Home,
  Leaf,
  MessageCircle,
  User,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { navItems } from "../mock/data";
import type { MainView, MascotId, Preferences } from "../types";
import Mascot from "../components/Mascot";
import BrandMark from "../components/BrandMark";

const icons = {
  home: Home,
  chat: MessageCircle,
  activities: Leaf,
  specialists: Users,
  profile: User,
};

export default function AppShell({
  children,
  currentView,
  onNavigate,
  onHelp,
  mascot,
  preferences,
}: {
  children: ReactNode;
  currentView: MainView;
  onNavigate: (view: MainView) => void;
  onHelp: () => void;
  mascot: MascotId;
  preferences: Preferences;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
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

        {!collapsed && (
          <div className="sidebar-note">
            {preferences.showMascot && <Mascot id={mascot} size="tiny" />}
            <div><strong>Prototipo local</strong><small>Sin IA, diagnóstico ni expediente.</small></div>
          </div>
        )}
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => onNavigate("home")}><BrandMark size="small" /> KAHY</button>
          <span className="prototype-label">Vista demostrativa</span>
          <button className="help-button" onClick={onHelp}>Necesito ayuda ahora</button>
        </header>
        <main id="main-content" className="content">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {navItems.map((item) => {
          const Icon = icons[item.id as keyof typeof icons];
          return (
            <button key={item.id} className={currentView === item.id ? "active" : ""} onClick={() => onNavigate(item.id)} aria-current={currentView === item.id ? "page" : undefined}>
              <Icon size={20} /><span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
