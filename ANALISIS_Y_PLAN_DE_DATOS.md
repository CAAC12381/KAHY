# Análisis integral y plan de datos

## Plataforma web de apoyo en salud mental, crisis y neurodivergencias

**Estado de revisión:** 7 de septiembre de 2026  
**Ámbito recomendado:** México, con piloto inicial en Michoacán  
**Naturaleza del documento:** base de producto, seguridad, datos y gobernanza; no sustituye dictamen clínico, jurídico ni regulatorio.

## 1. Conclusión ejecutiva

La oportunidad del proyecto es real, pero el producto debe posicionarse como una **puerta de acceso y navegación en salud mental**, no como psicólogo, terapeuta, sistema diagnóstico ni predictor de suicidio.

El MVP más defendible debe ofrecer:

1. Psicoeducación y herramientas breves de autocuidado previamente aprobadas.
2. Preferencias de accesibilidad y baja estimulación elegidas por la persona, nunca inferidas por la IA.
3. Directorio versionado de servicios públicos, universitarios y comunitarios.
4. Botones persistentes de ayuda inmediata y un flujo de crisis que funcione aun sin el LLM.
5. Tamizajes autorizados únicamente cuando existe una ruta posterior real y un responsable clínico.
6. Handoff a una persona o institución con horarios, SLA y fallback verificables.
7. Privacidad por diseño: mínima recolección, almacenamiento separado y cero publicidad conductual.

No se recomienda lanzar inicialmente:

- diagnóstico automático o mensajes como “tienes depresión/TDAH/TEPT/autismo”;
- predicción o clasificación de suicidio en “bajo/medio/alto”;
- chat generativo sin límites y disponible como sustituto afectivo;
- telepsicoterapia “totalmente anónima” con promesa simultánea de rescate;
- menores de edad sin un protocolo jurídico y de salvaguarda propio;
- inferencias clínicas basadas en reflejos de juegos, escritura, uso de pantalla, voz o wearables;
- historial completo del chat guardado por defecto;
- entrenamiento del modelo con conversaciones reales de usuarios.

## 2. Evaluación de los materiales entregados

### 2.1 Guía de evidencia y seguridad

La guía es el material más sólido. Distingue correctamente tamizaje, diagnóstico, evaluación clínica y predicción; propone RAG con fuentes versionadas, un motor de seguridad separado del LLM, verificación de salida, modo degradado, escalamiento humano y pruebas adversariales.

Debe usarse como **borrador de gobernanza**, no como corpus que se carga completo a un modelo. Antes de convertir sus reglas en software se debe:

- verificar cada referencia, fecha, jurisdicción y licencia;
- transformar recomendaciones narrativas en políticas aprobadas y casos de prueba;
- asignar propietario clínico, legal y técnico a cada regla;
- registrar contradicciones y revisiones;
- separar evidencia clínica internacional de obligaciones mexicanas.

### 2.2 Documento de cuestionarios

El documento no está listo para implementación literal.

| Instrumento | Evaluación | Decisión |
|---|---|---|
| PHQ-9 | Los nueve reactivos y rangos generales son reconocibles. El ítem 9 no puede tratarse solo como parte de la suma. Esperar únicamente respuestas 2 o 3 dejaría fuera una respuesta 1 que también requiere seguimiento. El ítem 9 tampoco es una evaluación completa de suicidio. | Corregir el protocolo. Cualquier respuesta distinta de 0 debe abrir una comprobación de seguridad aprobada y, cuando corresponda, evaluación humana; la urgencia no se decide por el total del PHQ-9. |
| GAD-7 | Estructura y rangos generales razonables para tamizaje/seguimiento. | Puede considerarse tras validar traducción, población, licencia, comprensión y ruta posterior. Nunca diagnostica. |
| ASRS v1.1 de 6 reactivos | Los reactivos transcritos no corresponden íntegramente a la Parte A estándar y se propone sumar 0-24 con corte 12, mientras el método estándar de la versión en papel depende de respuestas criterio específicas y no debe alterarse. | **No implementar esta transcripción ni su scoring.** Seleccionar la versión oficial, documentar copyright, idioma, población y algoritmo exacto; probarlo con un clínico. |
| “PCL-5 corta de 8 reactivos” | La PCL-5 estándar contiene 20 reactivos y puntúa 0-80. Existen formas abreviadas estudiadas, incluso de 8 reactivos, pero usan una selección concreta de ítems. La lista entregada no coincide con la forma abreviada mexicana publicada y el propio material mezcla resultados de versiones de 8, 12 y 20 ítems. | **No implementar.** Elegir deliberadamente PCL-5 completa, PC-PTSD-5 u otra forma abreviada validada para la población y propósito; conservar ítems y scoring sin alteración. |

