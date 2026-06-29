# Prompts — Endpoints de LTI para la vista Kanban (FV)


## Prompt 0 — Cargar contexto del repo (exploración, sin escribir código)


```
Eres un desarrollador backend senior. Vamos a trabajar sobre este repositorio Express + TypeScript + Prisma.

Antes de escribir código, analiza y resúmeme:
1. La arquitectura por capas: cómo fluye una petición desde `src/routes` → `src/presentation/controllers` → `src/application/services` → `src/domain/models` / Prisma. Usa como ejemplo el flujo existente de `POST /candidates` y `GET /candidates/:id`.
2. Cómo se accede a Prisma (revisa `src/index.ts`: el middleware que añade `req.prisma`) y cómo lo instancian hoy los modelos de dominio.
3. El esquema en `prisma/schema.prisma`: relaciones entre `Position`, `Application`, `Candidate`, `Interview` e `InterviewStep`, y la nullabilidad de `Interview.score`.
4. El manejo de errores y los códigos de estado (400/404/500) en los controladores actuales.

No escribas código todavía. Devuélveme el mapa mental y la lista exacta de archivos que tocaríamos para añadir dos endpoints sin romper el patrón.
```


---

## Prompt 1 — Diseñar el contrato (resolver ambigüedades ANTES de codear)


```
Diseñemos el contrato de los dos endpoints ANTES de implementarlos. Para cada uno: ruta, params, body, respuesta de éxito (ejemplo JSON) y casos de error con su código. No escribas implementación.

GET /positions/:id/candidates
- Una fila por Application de esa posición. Cada item: { applicationId, candidateId, fullName (firstName+lastName), currentInterviewStep: { id, name }, averageScore }.
- averageScore: media de Interview.score ignorando los null, redondeada a 1 decimal; null si no hay scores. Justifica el redondeo.
- Errores: 400 si :id no es entero positivo; 404 si la posición no existe; 500 inesperado.

PUT /candidates/:id/stage
- Mueve al candidato a una nueva fase (currentInterviewStep).
- Ambigüedad: ¿:id es Candidate o Application? Como un candidato puede tener varias aplicaciones, propongo :id = candidateId con body { applicationId, currentInterviewStep }. Evalúa, propón la alternativa (:id = applicationId, body { currentInterviewStep }) y recomienda una; la elegida se documenta en el README.
- Validaciones: el candidato existe; la application existe y pertenece a ese candidato; el nuevo currentInterviewStep existe Y pertenece al interviewFlow de la posición de esa application.
- Errores: 400 (entrada inválida o step fuera del flujo), 404 (application/step inexistente), 500 inesperado. Éxito: la application actualizada con su interviewStep.

Regla transversal de validación de ids: todos los ids (:id, applicationId, currentInterviewStep) son enteros estrictamente positivos. No uses parseInt a secas (acepta "12abc" como 12): valida la cadena completa y > 0.

Dame el contrato final de ambos y espera mi OK.
```


---

## Prompt 2 — Implementar `GET /positions/:id/candidates` (capa por capa)

```
Implementa GET /positions/:id/candidates respetando EXACTAMENTE la arquitectura por capas y el contrato acordado. Crea:

1. `src/application/services/positionService.ts` con `getCandidatesByPosition(positionId: number)`:
   - Prisma: trae las Application de esa posición con `include` de candidate, interviewStep e interviews (select solo de score).
   - Mapea a { applicationId, candidateId, fullName, currentInterviewStep: { id, name }, averageScore }.
   - averageScore: media de los interviews[].score no nulos, redondeada a 1 decimal; null si no hay scores.
   - Si la posición no existe, lanza un error con `status = 404`.
   - Reusa el PrismaClient a nivel de módulo (singleton), no uno por llamada.

2. `src/presentation/controllers/positionController.ts` con `getCandidatesByPositionController(req, res)`:
   - Valida el id (entero positivo) → 400 si no.
   - 200 con el array; mapea error.status (400/404); 500 genérico (loguea el error real, no lo expongas).
   - Mismo estilo de try/catch que candidateController.ts.

3. `src/routes/positionRoutes.ts` con `GET /:id/candidates`.
4. Monta el router en `src/index.ts`: `app.use('/positions', positionRoutes)`.

TypeScript estricto, sin `any` innecesarios. No modifiques el esquema de Prisma. Muéstrame los archivos completos.
```


---

## Prompt 3 — Implementar `PUT /candidates/:id/stage`


