import "dotenv/config";
import pool from "../config/mysql.js";
import getGenAI, { DEFAULT_GEMINI_MODEL } from "../config/genai.js";

let history = [];
let conversationSummary = "";

function normalizeChatHistory(historyInput) {
  if (!Array.isArray(historyInput)) {
    return [];
  }

  return historyInput
    .map((item) => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      text: typeof item?.text === "string" ? item.text.trim() : "",
    }))
    .filter((item) => item.text.length > 0)
    .slice(-8);
}

function buildSupportPrompt(userMessage, historyInput) {
  const contextBlock = historyInput.length
    ? `Contexto recente da conversa:\n${historyInput
        .map(
          (item) =>
            `${item.role === "user" ? "Usuario" : "ClickBot"}: ${item.text}`,
        )
        .join("\n")}`
    : "Sem historico anterior.";

  return `Voce e um assistente de suporte do ClickBot. Responda em portugues de forma clara, pratica e objetiva. Use o contexto da conversa quando ele existir e mantenha continuidade natural. E ao se despedir use frases conhecidas do personagem T800 da franquia de filmes O Exterminador do Futuro\n\n${contextBlock}\n\nMensagem atual do usuario: ${userMessage}`;
}

async function summarizeHistory() {
  try {
    if (history.length === 0) {
      return;
    }

    const genAI = getGenAI();

    const summaryPrompt = `Resuma a seguinte conversa entre um usuário e uma IA. Mantenha o resumo conciso, destacando as informações mais importantes e relevantes. A conversa é a seguinte:\n\n${history
      .map(
        (msg) =>
          `${msg.role === "user" ? "Usuário" : "IA"}: ${msg.parts[0].text}`,
      )
      .join("\n")}\n\nResumo:`;

    const response = await genAI.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: summaryPrompt }] }],
    });
    conversationSummary = response.candidates[0].content.parts[0].text.trim();

    history = [];
    history.push({
      role: "system",
      parts: [{ text: `Resumo da conversa anterior: ${conversationSummary}` }],
    });
  } catch (error) {
    console.error("Erro ao resumir histórico:", error.message);
    throw error;
  }
}

async function sendMessage(userMessage) {
  try {
    const genAI = getGenAI();

    history.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    if (history.length > 5) {
      history = history.slice(-5);
    }

    const response = await genAI.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: history,
    });

    const assistantMessage = response.candidates[0].content.parts[0].text;

    history.push({
      role: "model",
      parts: [{ text: assistantMessage }],
    });

    if (history.length > 5) {
      history = history.slice(-5);
    }

    return assistantMessage;
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error.message);
    throw error;
  }
}

async function saveChatHistory(userMessage, aiResponse) {
  const sql = `
    INSERT INTO chat_history (user_message, ai_response)
    VALUES (?, ?)
  `;

  await pool.execute(sql, [userMessage, aiResponse]);
}

async function generateSupportChatReply(userMessage, historyInput = []) {
  const genAI = getGenAI();
  const normalizedHistory = normalizeChatHistory(historyInput);
  const prompt = buildSupportPrompt(userMessage, normalizedHistory);

  return genAI.models.generateContentStream({
    model: DEFAULT_GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
}

const chatbotService = {
  sendMessage,
  summarizeHistory,
  saveChatHistory,
  generateSupportChatReply,
};

export default chatbotService;