También falta cubrir de forma coherente el reto original de adicciones. AUDIT y ASSIST son candidatos, pero solo después de definir capacitación, licencia, población, interpretación y respuesta ante intoxicación o abstinencia. Un tamizaje positivo nunca debe llevar al bot a recomendar suspender de golpe alcohol, sedantes o medicación.

La opción “no sé qué tengo” no debe intentar descubrir un trastorno. Debe convertirse en un **enrutador de necesidades**: “¿qué te está dificultando hoy?”, “¿necesitas ayuda inmediata?”, “¿prefieres información, una herramienta breve o hablar con alguien?”.

### 2.3 Bot, juegos e interfaces

Ideas que pueden conservarse:

- onboarding por preferencias;
- respuestas breves, literales y paso a paso;
- modo de baja estimulación y reducción de movimiento;
- sonido siempre opcional y nunca automático;
- desglose de tareas en acciones mínimas;
- ejercicios sin competencia, penalizaciones ni tablas de posiciones;
- posibilidad de pausar o abandonar sin culpa;
- mascota y elementos visuales como acompañamiento no clínico;
- juegos con check-in autorreportado antes/después;
- directorio, teleorientación de bajo consumo y fallback telefónico;
- lenguaje transparente: es una IA y no sustituye atención profesional.

Ideas que requieren corrección:

- La “detección de historial” debe ser memoria opt-in, editable y borrable. No debe guardar automáticamente todo el chat.
- La personalización debe provenir de preferencias declaradas, no de un diagnóstico inferido.
- La mascota no debe decir que necesita al usuario, castigarlo por ausencia, perder salud ni fomentar exclusividad emocional.
- Las rachas, recordatorios y premios no deben convertir productividad o uso diario en una medida de salud.
- Los juegos no deben medir “disociación”, “shock”, “concentración” o estado clínico a partir del desempeño.
- La crisis no debe limitarse a bloquear contenido. Debe retirar lo no esencial, conservar herramientas de regulación seguras y mostrar ayuda humana; la disposición final depende del protocolo.
- “Sin mensajes repetitivos” no significa improvisar respuestas clínicas. Se puede variar la redacción sin variar la política ni las acciones de seguridad.

## 3. Alcance recomendado por modo de uso

### Modo A: información anónima

- Sin cuenta.
- Psicoeducación, herramientas breves y directorio.
- Preferencias solo en el dispositivo y, de ser posible, solo durante la sesión.
- No historial clínico ni promesa de rescate físico.
- Analítica únicamente agregada y disociada.

### Modo B: autocuidado seudonimizado

- Identificador aleatorio; contacto opcional y separado.
- Historial corto solo con consentimiento.
- Check-ins, recordatorios y mascota opcionales.
- No diagnóstico ni expediente clínico por defecto.
- Explicación clara de que “seudónimo” no significa anonimato absoluto.

### Modo C: teleorientación o telepsicología formal

- Identidad y datos mínimos exigidos por el prestador.
- Consentimiento informado y aviso de privacidad específicos.
- Profesional responsable, jurisdicción, cédula/credenciales y reglas de emergencia.
- Ubicación relevante al inicio de la sesión para saber qué recursos corresponden.
- Expediente clínico separado cuando aplique; NOM-004 y NOM-024 deben revisarse con el prestador.

El usuario debe saber en todo momento en qué modo está y qué cambia al pasar de uno a otro.

## 4. Arquitectura de datos propuesta

```text
PWA / WebApp
  ├─ contenido estático y modo de crisis degradado
  ├─ preferencias de accesibilidad
  └─ consentimiento por finalidad
          ↓
API de aplicación
  ├─ motor determinista de seguridad
  ├─ orquestador de cuestionarios versionados
  ├─ RAG con fuentes aprobadas
  ├─ verificador de salida
  └─ servicio de handoff humano
          ↓
Almacenes separados
  1. Bóveda de identidad y contacto
  2. Datos sensibles de salud y atención
  3. Conversación efímera / memoria consentida
  4. Directorio y base de conocimiento pública
  5. Auditoría técnica y métricas disociadas
```

