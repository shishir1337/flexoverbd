import type { BannerTone } from "@/data/types";

/**
 * Scrim, copy colour and carousel controls, defined together per tone.
 *
 * The artwork brief asks for negative space on one side of every banner, but
 * "negative space" comes back either near-white (the fashion and kitchen
 * shots) or near-black (the tech shot). A single brand-coloured wash cannot
 * serve both: at the strength a pale photo needs to carry white text, it
 * erases the photograph entirely.
 *
 * So the tone drives everything at once. Pale artwork gets ink copy lifted on
 * a white scrim; dark artwork gets white copy on a black one. Keeping them in
 * one object is what stops a future banner from ending up with, say, white
 * text on a white scrim.
 *
 * The colours here are pinned to literal values rather than theme tokens on
 * purpose. A tone is chosen from how pale or dark the *photograph* is, which
 * has nothing to do with the app's theme — if these followed the tokens, a
 * dark theme would flip pale-banner copy to light and make it unreadable
 * against its own artwork.
 *
 * Two scrims per tone because the copy sits at the bottom on phones and on the
 * left from `sm` up — the gradient has to run in the matching direction, and
 * the stop positions are tuned so full strength covers the copy block and has
 * faded out before it reaches the subject.
 */

type ToneStyles = {
  scrimMobile: string;
  scrimDesktop: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Carousel arrows. */
  control: string;
  dot: string;
  dotActive: string;
};

export const BANNER_TONE: Record<BannerTone, ToneStyles> = {
  light: {
    // Warm ivory (brand-50), not white. A white scrim over already-pale
    // artwork lands on exactly the page background colour, so the banner's
    // edge dissolves and the headline reads as floating on the page rather
    // than sitting on a banner. The ivory keeps the copy zone clearly part of
    // the image, and it sits naturally with the golden-hour photography.
    //
    // The mobile stop sits at 55%, not 45%: the copy block is bottom-aligned
    // and roughly half the height of a square crop, so a scrim that starts
    // fading at 45% leaves the eyebrow chip stranded on bare photo.
    scrimMobile:
      "bg-linear-to-t from-[#fff6e9]/94 via-[#fff6e9]/78 via-55% to-transparent to-88%",
    scrimDesktop:
      "bg-linear-to-r from-[#fff6e9]/92 via-[#fff6e9]/65 via-46% to-transparent to-82%",
    eyebrow: "bg-[#14171f]/10 text-[#14171f]",
    title: "text-[#14171f]",
    subtitle: "text-[#4a5162]",
    control: "bg-[#14171f]/80 text-white hover:bg-[#14171f]",
    dot: "bg-[#14171f]/25",
    dotActive: "bg-[#14171f]",
  },
  /**
   * No treatment at all.
   *
   * For a banner that is only a photograph — no eyebrow, no headline, no
   * button — where a scrim has nothing to make legible and only dulls the
   * image. The copy colours are still defined rather than left undefined:
   * someone can set this tone *and* type a headline, and white-on-white would
   * be worse than a colour that at least reads on most artwork.
   *
   * The carousel controls keep a backdrop blur, because they sit over
   * unpredictable parts of the image and still have to be findable.
   */
  none: {
    scrimMobile: "",
    scrimDesktop: "",
    eyebrow: "bg-black/30 text-white backdrop-blur-sm",
    title: "text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.55)]",
    subtitle: "text-white/90 [text-shadow:0_1px_10px_rgb(0_0_0/0.5)]",
    control: "bg-black/45 text-white backdrop-blur-sm hover:bg-black/65",
    dot: "bg-white/50",
    dotActive: "bg-white",
  },
  dark: {
    scrimMobile:
      "bg-linear-to-t from-black/88 via-black/62 via-55% to-transparent to-88%",
    scrimDesktop:
      "bg-linear-to-r from-black/85 via-black/55 via-48% to-transparent to-85%",
    eyebrow: "bg-white/20 text-white backdrop-blur-sm",
    title: "text-white",
    subtitle: "text-white/90",
    control: "bg-white/85 text-[#14171f] hover:bg-white",
    dot: "bg-white/45",
    dotActive: "bg-white",
  },
};
