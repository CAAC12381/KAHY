# KAHY

Prototipo de primer auxilio psicológico: React + Vite + Tailwind CSS, corriendo dentro de Figma Make.

## Poner el proyecto a andar (una sola vez, cada persona)

Requisitos: [Git](https://git-scm.com/downloads), [Node.js](https://nodejs.org/) y [pnpm](https://pnpm.io/installation). Las versiones exactas están en `.mise.toml`.

```bash
git clone https://github.com/CAAC12381/KAHY.git
cd KAHY
pnpm install
```

Luego abre Claude Code en esa carpeta (`claude` en la terminal, o Claude Code Desktop apuntando a esa ruta) y pídele que corra el servidor de desarrollo, o hazlo tú mismo:

```bash
pnpm dev
```

La app queda disponible en `http://localhost:8443`.

## Flujo de trabajo en equipo

Somos varias personas editando el mismo proyecto, cada quien desde su propio Claude Code. Para no pisarnos el trabajo:

1. **Antes de empezar a trabajar:** `git pull` — trae lo que los demás ya subieron.
2. **Crea tu propia rama** para lo que vas a hacer, no trabajes directo en `main`:
   ```bash
   git checkout -b nombre-de-lo-que-vas-a-hacer
   ```
3. Trabaja normal con Claude Code.
4. **Al terminar ese pedazo de trabajo**, súbelo:
   ```bash
   git add -A
   git commit -m "descripción del cambio"
   git push -u origin nombre-de-lo-que-vas-a-hacer
   ```
5. Abre un **Pull Request** en GitHub de tu rama hacia `main`. Ahí se revisa antes de juntarlo con el trabajo de los demás.
6. Cuando se aprueba y se mezcla, todos hacen `git pull origin main` para tener la versión más reciente.

No es edición literal en tiempo real (letra por letra); es sincronización por ramas y Pull Requests, que es lo que evita que dos personas se borren el trabajo si tocan el mismo archivo al mismo tiempo.

## Privacidad y alcance

Este es un prototipo de demostración: no ofrece diagnóstico, terapia ni respuesta de emergencia real. No se guarda el chat ni se crea un expediente clínico. Ver [AGENTS.md](AGENTS.md) para la estructura del proyecto.
