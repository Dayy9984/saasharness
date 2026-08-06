# Apple-inspired Interaction

**Mental model:** Premium, deferential UI. Material and physics clarify context while content stays primary.

Use semantic surfaces, restrained elevation, continuous-feeling corners, press feedback, spatial transitions, and velocity-aware interruption.

Starting spring hypotheses:

```ts
const motion = {
  instant: { stiffness: 500, damping: 38, mass: 0.7 },
  snappy: { stiffness: 340, damping: 30, mass: 0.85 },
  smooth: { stiffness: 220, damping: 26, mass: 1 },
  gentle: { stiffness: 150, damping: 24, mass: 1.05 },
};
```

These are starting points, not pass thresholds. Tune settling, overshoot, interruption, frame stability, and reduced motion in the running mock.
