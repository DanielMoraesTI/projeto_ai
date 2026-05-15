import { GoogleGenAI } from "@google/genai";

const DEFAULT_GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3-flash-preview";
  /*process.env.GEMINI_MODEL || "gemini-2.5-flash";*/

function getGenAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("A variável de ambiente GEMINI_API_KEY não está definida.");
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
}

export { DEFAULT_GEMINI_MODEL };
export default getGenAI;
