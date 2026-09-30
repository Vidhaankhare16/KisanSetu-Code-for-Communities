/**
 * Anek (Ek Type, Mumbai) — one variable family designed for Latin and ten Indian scripts,
 * so every language we support gets a matched typeface. Only Latin is preloaded; each
 * script's files download on demand via unicode-range when that script appears.
 * (next/font requires literal options in every call, hence the repetition.)
 */
import {
  Anek_Bangla,
  Anek_Devanagari,
  Anek_Gujarati,
  Anek_Gurmukhi,
  Anek_Kannada,
  Anek_Latin,
  Anek_Malayalam,
  Anek_Odia,
  Anek_Tamil,
  Anek_Telugu,
} from "next/font/google";

const latin = Anek_Latin({ subsets: ["latin", "latin-ext"], axes: ["wdth"], display: "swap", variable: "--font-anek-latin" });
const devanagari = Anek_Devanagari({ subsets: ["devanagari"], axes: ["wdth"], display: "swap", preload: false, variable: "--font-anek-devanagari" });
const bangla = Anek_Bangla({ subsets: ["bengali"], axes: ["wdth"], display: "swap", preload: false, variable: "--font-anek-bangla" });
const tamil = Anek_Tamil({ subsets: ["tamil"], axes: ["wdth"], display: "swap", preload: false, variable: "--font-anek-tamil" });
const telugu = Anek_Telugu({ subsets: ["telugu"], axes: ["wdth"], display: "swap", preload: false, variable: "--font-anek-telugu" });
const kannada = Anek_Kannada({ subsets: ["kannada"], axes: ["wdth"], display: "swap", preload: false, variable: "--font-anek-kannada" });
const malayalam = Anek_Malayalam({ subsets: ["malayalam"], axes: ["wdth"], display: "swap", preload: false, variable: "--font-anek-malayalam" });
const gujarati = Anek_Gujarati({ subsets: ["gujarati"], axes: ["wdth"], display: "swap", preload: false, variable: "--font-anek-gujarati" });
const gurmukhi = Anek_Gurmukhi({ subsets: ["gurmukhi"], axes: ["wdth"], display: "swap", preload: false, variable: "--font-anek-gurmukhi" });
const odia = Anek_Odia({ subsets: ["oriya"], axes: ["wdth"], display: "swap", preload: false, variable: "--font-anek-odia" });

export const fontVariables = [latin, devanagari, bangla, tamil, telugu, kannada, malayalam, gujarati, gurmukhi, odia]
  .map((f) => f.variable)
  .join(" ");
