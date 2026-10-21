type FeedbackAnimation = Pick<Animation, 'cancel'>;
type FeedbackTarget = {
  animate?: (
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ) => FeedbackAnimation;
};
type MotionPreference = Pick<
  MediaQueryList,
  'matches' | 'addEventListener' | 'removeEventListener'
>;

// State is owned by the saved-items store, never by an animation completion.
export function createSaveFeedback(
  target: FeedbackTarget,
  preference: MotionPreference,
) {
  let active: FeedbackAnimation | undefined;
  let disposed = false;
  function cancel() {
    active?.cancel();
    active = undefined;
  }
  function onPreferenceChange() {
    if (preference.matches) cancel();
  }
  preference.addEventListener('change', onPreferenceChange);

  return {
    play(saving: boolean) {
      cancel();
      if (disposed || preference.matches || !target.animate) return;
      try {
        active = target.animate(
          saving
            ? [
                { transform: 'scale(1)' },
                { transform: 'scale(0.88)', offset: 0.25 },
                { transform: 'scale(1.14)', offset: 0.62 },
                { transform: 'scale(1)' },
              ]
            : [
                { transform: 'scale(1)' },
                { transform: 'scale(0.88)', offset: 0.4 },
                { transform: 'scale(1)' },
              ],
          {
            duration: saving ? 260 : 180,
            easing: 'cubic-bezier(0.2, 0.65, 0.3, 1)',
            iterations: 1,
          },
        );
      } catch {
        // Cosmetic feedback must not undo a successful saved-state change.
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancel();
      preference.removeEventListener('change', onPreferenceChange);
    },
  };
}
