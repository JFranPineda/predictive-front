# predictive-front

Frontend del sistema de mantenimiento predictivo. React 19 + TypeScript + Vite,
Redux Toolkit / RTK Query, Tailwind 4. Arquitectura modular en espejo del
backend.

El diseño completo está en [`predictive-docs`](../predictive-docs); la parte de
frontend, en [arquitectura §7](../predictive-docs/docs/01-architecture.md).

## Arranque

```bash
npm install
npm run dev          # http://localhost:5173, proxy a http://localhost:8000
npm test
npm run api:types    # regenera src/types/api.d.ts desde el OpenAPI del backend
```

## Estructura

```
src/
├── app/                shell: store, router, registro de módulos, sesión
│   ├── moduleRegistry.ts   qué módulo se carga y cuándo
│   ├── api/baseApi.ts      un solo cliente RTK Query para toda la app
│   └── store.ts            combineSlices con inyección perezosa
├── shared/             design system y utilidades
└── modules/<módulo>/
    ├── index.ts            ModuleDefinition: rutas, permisos, reducer
    ├── domain/             tipos y reglas puras (sin React, sin red)
    ├── application/        hooks de caso de uso y selectores
    ├── infrastructure/     endpoints RTK Query
    └── ui/                 páginas y componentes
```

## Cómo se monta la aplicación

1. Login → JWT.
2. `GET /api/v1/session/bootstrap/` devuelve usuario, permisos, **módulos
   instalados** y el menú que aportan.
3. `loadModules()` importa solo esos módulos → `registerEndpoints()` e
   `injectModuleReducer()`.
4. El router monta únicamente las rutas cuyo permiso tiene el usuario.

Nada del shell conoce un módulo concreto. Instalar uno desde
*Configuración → Aplicaciones* invalida `Bootstrap` y el menú se rehace sin
recargar la página. Un módulo desinstalado no descarga ni un byte de su chunk.

## Reglas

- **Estado del servidor solo en RTK Query.** No se copia a un slice. Redux
  clásico queda para sesión, preferencias de UI y la cola de subida de imágenes.
- **Los tipos de la API no se escriben a mano**: salen de `npm run api:types`.
- **Tailwind, sin CSS propio.** Ni estilos en línea ni CSS scoped.
- Un módulo no importa el interior de otro; se habla por API o por `@shared`.

## Tests

`npm test` cubre la lógica de dominio del cliente sin tocar red: el registro de
módulos y el filtrado por permisos, la separación condición/disponibilidad, la
matriz de tendencias y la cascada de umbrales.
