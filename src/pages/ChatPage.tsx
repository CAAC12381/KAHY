import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  BookOpenCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  CloudOff,
  Database,
  History,
  Leaf,
  ListChecks,
  Map,
  MessageCircle,
  MoreHorizontal,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRoundSearch,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import BrandMark from "../components/BrandMark";
import Mascot, { Flower } from "../components/Mascot";
import SupportBanner from "../components/SupportBanner";
import { Button, DemoBadge, Modal } from "../components/ui";
import { useChatMemory, type ChatMemoryEntry } from "../hooks/useChatMemory";
import type { ChatHistoryApi, ChatHistorySession } from "../hooks/useChatHistory";
import type { EmotionCalendarApi } from "../hooks/useEmotionCalendar";
import { stageForGrowth, type PetGardenApi } from "../hooks/usePetGarden";
import type { ScreeningsState } from "../hooks/useScreenings";
import { createReply, detectSafetySignal, type ChatTopic, type ConversationReply } from "../mock/conversation";
import { flowers, mascots, trustedSources } from "../mock/data";
import { emotionLabels, inferLocalEmotion } from "../lib/emotionLexicon";
import type { DemoProfile, MainView, Preferences } from "../types";
import { getAiStatus, requestAiReply, type AiConnection, type ApiChatMessage } from "../services/chatApi";

type ScreeningSuggestion = { label: string; prompt: string };

function buildScreeningSuggestions(screenings: ScreeningsState): ScreeningSuggestion[] {
  const suggestions: ScreeningSuggestion[] = [];
  const gad7 = screenings.latestOf("gad7");
  if (gad7 && gad7.score >= 5) suggestions.push({ label: `Ejercicio para la ansiedad (según tu GAD-7: ${gad7.band.toLowerCase()})`, prompt: "Según un tamizaje reciente mi ansiedad está en un nivel que quiero trabajar. ¿Podemos hacer un ejercicio de respiración?" });
  const phq9 = screenings.latestOf("phq9");
  if (phq9 && phq9.score >= 5) suggestions.push({ label: `Un paso pequeño para el ánimo (según tu PHQ-9: ${phq9.band.toLowerCase()})`, prompt: "Un tamizaje reciente detectó que tengo el ánimo bajo. ¿Me ayudas con un paso pequeño y quizás llevar un diario breve?" });
  const pcl5 = screenings.latestOf("pcl5");
  if (pcl5 && pcl5.score >= 33) suggestions.push({ label: "Hablar de estrés postraumático (según tu PCL-5 reciente)", prompt: "Un tamizaje reciente de estrés postraumático me dio un resultado por encima del punto de corte. Quiero hablar de esto con cuidado." });
  const asrs = screenings.latestOf("asrs");
  if (asrs && asrs.band.startsWith("Compatible")) suggestions.push({ label: "Herramientas de atención y organización (según tu ASRS reciente)", prompt: "Un tamizaje reciente de atención salió compatible con síntomas de TDAH. ¿Me ayudas con herramientas para organizarme?" });
  return suggestions.slice(0, 2);
}

type ChatMessage =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; reply: ConversationReply };

const initialReply: ConversationReply = {
  mode: "standard",
  presentation: "conversation",
  topic: "inicio",
  label: "Bienvenida",
  title: "Aquí podemos hablar con calma",
  introduction: "Hola, soy KAHY. Puedes contarme algo que te preocupa, pensar una decisión conmigo, resolver una duda cotidiana o simplemente platicar. No tienes que ordenar todo antes de escribir.",
  insight: "Comparte solo lo que te resulte cómodo y evita datos como nombres completos o domicilios.",
  steps: [],
  question: "¿Qué te vendría bien en este momento?",
  choices: ["Quiero contar algo", "Ayúdame a decidir", "Tengo una duda"],
  sourceIds: ["mexico-privacy"],
};

const topicNames: Record<ChatTopic, string> = {
  inicio: "Por definir",
  estrés: "Estrés o ansiedad",
  ánimo: "Ánimo bajo",
  trauma: "Estrés traumático",
  neurodivergencia: "Neurodivergencia",
  adicciones: "Consumo o adicciones",
  organización: "Organización",
  acceso: "Acceso a atención",
  seguridad: "Seguridad inmediata",
  sueño: "Sueño y descanso",
  duelo: "Duelo y pérdida",
  soledad: "Soledad",
  relaciones: "Relaciones y límites",
  pánico: "Síntomas de pánico",
  medicación: "Medicamentos",
  diagnóstico: "Preparar evaluación",
  apoyo: "Apoyar a otra persona",
  autocuidado: "Autocuidado",
  conversación: "Conversación general",
};

