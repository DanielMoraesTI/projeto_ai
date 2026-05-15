import getGenAI, { DEFAULT_GEMINI_MODEL } from "../config/genai.js";
import chatbotService from "../services/chatbotService.js";
import meetingSummaryService from "../services/meetingSummaryService.js";

function getStreamErrorMessage(error, fallbackMessage) {
  const rawMessage = String(error?.message || "");
  const loweredMessage = rawMessage.toLowerCase();

  if (
    error?.status === 429 ||
    rawMessage.includes('"code": 429') ||
    loweredMessage.includes("resource_exhausted") ||
    loweredMessage.includes("quota") ||
    loweredMessage.includes("cota")
  ) {
    return "As cotas da IA foram atingidas agora. Aguarde alguns instantes e tente novamente.";
  }

  if (loweredMessage.includes("gemini_api_key")) {
    return "A chave GEMINI_API_KEY não esta configurada no servidor.";
  }

  return fallbackMessage;
}

async function streamSupportChat(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const userMessage =
    req.body?.message ||
    req.query.user_message ||
    "Preciso de ajuda para usar o ClickBot.";
  const history = req.body?.history;

  let aiResponse = "";

  try {
    const result = await chatbotService.generateSupportChatReply(
      userMessage,
      history,
    );

    // Em algumas versões da SDK, o stream vem em result.stream; em outras, no próprio retorno.
    const stream = result.stream || result;

    for await (const chunk of stream) {
      const chunkText =
        typeof chunk.text === "function" ? chunk.text() : chunk.text;

      if (!chunkText) {
        continue;
      }

      aiResponse += chunkText;
      console.log(chunkText);
      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    await chatbotService.saveChatHistory(userMessage, aiResponse);
    res.end();
  } catch (error) {
    console.error("Erro no stream de suporte:", error.message);
    const errorMessage = getStreamErrorMessage(
      error,
      "Falha no stream de suporte.",
    );
    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.end();
  }
}

async function streamMeetingSummary(req, res) {
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const projectId = Number(req.body?.project_id);
  const title = String(req.body?.title || "").trim();
  const originalText = req.body?.original_text;

  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400);
    res.write(
      `${JSON.stringify({
        type: "error",
        error:
          "O campo 'Project ID' é obrigatório e deve ser um número inteiro positivo.",
      })}\n`,
    );
    res.end();
    return;
  }

  if (!originalText || typeof originalText !== "string") {
    res.status(400);
    res.write(
      `${JSON.stringify({
        type: "error",
        error: "O campo 'Notas da Reunião' é obrigatório e deve ser texto.",
      })}\n`,
    );
    res.end();
    return;
  }

  if (!title) {
    res.status(400);
    res.write(
      `${JSON.stringify({
        type: "error",
        error: "O campo 'Título' é obrigatório e deve ser texto.",
      })}\n`,
    );
    res.end();
    return;
  }

  let summaryText = "";

  try {
    res.write(
      `${JSON.stringify({
        type: "status",
        message: "A processar pontos chave...",
      })}\n`,
    );

    const genAI = getGenAI();
    const prompt = `Você é um assistente de reuniões. Gere um sumário executivo em português di Brasil, objetivo e acionável com base nas notas abaixo.

Notas da reunião:
${originalText.trim()}

Formato esperado:
- Contexto geral
- Principais decisões
- Riscos e impedimentos
- Próximos passos`;

    const result = await genAI.models.generateContentStream({
      model: DEFAULT_GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,
      },
    });

    const stream = result.stream || result;

    for await (const chunk of stream) {
      const chunkText =
        typeof chunk.text === "function" ? chunk.text() : chunk.text;

      if (!chunkText) {
        continue;
      }

      summaryText += chunkText;
      res.write(`${JSON.stringify({ type: "chunk", text: chunkText })}\n`);
    }

    const savedSummary = await meetingSummaryService.saveMeetingSummary(
      projectId,
      title,
      originalText,
      summaryText,
    );

    res.write(
      `${JSON.stringify({
        type: "done",
        data: savedSummary,
      })}\n`,
    );
    res.end();
  } catch (error) {
    console.error("Erro no stream de resumo da reunião:", error.message);
    const errorMessage = getStreamErrorMessage(
      error,
      "Falha ao gerar o resumo da reunião em stream.",
    );
    res.write(
      `${JSON.stringify({
        type: "error",
        error: errorMessage,
      })}\n`,
    );
    res.end();
  }
}

const chatStreamController = {
  streamSupportChat,
  streamMeetingSummary,
};

export default chatStreamController;