La unión entre almacenes se realiza con identificadores aleatorios. La identidad nunca debe estar en la misma tabla que el texto clínico si puede evitarse.

## 5. Catálogo de datos

| Categoría | Ejemplos | Regla de almacenamiento | Acceso | Retención propuesta |
|---|---|---|---|---|
| Consentimiento | versión del aviso, finalidad, fecha, idioma, aceptación/revocación | Obligatorio y versionado; nunca solo un booleano genérico | Privacidad y soporte autorizado | Mientras sea necesario para demostrar la relación y según dictamen jurídico |
| Identidad/contacto | nombre, teléfono, correo, contacto de emergencia | Bóveda separada, cifrado por campo | Personal autorizado para atención/handoff | Solo mientras la finalidad esté activa; cancelar/bloquear conforme a ley, salvo obligación de conservación |
| Preferencias | idioma, modo breve, reducción de movimiento, sonidos, pronombres/términos preferidos | No tratarlas como diagnóstico | Usuario y sistema de presentación | Vida de la cuenta o sesión; borrables |
| Tamizajes | instrumento, versión, respuestas, total, fecha, propósito | Almacén clínico; algoritmo determinista y trazable | Usuario y rol clínico definido | En modo no clínico, no persistir por defecto; en atención formal, conforme al expediente aplicable |
| Señales de seguridad | origen de señal, estado del flujo, acciones ofrecidas/aceptadas, timestamps | Registro mínimo; evitar detalles innecesarios del método | Equipo de crisis y seguridad clínica | Si integra atención clínica, conforme a expediente; si es QA no clínico, conservar versión disociada y por plazo corto aprobado |
| Conversaciones | mensajes, resumen de sesión, preferencias temporales | Efímeras por defecto; cifradas; sin entrenamiento automático | Usuario; acceso humano excepcional y auditado | Sesión; para piloto puede aprobarse un máximo corto, por ejemplo 30 días, solo con consentimiento |
| Notas profesionales | evaluación, plan, derivación, seguimiento | Separadas de los mensajes del bot; autor y firma/fecha | Profesional y organización asistencial | Si son expediente clínico, NOM-004 establece mínimo de 5 años desde el último acto médico |
| Directorio | servicio, municipio, teléfono, horario, población, costo, urgencias, última verificación | Base pública versionada con procedencia | Público; edición restringida | Historial de versiones; retirar de producción datos no verificados |
| RAG/evidencia | fuente, versión, jurisdicción, población, licencia, fragmento, revisión | Solo allowlist y contenido con derechos de uso | Curadores y servicio RAG | Según vigencia/licencia; revalidación programada |
| Analítica de producto | pantalla, evento, latencia, error, finalización | Primera parte, sin texto libre ni identificadores publicitarios | Producto/seguridad con datos agregados | Eventos crudos 30-90 días; agregados disociados según política |
| Trazas de IA | modelo, prompt/policy, fuentes recuperadas, bloqueos, resultado del verificador | Redactar PII antes del log; separar contenido de metadatos | Seguridad de IA | Plazo corto para depuración; ampliar solo por incidente aprobado |
| Gamificación | mascota, accesorios, tareas completadas | No es dato clínico ni señal de riesgo | Usuario y servicio de progreso | Hasta restablecimiento o eliminación de cuenta |
| Audio/video | flujo de teleconsulta | No grabar por defecto; consentimiento separado si existe necesidad real | Prestador autorizado | Política clínica y jurídica específica; nunca reutilizar para entrenamiento sin nueva finalidad y consentimiento |

Los plazos de 30-90 días son propuestas de minimización para un piloto no clínico, no conclusiones legales. Si una interacción constituye atención médica o genera expediente, cambia el régimen de conservación.

## 6. Datos que no deben recolectarse en el MVP

