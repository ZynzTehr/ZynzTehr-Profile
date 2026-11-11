/// <reference types="vite/client" />

declare const __HAS_HERO_INTRO_VIDEO__: boolean;
declare const __HAS_HERO_VIDEO__: boolean;
declare const __HAS_PORTFOLIO_VIDEO__: boolean;

interface Window {
  lenis?: import("lenis").default | null;
  ScrollTrigger?: typeof import("gsap/ScrollTrigger").ScrollTrigger;
}
