import { Component, type ErrorInfo, type ReactNode } from "react";
import BrandMark from "./BrandMark";

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[KAHY interface]", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="recovery-screen">
        <BrandMark size="large" />
        <span className="eyebrow">Recuperación de la interfaz</span>
        <h1>KAHY necesita volver a cargar esta pantalla</h1>
        <p>La conversación de esta sesión no se guardó. Puedes recargar de forma segura y volver a intentarlo.</p>
        <button className="button button--primary" onClick={() => window.location.reload()}>Recargar KAHY</button>
      </main>
    );
  }
}