- ubicación GPS exacta durante uso rutinario;
- libreta de contactos;
- identificadores publicitarios o fingerprinting;
- pulsaciones de teclado o grabación de pantalla;
- audio permanente o análisis emocional de voz;
- biometría o wearables;
- detalles gráficos de métodos de autolesión en logs de producto;
- narración traumática como requisito;
- identificación oficial salvo necesidad clínica/jurídica demostrada;
- diagnósticos inferidos por estilo de escritura, demora, juego o navegación;
- listas de “usuarios de alto riesgo” derivadas de un score automático;
- contenido clínico en URLs, parámetros de consulta, herramientas de crash-reporting o analítica externa.

Las direcciones IP pueden aparecer en infraestructura. Deben minimizarse, truncarse o separarse cuando sea viable y conservarse solo por seguridad durante un plazo definido.

## 7. Modelo de datos mínimo

### Identidad y consentimiento

- `user_subject`: UUID aleatorio, modo de uso, estado de cuenta.
- `identity_vault`: UUID, nombre/contacto cifrado, verificación, relación con tutor si aplica.
- `consent_record`: finalidad, versión del aviso, acción afirmativa, idioma, timestamp, revocación.
- `accessibility_preferences`: movimiento, sonido, densidad, longitud, canal, lenguaje preferido.

### Instrumentos

- `instrument`: código, nombre, versión, idioma, población, propósito, licencia, fuente, propietario clínico, estado aprobado.
- `instrument_item`: orden, texto autorizado, opciones, indicador de seguridad, versión.
- `assessment_session`: instrumento/versión, finalidad, modo, inicio/fin, completitud.
- `assessment_response`: ítem, respuesta, timestamp; cifrado.
- `assessment_result`: total/subescala, algoritmo versionado, texto no diagnóstico, revisión humana.

No se debe hardcodear el cuestionario en componentes independientes. La versión exacta y el algoritmo deben ser datos controlados, con pruebas unitarias por instrumento.

### Seguridad y escalamiento

- `safety_event`: señal, canal, regla/clasificador/modelo que la detectó, estado operativo, timestamp.
- `safety_check`: preguntas autorizadas, respuestas y resultado operacional; no “probabilidad de suicidio”.
- `handoff`: destino, disponibilidad conocida, acción ofrecida, aceptación, acuse humano, SLA, fallback.
- `resource_snapshot`: datos del recurso mostrados y fecha de verificación.
- `follow_up`: consentimiento de contacto, responsable, fecha límite y resultado.

Estados recomendados: `normal`, `safety_check_needed`, `awaiting_human`, `emergency_options_shown`, `human_connected`, `follow_up_due`, `connection_failed`. Estos describen el proceso, no etiquetan a la persona como riesgo bajo/medio/alto.

### Conversación e IA

- `chat_session`: modo, consentimiento de historial, fecha de expiración.
- `chat_message`: rol, texto cifrado, categoría de retención, flags de seguridad.
- `model_run`: proveedor/modelo, versión de prompt y políticas, RAG index, latencia, status.
- `retrieval_evidence`: `source_id`, fragmento, versión, score de recuperación, cita mostrada.
- `output_check`: reglas aplicadas, bloqueos y sustitución segura.
- `ai_incident`: severidad, versiones, salida observada, salida esperada, causa, contención y cierre.

### Servicios y atención

- `service`: institución, municipio, modalidad, edad/población, temas atendidos, costo, accesibilidad, idiomas.
- `service_channel`: teléfono, URL, horario, emergencia sí/no, fuente oficial.
- `service_verification`: quién/cuándo/cómo verificó, evidencia, próxima revisión, estado activo.
- `professional`: organización, credencial, jurisdicción, especialidad, horario; acceso separado del directorio público.
- `appointment_or_referral`: servicio, modalidad, estado y mínima información necesaria.

## 8. Reglas específicas para cuestionarios

1. Mostrar que el instrumento es tamizaje y qué ocurrirá con las respuestas antes de comenzar.
2. Permitir omitir o salir, salvo que un flujo clínico supervisado tenga reglas distintas explicadas.
3. Mantener texto, orden, opciones y scoring de la versión autorizada.
4. No mezclar versiones completas y abreviadas ni trasladar cutoffs entre poblaciones.
5. Separar el resultado total de cualquier ítem de seguridad.
6. Una respuesta positiva al ítem 9 del PHQ-9 requiere seguimiento de seguridad; no basta el score total y no debe esperarse exclusivamente a 2 o 3.
7. Un positivo en un instrumento específico debe abrir una evaluación posterior por personal capacitado cuando así lo indique el protocolo.
8. El resultado al usuario debe decir “conviene una evaluación” o “estos síntomas merecen atención”, no “tienes X”.
9. Guardar `instrument_version`, `locale`, algoritmo y fuente junto a cada resultado.
10. Cada actualización del cuestionario requiere pruebas de regresión y aprobación clínica.

