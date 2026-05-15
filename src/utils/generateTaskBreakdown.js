import "dotenv/config";
import getGenAI, { DEFAULT_GEMINI_MODEL } from "../config/genai.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { clickupTaskSchema } from "../services/taskService.js";

function simpleSystemPrompt() {
  return "Você é um assistente de produtividade. Responda apenas com JSON válido, sem texto extra.";
}

async function generateTaskBreakdown(taskDescription) {
  if (!taskDescription || typeof taskDescription !== "string") {
    throw new Error("O campo taskDescription é obrigatório e deve ser texto.");
  }

  const genAI = getGenAI();
  const prompt = `Thinking Mode (Planeamento de Feature Real)
Objetivo: organizar uma feature em uma tarefa clara e pronta para execução.

Feature: "${taskDescription.trim()}"

Regras:
- Se a descrição for vaga, melhorar a clareza na descrição.
- Usar prioridade coerente com impacto e urgência (high, medium ou low).`;

  try {
    const response = await genAI.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: simpleSystemPrompt(),
        responseMimeType: "application/json",
        responseJsonSchema: zodToJsonSchema(clickupTaskSchema),
        temperature: 0.2,
        thinkingConfig: {
          includeThoughts: true,
        },
      },
    });

    let answerText = "";

    for (const part of response.candidates[0].content.parts) {
      if (!part.text) continue;
      else if (part.thought) {
        console.log("Thinking:", part.text);
      } else {
        answerText += part.text;
      }
    }

    if (!answerText) {
      throw new Error("O modelo não retornou conteúdo de resposta.");
    }

    return JSON.parse(answerText);
  } catch (error) {
    if (
      error?.message ===
      "A variável de ambiente GEMINI_API_KEY não está definida."
    ) {
      throw error;
    }

    console.error("Erro ao gerar breakdown da tarefa:", error.message);
    throw new Error(
      "Não foi possível gerar o breakdown da feature com o Gemini neste momento.",
    );
  }
}

export default generateTaskBreakdown;
