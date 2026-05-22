# Git Workflow — Auditor Agéntico de Facturación

Guía de ramas y mergeo que preserva el historial completo de commits.

---

## Estructura de ramas

```
master          → producción / demo final
develop         → integración de features (base para PR)
feature/<nombre>  → una rama por funcionalidad o fix
```

---

## Flujo paso a paso

### 1. Crear una rama de feature desde develop

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<nombre-descriptivo>
```

> **Ejemplo:** `git checkout -b feature/mejora-pdf-reporte`

---

### 2. Trabajar y hacer commits

Haz commits pequeños y descriptivos mientras desarrollas:

```bash
git add <archivos>
git commit -m "feat: descripción corta de lo que hace"
```

Convención de prefijos recomendada:

| Prefijo    | Uso                                      |
|------------|------------------------------------------|
| `feat:`    | Nueva funcionalidad                      |
| `fix:`     | Corrección de bug                        |
| `refactor:`| Cambio de código sin cambiar funcionalidad |
| `docs:`    | Solo documentación                       |
| `style:`   | Formato, espacios (sin cambio de lógica) |
| `chore:`   | Tareas de mantenimiento (deps, configs)  |

---

### 3. Subir la rama al repositorio remoto

```bash
git push origin feature/<nombre-descriptivo>
```

---

### 4. Mergear a develop **sin dañar el historial**

Usa siempre `--no-ff` (no fast-forward). Esto crea un **merge commit** que mantiene visible en el historial que esos commits vinieron de una feature branch — sin aplastar ni reescribir nada.

```bash
git checkout develop
git pull origin develop
git merge --no-ff feature/<nombre-descriptivo> -m "Merge feature/<nombre-descriptivo> into develop"
git push origin develop
```

> **¿Por qué `--no-ff`?**
> Sin esta opción, Git mueve el puntero de `develop` directo al último commit de la feature (fast-forward), haciendo que el historial quede como si todo se hubiera hecho en `develop` directamente. Con `--no-ff` queda un nodo de merge que deja claro de dónde vino cada bloque de trabajo.

---

### 5. Eliminar la rama de feature (limpieza)

Una vez mergeada, borra la rama para mantener el repositorio limpio:

```bash
# Borrar local
git branch -d feature/<nombre-descriptivo>

# Borrar remota
git push origin --delete feature/<nombre-descriptivo>
```

---

### 6. Mergear develop a master (cuando hay release)

Igual que en el paso 4, siempre con `--no-ff`:

```bash
git checkout master
git pull origin master
git merge --no-ff develop -m "Merge develop into master — release vX.X"
git push origin master
```

---

## Resumen visual del flujo

```
master  ──────────────────────────────────────────●
                                                  │ merge --no-ff
develop ──────●────────────────────────────────●──┘
              │                                │ merge --no-ff
feature  ─────┴──●──●──●──────────────────────┘
               commit commit commit
```

---

## Comandos de referencia rápida

```bash
# Ver estado de todas las ramas
git branch -a

# Ver historial con el árbol de merges
git log --oneline --graph --all

# Traer cambios de develop a tu feature (sin reescribir historial)
git checkout feature/<nombre>
git merge develop
```

---

## Lo que NO hacer

| Evitar                          | Por qué                                                   |
|---------------------------------|-----------------------------------------------------------|
| `git push --force`              | Reescribe el historial remoto, rompe el trabajo de otros  |
| `git merge` sin `--no-ff`       | Pierde la trazabilidad de las feature branches            |
| `git rebase` en ramas compartidas | Reescribe SHAs, causando conflictos a quien ya las tiene |
| Commitear directo a `master`    | Salta la validación en `develop`                          |
| Commits gigantes tipo "todo el trabajo" | Imposible hacer code review o revertir parcialmente |