/**
 * Short, non-sensitive summary sent alongside the chat request so the AI can
 * personalize without KAHY ever sending raw message history as "profile
 * data" — only declared goals/city and recent topic labels, never message
 * text. Server side (api/_lib/kahyAi.ts, server/kahyAi.ts) appends it to the
 * system prompt rather than the conversation itself.
 */
function buildPersonalContext(profile: DemoProfile, memory: ChatMemoryEntry[]): string | undefined {
  const parts: string[] = [];
  if (profile.goals.length) parts.push(`metas declaradas: ${profile.goals.join(", ")}`);
  if (memory.length) {
    const recentTopics = [...new Set(memory.slice(-4).map((entry) => topicNames[entry.topic]))];
    if (recentTopics.length) parts.push(`temas recientes de conversación: ${recentTopics.join(", ")}`);
  }
  return parts.length ? parts.join(". ") : undefined;
}

function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);
  const sameDay = date.toDateString() === new Date().toDateString();
  if (sameDay) return date.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export default function ChatPage({ onHelp, navigate, preferences, screenings, garden, profile, deviceId, chatHistory, emotionCalendar }: { onHelp: () => void; navigate: (view: MainView) => void; preferences: Preferences; screenings: ScreeningsState; garden: PetGardenApi; profile: DemoProfile; deviceId: string; chatHistory: ChatHistoryApi; emotionCalendar: EmotionCalendarApi }) {
  const memory = useChatMemory(preferences.rememberConversations, deviceId);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewingSession, setViewingSession] = useState<ChatHistorySession | null>(null);
  const screeningSuggestions = useMemo(() => buildScreeningSuggestions(screenings), [screenings.results]);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 1, role: "assistant", reply: initialReply }]);
  const [companionGaining, setCompanionGaining] = useState(false);
  const mountedPulse = useRef(garden.pulse);
  const [value, setValue] = useState("");
  const [typing, setTyping] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<ChatTopic>("inicio");
  const [lowData, setLowData] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [plan, setPlan] = useState<Array<{ text: string; done: boolean }>>([]);
  const [aiConnection, setAiConnection] = useState<AiConnection>("checking");
  const [activePrompt, setActivePrompt] = useState<ConversationReply | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    getAiStatus().then(setAiConnection);
  }, []);

  useEffect(() => {
    if (garden.pulse === mountedPulse.current) return;
    mountedPulse.current = garden.pulse;
    setCompanionGaining(true);
    const timer = window.setTimeout(() => setCompanionGaining(false), 900);
    return () => window.clearTimeout(timer);
  }, [garden.pulse]);

  // Ancla siempre al último elemento: se dispara al enviar, al recibir la respuesta y mientras "escribe…" está visible.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  async function send(text = value) {
    const clean = text.trim();
    if (!clean || sendingRef.current) return;
    sendingRef.current = true;
    const userMessage: ChatMessage = { id: Date.now(), role: "user", text: clean };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setValue("");
    setTyping(true);
    if (inputRef.current) inputRef.current.style.height = "46px";
    const started = Date.now();
    let reply: ConversationReply;
    try {
      const apiMessages: ApiChatMessage[] = nextMessages.slice(-16).map((message) => message.role === "user"
        ? { role: "user", content: message.text }
        : { role: "assistant", content: summarizeReply(message.reply) });
      const result = await requestAiReply(apiMessages, buildPersonalContext(profile, memory.entries));
      reply = result.reply;
      setAiConnection(result.provider === "openai" || result.provider === "groq" ? "live" : "local");
    } catch (error) {
      reply = createReply(clean, currentTopic);
      setAiConnection((error as Error & { code?: string }).code === "AI_NOT_CONFIGURED" ? "local" : "error");
    }
    const minimumDelay = detectSafetySignal(clean) ? 250 : 650;
    const remaining = Math.max(0, minimumDelay - (Date.now() - started));
    if (remaining) await new Promise((resolve) => window.setTimeout(resolve, remaining));
    const localEmotion = inferLocalEmotion(clean);
    const emotion = !reply.emotion || (reply.emotion.primary === "no_clara" && localEmotion.primary !== "no_clara") ? localEmotion : reply.emotion;
    reply = { ...reply, emotion };
    setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", reply }]);
    setCurrentTopic(reply.topic);
    if (reply.steps.length) setPlan(reply.steps.map((step) => ({ text: `${step.horizon}: ${step.text}`, done: false })));
    setTyping(false);
    sendingRef.current = false;
    memory.remember(reply.topic);
    emotionCalendar.record(emotion);
    if (reply.mode !== "safety") garden.gainFromChat(emotion);
    if (reply.openHelp) window.setTimeout(onHelp, 350);
  }

  function choosePrompt(choice: string) {
    setActivePrompt(null);
    send(choice);
  }

  function dismissPrompt() {
    setActivePrompt(null);
  }

  function resetChat() {
    chatHistory.archive(messages, currentTopic);
    setMessages([{ id: Date.now(), role: "assistant", reply: initialReply }]);
    setCurrentTopic("inicio");
    setPlan([]);
    setValue("");
    setActivePrompt(null);
    sendingRef.current = false;
  }

  function growInput(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(event.target.value);
    event.target.style.height = "46px";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 132)}px`;
  }

  return (
    <div className={`page chat-page chat-studio ${lowData ? "chat-low-data" : ""} ${historyOpen ? "history-open" : ""}`}>
      {screenings.showSupportBanner && <SupportBanner onHelp={onHelp} onAcknowledge={screenings.acknowledgeSupport} />}

      <button className="history-tab" onClick={() => setHistoryOpen(!historyOpen)} aria-expanded={historyOpen} aria-label={historyOpen ? "Cerrar conversaciones anteriores" : "Ver conversaciones anteriores"}>
        {historyOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        <History size={16} />
      </button>

      <div className="history-backdrop" onClick={() => setHistoryOpen(false)} />

      <aside className="history-drawer" aria-hidden={!historyOpen}>
        <div className="history-drawer-head">
          <span><History size={17} /> Conversaciones anteriores</span>
          <button onClick={() => setHistoryOpen(false)} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <p className="history-drawer-note">Se guardan solo en este dispositivo, nunca en un servidor. Puedes borrarlas en Perfil.</p>
        {chatHistory.sessions.length === 0 ? (
          <div className="history-empty"><MessageCircle size={26} /><p>Aún no tienes conversaciones guardadas. Cuando empieces una nueva desde "Iniciar conversación nueva", esta quedará aquí.</p></div>
        ) : (
          <ul className="history-list">
            {[...chatHistory.sessions].reverse().map((session) => (
              <li key={session.id}>
                <button className="history-item" onClick={() => { setViewingSession(session); setHistoryOpen(false); }}>
                  <span className="history-item-top"><strong>{topicNames[session.topic]}</strong><time>{formatSessionDate(session.startedAt)}</time></span>
                  <span className="history-item-preview">{session.preview}</span>
                </button>
                <button className="history-item-delete" onClick={() => chatHistory.remove(session.id)} aria-label="Eliminar esta conversación"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <section className="chat-command-bar">
        <div className="chat-brand-persona">
          <BrandMark size="medium" />
          <div><span className="eyebrow">Centro de orientación</span><h1>Conversación con KAHY</h1><p className={`ai-connection ${aiConnection}`}><span className="status-dot" /> {aiConnection === "live" ? "IA generativa conectada" : aiConnection === "checking" ? "Comprobando conexión…" : aiConnection === "error" ? "Respuesta local activa · conexión temporalmente no disponible" : "Motor local activo · IA generativa pendiente"}</p></div>
        </div>
        {!lowData && preferences.showMascot && <ChatCompanionChip profile={profile} garden={garden} gaining={companionGaining} />}
        <div className="chat-command-actions">
          <button className={lowData ? "data-mode active" : "data-mode"} onClick={() => setLowData(!lowData)} aria-pressed={lowData}><WifiOff size={17} /><span>{lowData ? "Pocos datos" : "Modo visual"}</span></button>
          <button className="chat-menu-button" onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen}><MoreHorizontal size={20} /><span>Cómo funciona</span></button>
          <Button variant="danger" onClick={onHelp}><AlertTriangle size={18} /> Ayuda inmediata</Button>
        </div>
      </section>

      {detailsOpen && <section className="chat-disclosure"><div><BookOpenCheck size={21} /><span><strong>Conversación adaptable</strong><small>Responde con naturalidad y solo crea un plan cuando realmente ayuda.</small></span></div><div><ShieldCheck size={21} /><span><strong>Detección preventiva</strong><small>Moderación y frases explícitas activan ayuda; no se predice ni puntúa riesgo clínico.</small></span></div><div><Database size={21} /><span><strong>Fuentes pertinentes</strong><small>Solo muestra fuentes cuando respaldan el tema de la respuesta.</small></span></div></section>}

      <section className="chat-safety-strip"><ShieldCheck size={18} /><p><strong>{aiConnection === "live" ? "IA activa:" : "Orientación local activa:"}</strong> {aiConnection === "live" ? "el texto se procesa para generar una respuesta; KAHY no crea expediente. Evita datos identificables." : "el chat responde con una biblioteca segura y contextual dentro del navegador; no envía tu texto."}</p><span>{lowData ? <><CloudOff size={15} /> Pocos datos</> : <><Sparkles size={15} /> Visual completo</>}</span></section>

      <div className="chat-workspace">
        <aside className="conversation-map">
          <div className="map-heading"><Map size={19} /><span><strong>Mapa de apoyo</strong><small>Se actualiza con la conversación</small></span></div>
          <ol>
            <li className="done"><span><Check size={15} /></span><div><strong>Empezar</strong><small>Elegir qué necesitas</small></div></li>
            <li className={currentTopic !== "inicio" ? "done" : "active"}><span>{currentTopic !== "inicio" ? <Check size={15} /> : "2"}</span><div><strong>Ubicar el tema</strong><small>{topicNames[currentTopic]}</small></div></li>
            <li className={plan.length ? "active" : ""}><span>3</span><div><strong>Construir un plan</strong><small>{plan.length ? `${plan.length} acciones sugeridas` : "Aún sin acciones"}</small></div></li>
            <li><span>4</span><div><strong>Conectar apoyo</strong><small>Recurso o persona adecuada</small></div></li>
          </ol>
          <div className="coverage-card"><UserRoundSearch size={19} /><strong>Conversación abierta</strong><p>Puedes hablar de cualquier tema cotidiano. KAHY adapta el tono y ofrece estructura solo cuando aporta.</p></div>
        </aside>

        <section className="conversation-panel" aria-label="Conversación de orientación">
          <div className="conversation-scroll" role="log" aria-live="polite" aria-relevant="additions" aria-busy={typing}>
            <div className="conversation-day"><Sparkles size={13} /> {preferences.saveChatHistory ? "Conversación nueva · se guarda en este navegador" : preferences.rememberConversations ? "Conversación nueva · recuerda solo temas" : "Conversación nueva · no se guarda"}</div>
            {memory.entries.length > 0 && <div className="memory-banner"><MessageCircle size={14} /><span>La última vez hablamos de: {memory.entries.slice(-3).map((entry) => topicNames[entry.topic]).join(", ")}.</span></div>}
            {messages.map((message) => message.role === "user" ? <div className="studio-message user" data-chat-message key={message.id}><div className="user-message">{message.text}</div></div> : <AssistantReply key={message.id} reply={message.reply} onChoice={send} onHelp={onHelp} navigate={navigate} disabled={typing} onReopenPrompt={() => setActivePrompt(message.reply)} />)}
            {typing && <div className="studio-message assistant" data-chat-message><BrandMark size="small" /><div className="thinking-card" role="status"><div className="thinking-dots"><i /><i /><i /></div><span>Organizando una respuesta segura y útil…</span></div></div>}
            <div ref={bottomRef} aria-hidden="true" />
          </div>

          {screeningSuggestions.length > 0 && (
            <div className="screening-suggestion-row" aria-label="Sugerencias según tu tamizaje reciente">
              <span><ClipboardList size={14} /> Según tu tamizaje reciente:</span>
              {screeningSuggestions.map((suggestion) => <button key={suggestion.label} onClick={() => send(suggestion.prompt)}>{suggestion.label}</button>)}
            </div>
          )}

          <div className="starter-row" aria-label="Atajos de conversación">
            <button onClick={() => send("Estoy muy estresado y no sé qué resolver primero")}><MessageCircle size={16} /> Estrés</button>
            <button onClick={() => send("Tengo una sobrecarga sensorial y no puedo empezar mis tareas")}><Sparkles size={16} /> Sobrecarga</button>
            <button onClick={() => send("Me preocupa mi consumo de alcohol y quiero buscar ayuda")}><ShieldCheck size={16} /> Consumo</button>
            <button onClick={() => send("Vivo lejos de Morelia y necesito atención con pocos datos")}><WifiOff size={16} /> Atención remota</button>
          </div>

          <form className="studio-composer" onSubmit={(event) => { event.preventDefault(); send(); }}>
            <label htmlFor="studio-chat-input">Cuéntame qué está pasando o qué necesitas resolver</label>
            <div className="composer-box"><textarea ref={inputRef} id="studio-chat-input" rows={1} maxLength={1200} value={value} onChange={growInput} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Ej. Estoy saturado, no puedo organizarme y necesito saber qué hacer primero…" /><button type="submit" aria-label="Enviar mensaje" disabled={!value.trim() || typing}><ArrowUp size={21} /></button></div>
            <div className="composer-meta"><span>Enter para enviar · Shift + Enter para otra línea</span><span>{value.length}/1200</span></div>
          </form>
        </section>

        <aside className="action-plan-panel">
          <div className="plan-heading"><ListChecks size={20} /><span><strong>Plan de ahora</strong><small>No se guarda</small></span></div>
          {!plan.length ? <div className="plan-empty"><Leaf size={28} /><p>Cuando conversemos, aquí aparecerán acciones concretas para este momento y el siguiente paso.</p></div> : <div className="plan-list">{plan.map((item, index) => <label className={item.done ? "done" : ""} key={`${item.text}-${index}`}><input type="checkbox" checked={item.done} onChange={(event) => setPlan(plan.map((entry, itemIndex) => itemIndex === index ? { ...entry, done: event.target.checked } : entry))} /><span>{item.text}</span></label>)}</div>}
          <div className="plan-links"><button onClick={() => navigate("activities")}><Leaf size={17} /> Abrir herramientas <ArrowRight size={16} /></button><button onClick={() => navigate("specialists")}><UserRoundSearch size={17} /> Explorar atención <ArrowRight size={16} /></button><button onClick={() => navigate("resources")}><Database size={17} /> Ver evidencia <ArrowRight size={16} /></button></div>
          <button className="reset-chat" onClick={resetChat}><RotateCcw size={16} /> Iniciar conversación nueva</button>
        </aside>
      </div>

      {activePrompt && (
        <Modal title="Plan y siguiente paso" onClose={dismissPrompt}>
          <div className="prompt-modal">
            {activePrompt.insight && <div className="context-reading"><CircleHelp size={18} /><div><strong>Contexto, no diagnóstico</strong><p>{activePrompt.insight}</p></div></div>}
            {activePrompt.steps.length > 0 && <div className="response-steps">{activePrompt.steps.map((step) => <div key={`${step.horizon}-${step.text}`}><span>{step.horizon}</span><p>{step.text}</p></div>)}</div>}
            {activePrompt.question && <><div className="prompt-modal-divider" /><strong className="prompt-modal-question">{activePrompt.question}</strong><p className="prompt-modal-hint">Responder es opcional; también puedes seguir escribiendo con tus propias palabras.</p></>}
            {activePrompt.choices.length > 0 && <div className="prompt-modal-choices">{activePrompt.choices.map((choice) => <button key={choice} onClick={() => choosePrompt(choice)}>{choice}<ArrowRight size={15} /></button>)}</div>}
            <Button variant="ghost" className="full-width" onClick={dismissPrompt}>Cerrar</Button>
          </div>
        </Modal>
      )}

      {viewingSession && (
        <Modal title={`${topicNames[viewingSession.topic]} · ${formatSessionDate(viewingSession.startedAt)}`} onClose={() => setViewingSession(null)}>
          <div className="history-transcript">
            {viewingSession.messages.map((message) => message.role === "user"
              ? <div className="studio-message user" key={message.id}><div className="user-message">{message.text}</div></div>
              : <div className="studio-message assistant" key={message.id} data-chat-message><BrandMark size="small" /><div className="assistant-response"><div className="assistant-card conversational"><p className="assistant-intro">{message.reply.introduction}</p>{message.reply.insight && <p className="assistant-insight">{message.reply.insight}</p>}</div></div></div>)}
          </div>
          <Button variant="ghost" className="full-width" onClick={() => setViewingSession(null)}>Cerrar</Button>
        </Modal>
      )}
    </div>
  );
}

function AssistantReply({ reply, onChoice, onHelp, navigate, disabled, onReopenPrompt }: { reply: ConversationReply; onChoice: (text: string) => void; onHelp: () => void; navigate: (view: MainView) => void; disabled: boolean; onReopenPrompt: () => void }) {
  const sources = reply.sourceIds.map((id) => trustedSources.find((item) => item.id === id)).filter(Boolean);
  const conversational = reply.presentation === "conversation" && reply.mode !== "safety";
  const hasGuidance = Boolean(reply.insight || reply.steps.length || reply.question || reply.choices.length);
  return <article className={`studio-message assistant ${reply.mode}`} data-chat-message>
    <BrandMark size="small" />
    <div className="assistant-response">
      <div className={`assistant-card ${conversational ? "conversational" : "guided"}`}>
        {!conversational && <div className="assistant-label"><span>{reply.mode === "safety" ? <AlertTriangle size={15} /> : <Sparkles size={15} />}{reply.label}</span>{reply.mode === "safety" && <DemoBadge>Activación preventiva</DemoBadge>}</div>}
        {!conversational && <h2>{reply.title}</h2>}
        <p className="assistant-intro">{reply.introduction}</p>
        {conversational && reply.insight && <p className="assistant-insight">{reply.insight}</p>}
        {reply.emotion && reply.emotion.primary !== "no_clara" && reply.emotion.confidence !== "baja" && <div className="emotion-signal"><Sparkles size={14} /><span>Señal tentativa: <strong>{emotionLabels[reply.emotion.primary]}</strong> · {reply.emotion.progress.replace("_", " ")}</span><small>No es diagnóstico</small></div>}
        {reply.mode === "safety" && <div className="expanded-safety-guidance">{reply.insight && <div className="context-reading"><CircleHelp size={18} /><div><strong>Por qué se activó esta ayuda</strong><p>{reply.insight}</p></div></div>}<div className="response-steps">{reply.steps.map((step) => <div key={`${step.horizon}-${step.text}`}><span>{step.horizon}</span><p>{step.text}</p></div>)}</div></div>}
      </div>
      {reply.mode === "safety" ? <div className="assistant-question"><strong>{reply.question}</strong><div>{reply.choices.map((choice) => <button key={choice} disabled={disabled} onClick={() => reply.openHelp && choice.includes("Abrir") ? onHelp() : onChoice(choice)}>{choice}<ArrowRight size={15} /></button>)}</div></div> : conversational ? (reply.question || reply.choices.length > 0) && <div className="assistant-question conversational-followup">{reply.question && <strong>{reply.question}</strong>}<div>{reply.choices.map((choice) => <button key={choice} disabled={disabled} onClick={() => onChoice(choice)}>{choice}<ArrowRight size={15} /></button>)}</div></div> : hasGuidance && <button className="reopen-prompt" disabled={disabled} onClick={onReopenPrompt}><ListChecks size={14} /> Ver plan y opciones</button>}
      {sources.length > 0 && <div className="reply-footer"><button onClick={() => navigate("resources")}><BookOpenCheck size={15} /> {sources.length} {sources.length === 1 ? "fuente verificada" : "fuentes verificadas"}</button><span>{sources.map((source) => source?.organization).join(" · ")}</span></div>}
    </div>
  </article>;
}

function ChatCompanionChip({ profile, garden, gaining }: { profile: DemoProfile; garden: PetGardenApi; gaining: boolean }) {
  const isMascot = profile.companionType === "mascota";
  const animal = mascots.find((item) => item.id === profile.mascot) ?? mascots[0];
  const flower = flowers.find((item) => item.id === profile.flower) ?? flowers[0];
  const stageCount = isMascot ? animal.stages.length : flower.stages.length;
  const stage = stageForGrowth(garden.growth, stageCount);
  return (
    <div className={`chat-companion-chip ${gaining ? "chat-companion-chip--gain" : ""}`} title={`Crecimiento de tu compañero: ${garden.growth}%`}>
      <span className="pet-idle pet-idle--breathe">
        {isMascot ? <Mascot id={profile.mascot} size="tiny" mood={garden.mood} stage={stage} /> : <Flower id={profile.flower} stage={stage} neglected={garden.isNeglected} size="tiny" />}
      </span>
      <div className="chat-companion-progress"><span style={{ width: `${garden.growth}%` }} /></div>
    </div>
  );
}

function summarizeReply(reply: ConversationReply) {
  const actions = reply.steps.map((step) => `${step.horizon}: ${step.text}`).join(" ");
  return `${reply.introduction} ${reply.insight || ""} ${actions} ${reply.question ? `Pregunta: ${reply.question}` : ""}`.trim().slice(0, 1200);
}
