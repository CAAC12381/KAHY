# Planos de KAHY — Diagramas técnicos

Documentación de arquitectura reconstruida a partir del código fuente real de la rama `main`: nombres de
componentes, hooks, claves de `localStorage` y rutas de API son literales del proyecto, no ilustrativos.

KAHY es un prototipo de primer auxilio psicológico: un chat de orientación con motor de reglas local, un
rincón de compañía con una mascota o planta que crece con el uso, y un módulo de autorreporte (PHQ-9, GAD-7,
ASRS, PCL-5) que nunca calcula un nivel de riesgo por sí solo. No tiene base de datos: todo se guarda en el
`localStorage` del dispositivo, salvo la generación de respuestas del chat, que pasa por una función
serverless hacia Groq/OpenAI.

- [1. Diagrama de casos de uso](#1-diagrama-de-casos-de-uso)
- [2. Arquitectura de componentes](#2-arquitectura-de-componentes)
- [3. Modelo entidad–relación](#3-modelo-entidad-relación)
- [4. Diagrama de flujo de datos](#4-diagrama-de-flujo-de-datos)

---

## 1. Diagrama de casos de uso

Un único actor principal —la persona usuaria, con o sin cuenta registrada— concentra casi toda la
interacción. El **proveedor de IA externo** (Groq u OpenAI) participa como actor secundario solo dentro de la
conversación: si no responde, KAHY sigue funcionando con su motor de reglas local. Dos relaciones `«extend»`
son deliberadas: la seguridad nunca es un caso de uso aparte que alguien elige, sino algo que se activa encima
de otro caso cuando el contenido lo amerita.

```mermaid
flowchart LR
  Usuario(["🧑 Usuario"])
  IA(["🤖 Proveedor de IA (externo)"])

  subgraph SYS["Sistema KAHY"]
    direction TB
    UC1(["Registrarse o<br/>explorar sin cuenta"])
    UC2(["Elegir y personalizar<br/>compañero"])
    UC3(["Cuidar al<br/>compañero"])
    UC4(["Marcar hábito<br/>del día"])
    UC5(["Conversar con el chat<br/>de acompañamiento"])
    UC6(["Responder un<br/>tamizaje"])
    UC7(["Actualizar progreso<br/>compartido"])
    UC8(["Detectar señal<br/>de seguridad"])
    UC9(["Mostrar ayuda /<br/>apoyo inmediato"])
    UC10(["Consultar fuentes<br/>y evidencia"])
    UC11(["Explorar actividades<br/>breves"])
    UC12(["Ver directorio de<br/>especialistas"])
    UC13(["Configurar accesibilidad<br/>y privacidad"])
    UC14(["Borrar datos<br/>locales"])
  end

  Usuario --- UC1
  Usuario --- UC2
  Usuario --- UC3
  Usuario --- UC4
  Usuario --- UC5
  Usuario --- UC6
  Usuario --- UC10
  Usuario --- UC11
  Usuario --- UC12
  Usuario --- UC13
  Usuario --- UC14
  IA --- UC5

  UC5 -.->|"«include»"| UC8
  UC5 -.->|"«include»"| UC7
  UC5 -.->|"«include»"| UC10
  UC3 -.->|"«include»"| UC7
  UC4 -.->|"«include»"| UC7
  UC6 -.->|"«include»"| UC10
  UC8 -.->|"«extend»"| UC9
  UC6 -.->|"«extend»"| UC9
```

**Notas**

- *Actualizar progreso compartido* es el caso de uso más incluido: cuidar al compañero, marcar un hábito y
  conversar en el chat alimentan el **mismo** contador de crecimiento (`usePetGarden`), no tres sistemas
  separados.
- *Consultar fuentes y evidencia* se reutiliza desde el chat, el tamizaje y la biblioteca de recursos: toda
  afirmación remite al mismo catálogo verificado (`trustedSources`).
- ⚠️ *Mostrar ayuda / apoyo inmediato* nunca se activa por elección del usuario: se extiende automáticamente
  desde *Detectar señal de seguridad* (frase explícita en el chat) o desde cualquier respuesta positiva al
  ítem 9 del PHQ-9 en el tamizaje.

---

## 2. Arquitectura de componentes

Todo el estado con significado —perfil, preferencias, resultados de tamizaje y el progreso del compañero—
vive en `App.tsx` y baja por props a las páginas, siguiendo el mismo patrón para los cuatro. No hay base de
datos: cuatro hooks distintos son quienes de verdad hablan con `localStorage`. El chat es la única pieza que
sale del navegador, y solo para pedir una respuesta redactada; si la función serverless no responde, cae de
inmediato a su propio motor de reglas.

```mermaid
flowchart TB
  subgraph CLIENTE["Cliente — SPA en React + Vite"]
    APP["App.tsx<br/>estado raíz: profile · preferences · screenings · garden"]
    SHELL["AppShell<br/>navegación"]
    HOME["HomePage"]
    CHAT["ChatPage"]
    SCREEN["ScreeningPage"]
    ACT["ActivitiesPage"]
    PROF["ProfilePage"]
    SPEC["SpecialistsPage"]
    RES["ResourcesPage"]
    ONB["AccessFlow / Onboarding"]
    PETG["PetGarden"]
    MASC["Mascot / Flower"]
    SUPB["SupportBanner"]
    HPG["usePetGarden"]
    HSC["useScreenings"]
    HCM["useChatMemory"]
    HDH["useDailyHabits"]
    MDATA["mock/data.ts<br/>catálogo"]
    MCONV["mock/conversation.ts<br/>motor de reglas"]
    MSCR["mock/screenings.ts"]
    SVC["services/chatApi.ts"]

    APP --> SHELL
    APP --> ONB
    SHELL --> HOME & CHAT & SCREEN & ACT & PROF & SPEC & RES
    HOME --> PETG --> MASC
    HOME --> HPG
    HOME --> HDH
    CHAT --> HPG
    CHAT --> HCM
    CHAT --> SVC
    CHAT --> SUPB
    SCREEN --> HSC
    SCREEN --> SUPB
    SCREEN --> MSCR
    PROF --> HPG
    PROF --> HSC
    HSC --> MSCR
    MSCR --> MDATA
    HPG --> MDATA
    CHAT -.->|"si la API falla:<br/>createReply() local"| MCONV
    MCONV --> MDATA
  end

  LS[("localStorage<br/>del navegador")]
  HPG -.->|persiste| LS
  HSC -.->|persiste| LS
  HCM -.->|persiste| LS
  HDH -.->|persiste| LS

  subgraph SERVIDOR["Funciones serverless — Vercel"]
    APICH["api/kahy/chat.ts"]
    APIST["api/kahy/status.ts"]
    KAHYAI["server/kahyAi.ts<br/>elige proveedor + modera contenido"]
    APICH --> KAHYAI
    APIST --> KAHYAI
  end

  SVC -->|"POST /api/kahy/chat<br/>GET /api/kahy/status"| APICH

  EXT[["Groq / OpenAI"]]
  KAHYAI -->|petición HTTP| EXT
  EXT -->|respuesta generada| KAHYAI
```

**Notas**

- Cinco claves distintas de `localStorage` — `kahy.registration.v1`, `kahy.pet-garden.v1`,
  `kahy.screenings.v1`, `kahy.chat-memory.v1`, `kahy.daily-habits.v1` — cada una detrás de su propio hook,
  ninguna compartida directamente entre componentes.
- `server/kahyAi.ts` prioriza **Groq** sobre **OpenAI** según qué variable de entorno exista, y añade una capa
  de moderación antes de responder.
- El mismo módulo `mock/conversation.ts` sirve dos rutas: es el *fallback* del cliente cuando la IA falla, y
  la fuente de la que se nutre el propio servidor al construir el contexto de seguridad.

---

## 3. Modelo entidad–relación

KAHY no tiene servidor de datos: este es el modelo **lógico** que subyace a los objetos JSON guardados en el
dispositivo, no un esquema de tablas. Se dibuja como entidad–relación porque es la manera más clara de
mostrar algo que el código ya hace cumplir: un perfil solo puede tener *una* mascota y *una* planta activas a
la vez, y comparte un único progreso sin importar cuál esté eligiendo en un momento dado.

```mermaid
erDiagram
    PERFIL ||--|| PREFERENCIAS : define
    PERFIL |o--o| PROGRESO_COMPANERO : acumula
    PERFIL }o--|| MASCOTA : elige
    PERFIL }o--|| PLANTA : elige
    PERFIL ||--o{ RESULTADO_TAMIZAJE : genera
    PERFIL ||--o{ HABITO_DIARIO : marca
    PERFIL ||--o{ MEMORIA_CHAT : recuerda
    CUESTIONARIO ||--o{ RESULTADO_TAMIZAJE : "se responde como"
    CUESTIONARIO }o--o{ FUENTE_CONFIABLE : cita
    HABITO ||--o{ HABITO_DIARIO : "se marca como"

    PERFIL {
        string name
        string companionType
        string mascotId FK
        string flowerId FK
        string city
        string[] goals
    }
    PREFERENCIAS {
        boolean reducedMotion
        boolean lowStimuli
        boolean simplified
        boolean showMascot
        string textScale
        boolean rememberConversations
    }
    PROGRESO_COMPANERO {
        int happiness
        int bond
        int progress
        datetime lastCare
    }
    MASCOTA {
        string id PK
        string name
        string animal
        string[] stages
        string sadImage
    }
    PLANTA {
        string id PK
        string name
        string[] stages
        string wiltedImage
    }
    HABITO {
        string id PK
        string label
    }
    HABITO_DIARIO {
        date fecha PK
        string habitoId FK
    }
    CUESTIONARIO {
        string id PK
        string nombre
        string[] items
        json scoring
    }
    RESULTADO_TAMIZAJE {
        string cuestionarioId FK
        datetime completedAt
        int score
        string band
        boolean item9Positive
    }
    FUENTE_CONFIABLE {
        string id PK
        string title
        string organization
        string url
    }
    MEMORIA_CHAT {
        string topic
        datetime at
    }
```

**Notas**

- `PROGRESO_COMPANERO` se relaciona una sola vez con `PERFIL`: el mismo `progress` crece sin importar si en
  ese momento el perfil apunta a una mascota o a una planta.
- El campo `item9Positive` en `RESULTADO_TAMIZAJE` es booleano, no una escala de riesgo — se calcula solo para
  el PHQ-9 y solo dispara la interfaz de apoyo, nunca una clasificación.
- `CUESTIONARIO` y `FUENTE_CONFIABLE` tienen relación muchos-a-muchos: cada instrumento cita entre 2 y 3
  fuentes (UNAM, NICE, Harvard/OMS) que la interfaz despliega junto al resultado.

---

## 4. Diagrama de flujo de datos

Nivel 0 primero, para ubicar el sistema completo frente a sus dos únicos límites externos; luego el nivel 1,
que abre esa burbuja en los cinco procesos reales del código y los seis almacenes de datos que efectivamente
escribe (cinco en `localStorage`, uno estático en el propio bundle).

### 4a. Nivel 0 — diagrama de contexto

```mermaid
flowchart LR
  U[["🧑 Usuario"]]
  IA[["🤖 Proveedor de IA externo"]]
  SYS((0<br/>Sistema<br/>KAHY))
  U -->|"registro · cuidado · mensajes ·<br/>respuestas de tamizaje · hábitos"| SYS
  SYS -->|"vistas · progreso ·<br/>respuestas · apoyo inmediato"| U
  SYS -->|historial reciente de la conversación| IA
  IA -->|respuesta redactada| SYS
```

### 4b. Nivel 1 — procesos y almacenes

```mermaid
flowchart LR
  U[["🧑 Usuario"]]
  IA[["🤖 Proveedor de IA<br/>Groq / OpenAI"]]

  P1((1.0<br/>Gestionar perfil<br/>y preferencias))
  P2((2.0<br/>Gestionar compañero<br/>y progreso))
  P3((3.0<br/>Procesar<br/>conversación))
  P4((4.0<br/>Aplicar<br/>tamizaje))
  P5((5.0<br/>Gestionar hábitos<br/>y actividades))

  D1[("D1 Perfil /<br/>Preferencias")]
  D2[("D2 Progreso del<br/>compañero")]
  D3[("D3 Resultados de<br/>tamizaje")]
  D4[("D4 Memoria<br/>de chat")]
  D5[("D5 Hábitos<br/>del día")]
  D6[("D6 Catálogo estático<br/>mascotas · cuestionarios · fuentes")]

  U -->|datos de registro| P1
  P1 -->|perfil guardado| D1
  D1 -.->|perfil activo| P2
  D1 -.->|perfil activo| P3
  D1 -.->|perfil activo| P4

  U -->|cuidar / hábito manual| P2
  P2 -->|progreso actualizado| D2
  D2 -.->|etapa de crecimiento| U

  U -->|mensaje| P3
  P3 -->|últimos 10 mensajes| IA
  IA -->|respuesta generada| P3
  P3 -->|tema tratado| D4
  P3 -->|XP de conversación| P2
  P3 -->|respuesta / alerta de seguridad| U

  U -->|respuestas del cuestionario| P4
  P4 -->|resultado y banda| D3
  P4 -->|alerta ítem 9 positivo| U

  U -->|hábito marcado| P5
  P5 -->|XP de hábito| P2
  P5 -->|estado del día| D5

  D6 -.->|catálogo| P1
  D6 -.->|catálogo| P2
  D6 -.->|catálogo| P3
  D6 -.->|catálogo| P4
```

**Leyenda:** círculo = proceso · cilindro = almacén de datos · rectángulo doble = entidad externa.

**Notas**

- `2.0 Gestionar compañero y progreso` es el único proceso que escribe en `D2`, y lo alimentan tres flujos
  distintos (cuidado directo, hábito, chat) — es el mismo mecanismo detrás de
  `usePetGarden().gainFromHabit()` y `gainFromChat()`.
- El flujo `P3 → IA` nunca incluye el texto completo del historial: solo los últimos 10 turnos, resumidos, y
  sin nombre, domicilio ni otros identificadores.

> **Ruta de seguridad, fuera del flujo normal.** Tanto `3.0` como `4.0` pueden emitir una alerta de seguridad
> directo al usuario sin pasar por ningún almacén de datos intermedio ni por el proveedor de IA: una frase
> explícita en el chat, o un ítem 9 positivo en el PHQ-9, muestran la Línea de la Vida (800 911 2000) de
> inmediato. El sistema nunca calcula ni persiste un nivel de riesgo — solo decide, en el momento, si mostrar
> ese recurso.
