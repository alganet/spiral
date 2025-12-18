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
