import "dotenv/config";
import pool from "../config/mysql.js";
import systemPrompt from "../utils/systemPrompt.js";
import planSprint from "../utils/planSprint.js";
import generateTaskBreakdown from "../utils/generateTaskBreakdown.js";
import getGenAI, { DEFAULT_GEMINI_MODEL } from "../config/genai.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const clickupTaskSchema = z.object({
  title: z.string().describe("Um título curto e profissional para a tarefa."),
  description: z
    .string()
    .describe("Um resumo detalhado do que precisa ser feito."),
  priority: z
    .enum(["high", "medium", "low"])
    .describe("Nível de prioridade no padrão do sistema: high, medium ou low."),
  tags: z
    .array(z.string())
    .describe(
      "Lista de categorias/etiquetas relevantes (ex: bug, feature, design).",
    ),
  estimated_hours: z
    .number()
    .optional()
    .describe("Estimativa de tempo em horas, se mencionada."),
  due_date: z.date().optional(),
});

const TEMPERATURE_BY_ACTION = {
  createTaskFromText: 0.2,
  refineTask: 0.4,
  summarizeTaskDescription: 0.1,
  suggestTagsForTask: 0.3,
  planSprint: 0.3,
  createTaskCalling: 0.2,
  updateTaskCalling: 0.3,
  deleteTaskCalling: 0.1,
};

function getTemperatureByAction(actionName) {
  return TEMPERATURE_BY_ACTION[actionName] ?? 0.2;
}

class UnsupportedTaskIntentError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsupportedTaskIntentError";
    this.status = 400;
  }
}

function normalizeIntentText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const TASK_REFERENCE_PATTERN =
  "(tarefa|card|item|registro|essa tarefa|esta tarefa|tarefa atual|tarefa selecionada|tarefa existente)";
const DELETE_VERB_PATTERN =
  "(excluir|exclua|deletar|delete|remover|remova|apagar|apague|eliminar|elimine|descartar|descarte|cancelar|cancele|tirar|tire)";
const EDIT_VERB_PATTERN =
  "(editar|edite|alterar|altere|atualizar|atualize|mudar|mude|ajustar|ajuste|corrigir|corrija|revisar|revise)";
const CREATE_VERB_PATTERN =
  "(criar|crie|adicionar|adicione|gerar|gere|abrir|abra|registrar|registre|montar|monte)";

function matchesIntent(text, verbPattern, extraPatterns = []) {
  const patterns = [
    new RegExp(`\\b${verbPattern}\\b.{0,50}\\b${TASK_REFERENCE_PATTERN}\\b`),
    new RegExp(`\\b${TASK_REFERENCE_PATTERN}\\b.{0,50}\\b${verbPattern}\\b`),
    ...extraPatterns.map((pattern) => new RegExp(pattern)),
  ];

  return patterns.some((pattern) => pattern.test(text));
}

function containsTaskDeleteIntent(text) {
  return matchesIntent(text, DELETE_VERB_PATTERN, [
    "\\b(apaga|remove|deleta|exclui|cancela|descarta)\\s+(isso|essa|essa tarefa|esta tarefa)\\b",
    "\\b(quero|pode|consigo)\\b.{0,20}\\b(excluir|deletar|remover|apagar|cancelar|descartar)\\b",
  ]);
}

function containsTaskEditIntent(text) {
  return matchesIntent(text, EDIT_VERB_PATTERN, [
    "\\b(tarefa|card|item)\\b.{0,40}\\b(existente|atual|selecionada|ja existe|ja criada)\\b",
    "\\b(mexa|ajuste|corrija)\\b.{0,30}\\b(na|nesta|nessa)\\s+tarefa\\b",
  ]);
}

function containsTaskCreateIntent(text) {
  return matchesIntent(text, CREATE_VERB_PATTERN, [
    "\\bnova tarefa\\b",
    "\\b(crie|gere|abra|registre)\\b.{0,20}\\b(uma|outra|nova)\\b",
    "\\b(adicione|inclua)\\b.{0,20}\\b(nova|mais uma)\\s+tarefa\\b",
  ]);
}

function validateTaskTextIntent(text, mode) {
  const normalizedText = normalizeIntentText(text);

  if (mode === "create") {
    if (containsTaskDeleteIntent(normalizedText)) {
      throw new UnsupportedTaskIntentError(
        "Este campo é para criar tarefa com IA. Para excluir, use o X no card da tarefa.",
      );
    }

    if (containsTaskEditIntent(normalizedText)) {
      throw new UnsupportedTaskIntentError(
        "Este campo é para criar tarefa com IA. Para editar uma tarefa existente, use o campo de edição com IA.",
      );
    }

    return;
  }

  if (mode === "update") {
    if (containsTaskDeleteIntent(normalizedText)) {
      throw new UnsupportedTaskIntentError(
        "Este campo é para editar a tarefa selecionada com IA. Para excluir, use o X no card da tarefa.",
      );
    }

    if (containsTaskCreateIntent(normalizedText)) {
      throw new UnsupportedTaskIntentError(
        "Este campo é para editar a tarefa selecionada com IA. Para criar nova tarefa, use o campo de criação com IA.",
      );
    }
  }
}