```
Implementa PUT /candidates/:id/stage según el contrato, EXTENDIENDO los archivos de candidate:

1. En `src/application/services/candidateService.ts`, añade `updateCandidateStage(candidateId, applicationId, newInterviewStepId)`:
   - Trae la application con `include: { position: { select: { interviewFlowId: true } } }`.
   - Si no existe o `candidateId` no coincide → error status 404.
   - Trae el InterviewStep (select id, interviewFlowId). Si no existe → error status 404.
   - Si `interviewStep.interviewFlowId !== application.position.interviewFlowId` → error status 400 ("step fuera del flujo de la posición").
   - Actualiza Application.currentInterviewStep y devuelve la application con su interviewStep { id, name }.

2. En `src/presentation/controllers/candidateController.ts`, añade `updateCandidateStage(req, res)`:
   - Valida `:id`, `applicationId` y `currentInterviewStep` como enteros positivos → 400 si falla.
   - Mapea error.status (400/404); 500 genérico.

3. En `src/routes/candidateRoutes.ts`, añade `router.put('/:id/stage', updateCandidateStage)`.

Tipado estricto y manejo de errores consistente. Muéstrame solo los diffs.
```

---

## Prompt 4 — Validación estricta de ids reutilizable


```
Crea `src/presentation/utils/parseId.ts` con `parsePositiveInt(value: unknown): number | null`:
- Acepta numbers enteros > 0 y strings que casen `/^\d+$/` (trim) y > 0.
- Devuelve null para "12abc", "0", "-1", "1.5", 0, negativos, NaN, null, undefined y objetos.
- Compatible con target es5 (no uses Number.isInteger: usa isFinite + módulo).

Sustituye en positionController y candidateController el `parseInt(...) + isNaN` por `parsePositiveInt`, devolviendo 400 cuando sea null. Añade un test unitario exhaustivo de parsePositiveInt (casos válidos y rechazados).
```


---

## Prompt 5 — Tests con Jest (Prisma mockeado)


```
Escribe tests con Jest (ts-jest) mockeando @prisma/client (PrismaClient devuelve mocks de los métodos usados). Mockea el módulo antes de importar el código bajo prueba.

positionService.test.ts:
- 200 con varios candidatos: verifica fullName, currentInterviewStep {id,name} y averageScore (incluye un caso con score null mezclado → media de los no-nulos; y un caso sin entrevistas → null).
- Posición sin candidatos → []. Posición inexistente → error status 404.

candidateService.test.ts (updateCandidateStage):
- 200 cuando application pertenece al candidato y el step es del mismo flujo.
- 404 si la application no existe o es de otro candidato; 404 si el step no existe.
- 400 si el step pertenece a otro interviewFlow.

positionController.test.ts y candidateController.test.ts:
- 400 para ids malformados/no positivos (incluye "12abc", "0", "-1", "1.5") y body inválido.
- 200 delegando en el service con los argumentos parseados; 404 cuando el service lanza status 404.

`npm test` debe quedar en verde. Enséñame el resumen de suites y conteo de tests.
```


---

## Prompt 6 — Documentación (README)


```
Añade al README una sección "Kanban Endpoints" para los dos endpoints: método, ruta, params, body de ejemplo, respuesta de ejemplo y códigos de error. Documenta explícitamente:
- La decisión de diseño de `:id` en PUT /candidates/:id/stage y por qué.
- Que averageScore ignora los scores null y es null si no hay entrevistas con score.
- Que todos los ids son enteros estrictamente positivos (12abc/0/-1 → 400) y que el step debe pertenecer al flujo de la posición.

Solo documentación, sin cambiar comportamiento.
```

---

## Prompt 7 — Auto-revisión / endurecimiento (como revisor del PR)

```
Auto-revisa todo lo implementado como si fueras el revisor del PR. Comprueba y corrige:
- Patrón de capas y estilo de error handling consistentes con el repo.
- Tipado estricto: sin `any` innecesarios.
- Queries Prisma eficientes (sin N+1: `include`/`select`, una query por endpoint).
- Validación de ids: entero estrictamente positivo; rechazar "12abc", "0", negativos y decimales (no fiarse de parseInt).
- El step destino pertenece al interviewFlow de la posición.
- 500 nunca filtra el error interno (payload genérico + log).
- PrismaClient reutilizado (no uno por request).
- Edge cases: posición sin candidatos (array vacío), application sin entrevistas, scores null.
- `npm run build` (tsc) y `npm test` pasan.

Dame la lista de hallazgos, aplica los arreglos y resume qué quedó listo para el commit.
```

---