## 9. Flujo de crisis y datos

### Detección

- Botón visible “Necesito ayuda ahora”.
- Reglas deterministas para lenguaje directo e indirecto.
- Clasificador contextual como apoyo, no como única barrera.
- Mensajes previos de la sesión para resolver ambigüedad.
- Nunca usar solo sentimiento, frecuencia de uso o desempeño en juegos.

### Respuesta

1. Cambiar a una interfaz breve y predecible.
2. Preguntar primero por seguridad inmediata con un guion aprobado.
3. Conservar accesibles opciones de llamada y una herramienta breve de regulación.
4. Ofrecer 911 para una emergencia y Línea de la Vida `800 911 2000` como apoyo nacional 24/7/365.
5. Transferir a humano solo si existe una integración real; no simular que alguien fue avisado.
6. Si no responde el equipo, mostrar fallback y registrar `connection_failed`.
7. Si se corta la red, desplegar la capa estática local.

En modo anónimo la plataforma no debe decir que puede localizar o rescatar. La ubicación exacta solo se solicita cuando es necesaria para una opción elegida, se explica el propósito y existe una ruta operativa real.

### Registro mínimo del evento

Guardar el tipo de señal, momento, versión de las reglas, acciones ofrecidas, elección del usuario, estado del handoff y verificación del recurso. No guardar detalles innecesarios de método ni duplicar todo el chat en el registro operativo.

## 10. RAG y gobierno de conocimiento

Cada fragmento debe incluir:

- `source_id`, título y editor;
- URL/DOI y versión exacta;
- fecha de publicación, revisión y última verificación;
- país/jurisdicción;
- población y contexto;
- tipo de documento y nivel de evidencia;
- tema y uso permitido;
- uso diagnóstico/predictivo permitido o prohibido;
- necesidad de revisión humana;
- licencia/condiciones de reutilización;
- propietario y próxima fecha de revisión.

Reglas:

- Tier A/B para afirmaciones clínicas; prensa/comerciales solo para incidentes y UX.
- No usar DSM, ISO, libros o escalas protegidas como corpus completo sin licencia.
- No permitir que una fuente internacional sustituya la ley mexicana.
- Una afirmación clínica relevante debe ser trazable a una fuente vigente.
- Si las fuentes discrepan, declarar incertidumbre y elevar a revisión.
- Retirar o bloquear fuentes vencidas antes de reindexar.
- Los datos de usuarios no forman parte de la base de conocimiento.

## 11. Controles de privacidad y seguridad

### Privacidad

- Aviso integral y aviso corto en lenguaje claro.
- Consentimiento separado por atención, historial, recordatorios, handoff, teleconsulta, investigación y mejora del modelo.
- Entrenamiento con datos reales desactivado por defecto.
- Mecanismos ARCO y responsable/departamento de datos.
- Exportación y eliminación desde la cuenta cuando proceda.
- Mapa de transferencias nacionales e internacionales.
- Contratos de encargado con hosting, mensajería, video y proveedor de IA.
- Cero Meta Pixel, Google Ads, retargeting o SDK publicitario en rutas de salud.

### Seguridad técnica

- TLS en tránsito y cifrado en reposo; cifrado de campo para identidad y respuestas sensibles.
- Claves separadas por ambiente y almacén, rotación y KMS/HSM administrado.
- RBAC/ABAC de mínimo privilegio; MFA para personal clínico y administrativo.
- Acceso “break glass” excepcional, temporal, justificado y auditado.
- Auditoría inmutable de accesos y cambios, sin volcar texto clínico innecesario.
- Tokens en cookies `HttpOnly`, `Secure`, `SameSite`; no en `localStorage`.
- `Cache-Control: no-store` para datos sensibles; excluirlos del cache del service worker.
- DLP/redacción antes de logs, errores y trazas del proveedor de IA.
- Backups cifrados, pruebas de restauración y eliminación coherente en copias.
- Inventario y revisión de cada SDK; SBOM y gestión de vulnerabilidades.
- Plan de incidentes, notificación, kill switch y rollback probado.