function normalizePriority(priority) {
  const value = String(priority || "")
    .trim()
    .toLowerCase();

  if (["urgente", "alta", "high"].includes(value)) {
    return "high";
  }

  if (["normal", "media", "média", "medium"].includes(value)) {
    return "medium";
  }

  if (["baixa", "low"].includes(value)) {
    return "low";
  }

  return "medium";
}

function parseTags(tagsJson) {
  if (!tagsJson) {
    return [];
  }

  if (Array.isArray(tagsJson)) {
    return tagsJson;
  }

  if (typeof tagsJson === "object") {
    return [];
  }

  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDateOnly(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }

  return null;
}

function mapTaskRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description_text,
    priority: normalizePriority(row.priority),
    tags: parseTags(row.tags_json),
    estimated_hours:
      row.estimated_hours === null ? null : Number(row.estimated_hours),
    due_date: formatDateOnly(row.due_date),
    source_text: row.source_text,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))];
}

async function classifyPriority(text) {
  if (!isGeminiConfigured()) {
    return "medium";
  }

  const genAI = getGenAI();

  try {
    const response = await genAI.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [
        { role: "user", parts: [{ text: "site caiu" }] },
        { role: "model", parts: [{ text: "high" }] },
        { role: "user", parts: [{ text: "mudar botão" }] },
        { role: "model", parts: [{ text: "medium" }] },
        { role: "user", parts: [{ text: "trocar favicon" }] },
        { role: "model", parts: [{ text: "low" }] },
        { role: "user", parts: [{ text }] },
      ],
      config: {
        temperature: 0,
      },
    });

    const rawPriority =
      response?.candidates?.[0]?.content?.parts?.[0]?.text
        ?.trim()
        ?.toLowerCase() || "";

    if (rawPriority.includes("high") || rawPriority.includes("alta")) {
      return "high";
    }

    if (
      rawPriority.includes("medium") ||
      rawPriority.includes("media") ||
      rawPriority.includes("média") ||
      rawPriority.includes("normal")
    ) {
      return "medium";
    }

    if (rawPriority.includes("low") || rawPriority.includes("baixa")) {
      return "low";
    }

    return "medium";
  } catch (error) {
    console.error("Erro ao classificar prioridade:", error.message);
    return "medium";
  }
}

async function callGemini(userPrompt, actionName, useSchema = true) {
  try {
    const genAI = getGenAI();
    const temperature = getTemperatureByAction(actionName);
    const finalPrompt =
      actionName === "planSprint"
        ? `${planSprint()}\n\n${userPrompt}`
        : userPrompt;
    const response = await genAI.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
      config: {
        systemInstruction: systemPrompt(actionName),
        ...(useSchema && {
          responseMimeType: "application/json",
          responseJsonSchema: zodToJsonSchema(clickupTaskSchema),
        }),
        temperature,
      },
    });
    return response.candidates[0].content.parts[0].text;
  } catch (error) {
    if (isGeminiUnavailableError(error)) {
      throw error;
    }

    console.error("Erro ao chamar a API do Gemini:", error.message);
    throw new Error(
      "Falha na chamada da API Gemini. Verifique sua cota/chave e tente novamente.",
    );
  }
}

function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function isGeminiUnavailableError(error) {
  // Verificar se é erro de indisponibilidade do Gemini (503, timeout, conexão)
  return (
    error?.status === 503 ||
    error?.code === "ECONNREFUSED" ||
    error?.code === "ETIMEDOUT" ||
    error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
    error?.message?.includes("UNAVAILABLE") ||
    !isGeminiConfigured()
  );
}

async function createTaskFromText(text, mode = "create") {
  validateTaskTextIntent(text, mode);

  const prompt =
    mode === "update"
      ? `Analisa o seguinte texto e atualiza a tarefa selecionada sem criar ou excluir outra tarefa:\n\n"${text}"`
      : `Analisa o seguinte texto e cria uma nova tarefa estruturada:\n\n"${text}"`;

  try {
    const respostaJSON = await callGemini(
      prompt,
      mode === "update" ? "updateTaskCalling" : "createTaskFromText",
    );
    const task = JSON.parse(respostaJSON);

    if (!["high", "medium", "low"].includes(task.priority)) {
      task.priority = await classifyPriority(text);
    }

    return task;
  } catch (error) {
    if (isGeminiUnavailableError(error)) {
      throw error;
    }

    console.error("Erro ao processar a resposta do Gemini:", error.message);
    throw new Error(
      "Não foi possível criar tarefa com o Gemini neste momento.",
    );
  }
}

