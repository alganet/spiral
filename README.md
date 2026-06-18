<!--
SPDX-FileCopyrightText: 2025 Alexandre Gomes Gaigalas <alganet@gmail.com>

SPDX-License-Identifier: ISC
-->

# alganet/spiral

Experiments around spiral patterns inspired by the Ulam spiral.

https://alganet.github.io/spiral/

## Spiral Logic

### Ulam Spiral (`ulam-spiral`)
This is the classic Ulam spiral on a square grid.
- It starts at the center and moves in a spiral pattern: Right, Up, Left, Down.
- The step size increases by 1 every two turns (1 step Right, 1 step Up, 2 steps Left, 2 steps Down, etc.).

### Archimedean Ulam (`archimedean-ulam`)
This visualization plots natural numbers using polar coordinates based on the formula:
- $r = c \sqrt{n}$
- $\theta = \sqrt{n} \times 2\pi$

The polar coordinates are converted to Cartesian $(x, y)$ to plot each number $n$.

### Polygonal Spiral (`polygonal-spiral`)
This spiral draws concentric polygons where the number of sides $S$ is configurable.
- The spiral is built in layers.
- Each layer consists of a polygon with $S$ sides.
- Numbers are mapped sequentially along the perimeter of these polygons.

### Pioneer Hierarchy (`pioneer`)
A recursive visualization of prime gaps using a **Polar Coordinate System** with a configurable modulus (defaulting to 18).
-   **Structure**: The plane is divided into slices (rays). Primes predominantly cluster on specific rays based on modular arithmetic (e.g., Mod 6, Mod 18).
-   **Drill Down**: Users can select specific gap types (e.g., "Twin Primes") to filter the view.
-   **Visuals**:
    -   **Arcs**: Connect prime pairs across different rays (jumps).
    -   **Petals**: Connect prime pairs on the *same* ray (loops/resonance).
    -   **Massive Pioneers**: Rare, high-density gaps are highlighted to show the "skeleton" of the prime distribution.

### Multiplication Clock (`multiplication-clock`)
Lays the non-zero numbers `1 … p-1` around a ring and shows that **multiplication mod a prime is a rotation**.
- When `p` is prime, repeatedly multiplying by a single **step-maker** `g` (a primitive root) visits every non-zero number exactly once.
- Order the ring by that walk and a number's angle is "how many `g`-steps reach it". Then `a × b mod p` is just *adding* those step counts — a constant rotation around the ring.
- Toggle **Arrange: steps ↔ value** to contrast the neat rotation against how tangled the same multiplication looks in the ordinary by-value order.
- Toggle **Orbit** to trace `a, a×b, a×b², …`, which draws a regular **star polygon** — the same constant-angle stepping as the polygonal spiral, but driven by `×` instead of `+`.
- Toggle **Slices** to cut the one big ring of `p-1` slots into several small rings (e.g. `12 → 3,4`). A number sits at slot `step mod size` on each ring, and multiplication rotates each ring independently. The cut is **clean** only when the sizes multiply to `p-1` *and* share no common factors (so every number lands on a unique combination of slots). Try `p=13` with cut `3,4` (clean), then `2,6` (two numbers collide), then `p=17` (whose `16 = 2⁴` is a prime power and can't be split at all).

### Möbius × Landings (`mobius-landings`)
Keeps the Möbius spiral as the **base** (what each number is built from: prime / `μ`) and adds **sparse** markers for *significant landings* on the multiplication clock mod `p` — chosen because coloring *every* landing just replaces the Möbius view with an orthogonal one, whereas a sparse overlay can coexist with it.
- **Laps** — `n ≡ 1 (mod p)`: where the `×` clock completes a full turn back to the identity.
- **Squares** — `n mod p` is a quadratic residue (the square landings; a subgroup of half the residues).
- **Roots** — `n mod p` is a primitive root (a generator of the whole `×` clock).
- Toggle each independently against the factorization texture. The question: do these multiplicative classes **align** with the Möbius / twin-prime slices, or cut across them independently?

### Prime-Field Census (`prime-census`)
A single spiral shows one prime's × clock; this **stacks many primes** to surface what the stack knows that one cut cannot. Pick a number `g` and keep multiplying around each prime's clock; sweeping primes `p`:
- how often `g` takes the **full tour** (visits every number = is a *primitive root*) settles near **37%** — and almost any `g` lands there;
- how often `g` is a **perfect square** on the clock (a *quadratic residue*) settles at exactly **0.5**.
- `g = 5` runs stubbornly high (~0.394) — some numbers are just special. *Curiosity:* the ~37% is the unsolved **Artin's constant ≈ 0.3739**; the exact 50% follows from quadratic reciprocity. Computed live in JS. (Analysis scripts: `analysis/`.)

### Riemann Zeta (`riemann-zeta`)
Visualization of the Riemann zeta function $\zeta(s)$ on the critical line $Re(s) = 0.5$.
- Traces the path of $\zeta(0.5 + it)$ in the complex plane as $t$ increases.
- Visualizes the partial sum spiral $S_N = \sum_{n=1}^N n^{-s}$ tending towards the function's value.
- Includes a background colored by the Möbius function $\mu(n)$ mapped to the horizontal range.

### Coloring Scheme
All visualizations use a shared coloring strategy based on number properties:
- **Primes**: Highlighted with a specific color. Twin primes may have a distinct shade.
- **Composite Numbers**: Colored based on the Möbius function $\mu(n)$:
    - $\mu(n) = -1$: Reddish
    - $\mu(n) = 0$: Greenish (contains a squared prime factor)
    - $\mu(n) = 1$: Bluish

## License

ISC