### Proveedor de IA

El contrato debe especificar que los datos no se usan para entrenar modelos del proveedor, la retención real, región de procesamiento, subencargados, controles de acceso, respuesta a incidentes, eliminación y auditoría. Si esto no puede demostrarse, no se envía texto clínico identificable.

## 12. Métricas adecuadas

### Seguridad y calidad

- respuestas inseguras por 1,000 pruebas;
- falsos negativos y falsos positivos del detector, revisados manualmente;
- escalamiento correcto, sobre-escalamiento y fallos de conexión;
- tiempo hasta acuse humano;
- precisión y vigencia de citas;
- diagnósticos o consejos farmacológicos bloqueados/emitidos indebidamente;
- fallos por dialecto, ortografía, edad, región y accesibilidad;
- abandono durante un flujo de seguridad;
- disponibilidad del modo degradado.

### Utilidad

- la persona encontró un recurso verificable;
- logró contactar o agendar cuando lo eligió;
- completó una herramienta breve sin presión;
- reportó si la herramienta le resultó útil;
- consumo de datos, tiempo de carga y éxito offline.

No usar tiempo dentro del chatbot, número de mensajes, rachas o dependencia diaria como métrica principal de éxito. La meta es resolver y conectar, no retener.

## 13. Hoja de ruta recomendada

### Fase 0: gobernanza

- Definir finalidad prevista y si es bienestar, apoyo, servicio clínico o posible ScDM.
- Nombrar responsable clínico, seguridad del paciente, privacidad, regulación e ingeniería.
- Empezar con personas adultas; dejar menores fuera del primer piloto.
- Aprobar política de crisis, diagnóstico, medicamentos, violencia, psicosis, trauma y adicciones.
- Seleccionar instrumentos oficiales y verificar licencias.
- Firmar acuerdos con la red humana y definir SLA/fallback.
- Crear inventario de datos, DPIA/PIA y matriz de retención.

### Fase 1: prototipo sin datos reales

- Flujos deterministas y contenido curado.
- Directorio versionado.
- PHQ-9/GAD-7 solo después de corrección y aprobación; ASRS/PCL bloqueados.
- Casos sintéticos, simulaciones y red-team.
- Chat generativo en modo sombra, sin mostrarse a usuarios.
- Pruebas de baja conectividad, lector de pantalla, teclado y reducción de movimiento.

### Fase 2: alfa cerrada para adultos

- Información anónima, herramientas breves y directorio.
- Sin teleterapia formal, menores, wearables ni grabaciones.
- Conversación efímera; historial opt-in de corta duración.
- Supervisión en horario delimitado y fallback nacional fuera de horario.
- Monitoreo diario de incidentes y rollback disponible.

### Fase 3: piloto controlado

- Convenio con universidad/gobierno y comité clínico.
- Human-in-the-loop con carga y SLA probados.
- Consentimiento y aviso revisados jurídicamente.
- Evaluación de seguridad, utilidad, equidad y experiencia.
- Investigación solo con revisión ética/institucional cuando corresponda.

### Fase 4: teleatención formal

- Identidad y jurisdicción del usuario/profesional.
- Expediente y retención aplicables.
- Credenciales, agenda, video/audio y plan de emergencia.
- Análisis de COFEPRIS sobre Software como Dispositivo Médico según finalidad real.

## 14. Criterios GO / NO-GO

### GO mínimo

- todos los escenarios críticos canónicos disparan la ruta esperada;
- el rendimiento en paráfrasis, errores ortográficos y variantes regionales supera el umbral aprobado por el comité clínico;
- existe una persona/institución responsable de cada escalamiento y un fallback real;
- los contactos de crisis se verifican antes de cada release y con periodicidad definida;
- no hay SDK publicitario ni texto clínico en logs;
- se puede reconstruir modelo, prompt, reglas, fuentes y directorio de cada incidente;
- kill switch y rollback funcionan dentro del tiempo acordado;
- no existen hallazgos críticos abiertos de seguridad, privacidad o accesibilidad.

### NO-GO