async function suggestTagsForTask(task) {
  const normalizedTask = {
    ...task,
    tags: normalizeTags(task.tags),
  };

  if (!isGeminiConfigured()) {
    return normalizedTask;
  }

  const prompt = `Sugira entre 1 e 3 tags curtas em português para a tarefa abaixo. Responda apenas com um JSON no formato {"tags":["tag1","tag2"]}.

Título: ${task.title || ""}
Descrição: ${task.description || ""}
Tags atuais: ${normalizedTask.tags.join(", ")}`;

  try {
    const respostaJSON = await callGemini(prompt, "suggestTagsForTask", false);
    const parsed = JSON.parse(respostaJSON);
    const suggestedTags = normalizeTags(parsed?.tags);

    if (suggestedTags.length === 0) {
      return normalizedTask;
    }

    return {
      ...normalizedTask,
      tags: normalizeTags([...normalizedTask.tags, ...suggestedTags]).slice(
        0,
        8,
      ),
    };
  } catch (error) {
    if (isGeminiUnavailableError(error)) {
      throw error;
    }

    console.error("Erro ao sugerir tags da tarefa:", error.message);
    return normalizedTask;
  }
}

async function summarizeTaskDescription(task) {
  const prompt = `Melhora a descrição da tarefa abaixo para ficar mais simples e objetiva, mantendo o mesmo significado. Devolve apenas a nova descrição, sem explicações adicionais.

Descrição atual: ${task.description}`;

  try {
    const respostaTexto = await callGemini(
      prompt,
      "summarizeTaskDescription",
      false,
    );
    const descricaoMelhorada = respostaTexto.trim();
    return {
      ...task,
      description: descricaoMelhorada || task.description,
    };
  } catch (error) {
    if (isGeminiUnavailableError(error)) {
      throw error;
    }

    console.error("Erro ao resumir a descrição da tarefa:", error.message);
    throw new Error(
      "Não foi possível resumir a descrição com o Gemini neste momento.",
    );
  }
}

async function planSprintFromText(text) {
  const prompt = `Pedido do usuário:\n${text}`;

  try {
    const respostaJSON = await callGemini(prompt, "planSprint", false);
    return JSON.parse(respostaJSON);
  } catch (error) {
    if (isGeminiUnavailableError(error)) {
      throw error;
    }

    console.error("Erro ao gerar plano de sprint:", error.message);
    throw new Error(
      "Não foi possível gerar o plano de sprint com o Gemini neste momento.",
    );
  }
}

async function generateTaskBreakdownFromText(text) {
  try {
    return await generateTaskBreakdown(text);
  } catch (error) {
    if (isGeminiUnavailableError(error)) {
      throw error;
    }

    console.error("Erro ao gerar breakdown da tarefa:", error.message);
    throw new Error(
      "Não foi possível gerar o breakdown da tarefa com o Gemini neste momento.",
    );
  }
}

async function saveTask(task, sourceText = null) {
  const tags = normalizeTags(task.tags);
  const priority = normalizePriority(task.priority);
  const estimatedHours =
    typeof task.estimated_hours === "number" &&
    !Number.isNaN(task.estimated_hours)
      ? task.estimated_hours
      : null;

  const sql = `
    INSERT INTO tasks (title, description_text, priority, tags_json, estimated_hours, due_date, source_text)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const dueDate = task.due_date || null;

  const [result] = await pool.execute(sql, [
    task.title,
    task.description,
    priority,
    JSON.stringify(tags),
    estimatedHours,
    dueDate,
    sourceText,
  ]);

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        title,
        description_text,
        priority,
        tags_json,
        estimated_hours,
        DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
        source_text,
        created_at,
        updated_at
      FROM tasks
      WHERE id = ?
    `,
    [result.insertId],
  );

  return mapTaskRow(rows[0]);
}

async function updateTask(id, task) {
  const tags = normalizeTags(task.tags);
  const priority = normalizePriority(task.priority);
  const estimatedHours =
    typeof task.estimated_hours === "number" &&
    !Number.isNaN(task.estimated_hours)
      ? task.estimated_hours
      : null;
  const dueDate = task.due_date || null;

  const [result] = await pool.execute(
    `
      UPDATE tasks
      SET
        title = ?,
        description_text = ?,
        priority = ?,
        tags_json = ?,
        estimated_hours = ?,
        due_date = ?
      WHERE id = ?
    `,
    [
      task.title,
      task.description,
      priority,
      JSON.stringify(tags),
      estimatedHours,
      dueDate,
      id,
    ],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        title,
        description_text,
        priority,
        tags_json,
        estimated_hours,
        DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
        source_text,
        created_at,
        updated_at
      FROM tasks
      WHERE id = ?
    `,
    [id],
  );

  return mapTaskRow(rows[0]);
}

async function listTasks(limit = 20) {
  const parsedLimit = Number(limit);
  const safeLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 20;

  const [rows] = await pool.query(`
      SELECT
        id,
        title,
        description_text,
        priority,
        tags_json,
        estimated_hours,
        DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
        source_text,
        created_at,
        updated_at
      FROM tasks
      ORDER BY id DESC
      LIMIT ${safeLimit}
    `);

  return rows.map(mapTaskRow);
}

async function deleteTask(id) {
  const [result] = await pool.execute("DELETE FROM tasks WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

const taskService = {
  UnsupportedTaskIntentError,
  isGeminiConfigured,
  isGeminiUnavailableError,
  createTaskFromText,
  suggestTagsForTask,
  summarizeTaskDescription,
  planSprintFromText,
  generateTaskBreakdownFromText,
  saveTask,
  updateTask,
  listTasks,
  deleteTask,
};

export default taskService;