- ASRS/PCL actuales siguen en producción sin corrección;
- el PHQ-9 omite seguimiento ante ítem 9 = 1;
- la IA diagnostica, modifica medicamentos o da falsa tranquilidad;
- se promete anonimato total o rescate que la arquitectura no puede cumplir;
- el handoff no tiene responsable ni SLA;
- el directorio carece de fecha/fuente/estado;
- el sistema depende del LLM o de internet para mostrar ayuda inmediata;
- se usan conversaciones para entrenamiento sin finalidad, consentimiento y supervisión separados;
- no se ha resuelto el manejo de menores y aun así se les permite entrar al mismo flujo.

## 15. Decisiones pendientes del equipo

1. ¿El primer público será exclusivamente de 18 años o más?
2. ¿La entidad responsable será privada, universitaria o gubernamental?
3. ¿El MVP es bienestar/navegación o prestación de atención clínica?
4. ¿Qué municipios e idiomas se cubrirán inicialmente?
5. ¿Qué institución recibe crisis y en qué horario/SLA?
6. ¿Qué pasa si esa institución no responde?
7. ¿Qué datos se requieren para agenda, seguimiento y emergencia?
8. ¿Qué proveedor de nube, IA, video y mensajería se usará y en qué país procesa datos?
9. ¿Qué instrumentos exactos, versiones, licencias y poblaciones se aprobarán?
10. ¿Qué plazo de retención corresponde a cada modo?
11. ¿Qué funciones podrían convertir el producto en ScDM?
12. ¿Cómo se auditarán falsos negativos y cómo se suspenderá una versión defectuosa?

## 16. Fuentes oficiales y primarias verificadas

- [Ley Federal de Protección de Datos Personales en Posesión de los Particulares, reforma vigente al 14-11-2025](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf)
- [NOM-004-SSA3-2012, del expediente clínico](https://platiica.economia.gob.mx/normalizacion/NOM-004-SSA3-2012/)
- [NOM-024-SSA3-2012, sistemas de información de registro electrónico para la salud](https://platiica.economia.gob.mx/normalizacion/nom-024-ssa3-2012/)
- [COFEPRIS: registros y guía para Software como Dispositivo Médico](https://www.gob.mx/cofepris/documentos/registros-dispositivos-medicos)
- [NICE NG225: no usar escalas para predecir suicidio ni estratificación bajo/medio/alto](https://www.nice.org.uk/guidance/ng225/chapter/recommendations)
- [NIMH: ASQ Toolkit y evaluación posterior por un profesional capacitado](https://www.nimh.nih.gov/research/research-conducted-at-nimh/asq-toolkit-materials)
- [VA National Center for PTSD: PCL-5 oficial de 20 reactivos](https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp)
- [Harvard/NCS: condiciones de uso y prohibición de alterar ASRS v1.1](https://www.hcp.med.harvard.edu/ncs/asrs.php)
- [Publicación original de validación del ASRS](https://pubmed.ncbi.nlm.nih.gov/15841682/)
- [Validación mexicana de una PCL-5 abreviada de 4 y 8 reactivos](https://www.sciencedirect.com/science/article/pii/S0165178121004935)
- [Adaptación mexicana adolescente de PCL-5 de 12 reactivos](https://revistapsicologia.uaemex.mx/article/view/26404)
- [Evidencia de que cualquier respuesta positiva al ítem 9 del PHQ-9 requiere seguimiento, especialmente en adolescentes](https://pmc.ncbi.nlm.nih.gov/articles/PMC3217785/)
- [CONASAMA: Línea de la Vida 800 911 2000, 24/7/365](https://www.gob.mx/conasama/es/articulos/linea-de-la-vida-800-911-2000?idiom=es)
- [OMS: ética y gobernanza de IA para la salud](https://www.who.int/publications/i/item/9789240029200)

## 17. Recomendación final

Antes de diseñar base de datos o pantallas definitivas, el equipo debe aprobar cuatro artefactos versionados:

1. **Clinical Knowledge Base:** fuentes, licencias, población y vigencia.
2. **Crisis & Escalation Policy:** señales, guion, responsables, SLA y fallback.
3. **Language & Accessibility Policy:** lenguaje seguro, preferencias y diseño sensorial.
4. **AI Scope & Prohibited Actions:** qué puede hacer, qué no y cómo se verifica.

Después se diseña la base de datos alrededor de esas reglas. No conviene construir primero un chat y tratar de agregar seguridad al final.
