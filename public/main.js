const promptInputElement = document.querySelector("[data-task-text]");
const clickbotInputElement = document.querySelector("[data-clickbot-message]");
const chatThreadElement = document.querySelector("[data-chat-thread]");
const chatEmptyElement = document.querySelector("[data-chat-empty]");
const chatStatusElement = document.querySelector("[data-chat-status]");
const chatToggleButtonElement = document.querySelector("[data-chat-toggle]");
const chatDrawerElement = document.querySelector("[data-chat-drawer]");
const chatOverlayElement = document.querySelector("[data-chat-overlay]");
const chatCloseButtonElement = document.querySelector("[data-chat-close]");
const taskTitleElement = document.querySelector("[data-task-title]");
const taskDescriptionElement = document.querySelector(
  "[data-task-description]",
);
const taskPriorityElement = document.querySelector("[data-task-priority]");
const taskTagsElement = document.querySelector("[data-task-tags]");
const taskEstimatedHoursElement = document.querySelector(
  "[data-task-estimated-hours]",
);
const responseElement = document.querySelector("[data-task-response]");
const meetingProjectIdElement = document.querySelector(
  "[data-meeting-project-id]",
);
const meetingTitleElement = document.querySelector("[data-meeting-title]");
const meetingTextElement = document.querySelector("[data-meeting-text]");
const meetingProcessingElement = document.querySelector(
  "[data-meeting-processing]",
);
const meetingSummaryOutputElement = document.querySelector(
  "[data-meeting-summary-output]",
);
const meetingCardsElement = document.querySelector("[data-meeting-cards]");
const meetingListEmptyElement = document.querySelector(
  "[data-meeting-list-empty]",
);
const meetingSearchElement = document.querySelector("[data-meeting-search]");
const meetingModalElement = document.querySelector("[data-meeting-modal]");
const meetingModalOverlayElement = document.querySelector(
  "[data-meeting-modal-overlay]",
);
const meetingModalCloseElement = document.querySelector(
  "[data-meeting-modal-close]",
);
const meetingDetailTitleElement = document.querySelector(
  "[data-meeting-detail-title]",
);
const meetingDetailDateElement = document.querySelector(
  "[data-meeting-detail-date]",
);
const meetingDetailSummaryElement = document.querySelector(
  "[data-meeting-detail-summary]",
);
const taskDueDateElement = document.querySelector("[data-task-due-date]");
const taskCardsElement = document.querySelector("[data-task-cards]");
const taskListEmptyElement = document.querySelector("[data-task-list-empty]");
const createButtonElement = document.querySelector("[data-action='create']");
const saveManualButtonElement = document.querySelector(
  "[data-action='save-manual']",
);
const meetingSummaryStreamButtonElement = document.querySelector(
  "[data-action='meeting-summary-stream']",
);
const clickbotButtonElement = document.querySelector(
  "[data-action='clickbot']",
);
const suggestTagsButtonElement = document.querySelector(
  "[data-action='suggest-tags']",
);
let errorModalElement = null;
const aiEditSectionElement = document.querySelector("[data-ai-edit-section]");
const aiEditTextElement = document.querySelector("[data-task-ai-edit-text]");
const aiEditTaskLabelElement = document.querySelector(
  "[data-ai-edit-task-label]",
);
const updateWithAIButtonElement = document.querySelector(
  "[data-action='update-with-ai']",
);
const cancelEditButtonElement = document.querySelector(
  "[data-action='cancel-edit']",
);

let errorModalOverlayElement = null;
let errorModalTitleElement = null;
let errorModalMessageElement = null;
let confirmModalElement = null;
let confirmModalOverlayElement = null;
let confirmModalTitleElement = null;
let confirmModalMessageElement = null;
let confirmModalCancelElement = null;
let confirmModalConfirmElement = null;
let confirmModalResolver = null;

const CLICKBOT_STORAGE_KEY = "clickbot-chat-history";
const API_RESPONSE_STORAGE_KEY = "task-api-last-response";
const USER_AVATAR_SRC = "./assets/avatar-user.svg";
const BOT_AVATAR_SRC = "./assets/avatar-t800.svg";
const INITIAL_CLICKBOT_MESSAGE =
  "Oi! Eu sou o T800, seu Chat com IA. Posso te ajudar a organizar tarefas. Come with me if you want to live.";
let clickbotHistory = loadClickbotHistory();

function getTaskFromForm() {
  return {
    title: taskTitleElement.value.trim(),
    description: taskDescriptionElement.value.trim(),
    priority: taskPriorityElement.value,
    tags: taskTagsElement.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    estimated_hours: taskEstimatedHoursElement?.value
      ? parseFloat(taskEstimatedHoursElement.value)
      : null,
    due_date: taskDueDateElement?.value || null,
  };
}

// EDITING STATE

function setEditingState(task) {
  if (!aiEditSectionElement) return;

  if (task) {
    editingTaskId = task.id;
    if (aiEditTaskLabelElement) {
      aiEditTaskLabelElement.textContent = task.title || `#${task.id}`;
    }
    aiEditSectionElement.hidden = false;
    if (aiEditTextElement) aiEditTextElement.value = "";
    aiEditSectionElement.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  } else {
    editingTaskId = null;
    aiEditSectionElement.hidden = true;
    if (aiEditTextElement) aiEditTextElement.value = "";
    if (aiEditTaskLabelElement) aiEditTaskLabelElement.textContent = "";
  }
}

// TASK ACTIONS

function normalizeDateForInput(dateValue) {
  if (typeof dateValue !== "string") {
    return "";
  }

  const value = dateValue.trim();

  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const brDateMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDateMatch) {
    const [, day, month, year] = brDateMatch;
    return `${year}-${month}-${day}`;
  }

  return "";
}

function syncTaskForm(task) {
  taskTitleElement.value = task.title || "";
  taskDescriptionElement.value = task.description || "";
  taskPriorityElement.value = task.priority || "medium";
  taskTagsElement.value = Array.isArray(task.tags) ? task.tags.join(", ") : "";
  if (taskEstimatedHoursElement)
    taskEstimatedHoursElement.value = task.estimated_hours || "";
  if (taskDueDateElement)
    taskDueDateElement.value = normalizeDateForInput(task.due_date);
}

function clearTaskInputs() {
  if (promptInputElement) {
    promptInputElement.value = "";
  }

  syncTaskForm({
    title: "",
    description: "",
    priority: "medium",
    tags: [],
    estimated_hours: null,
    due_date: "",
  });
}

function setOutput(content) {
  const normalizedContent =
    typeof content === "string" ? content : JSON.stringify(content, null, 2);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(API_RESPONSE_STORAGE_KEY, normalizedContent);
  }

  if (responseElement) {
    responseElement.textContent = normalizedContent;
  }
}

function restoreLastOutput() {
  if (!responseElement || typeof window === "undefined") {
    return;
  }

  const lastOutput = window.localStorage.getItem(API_RESPONSE_STORAGE_KEY);

  if (lastOutput) {
    responseElement.textContent = lastOutput;
  }
}

function loadClickbotHistory() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(CLICKBOT_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.text === "string" &&
        item.text.trim().length > 0,
    );
  } catch {
    return [];
  }
}

function persistClickbotHistory() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    CLICKBOT_STORAGE_KEY,
    JSON.stringify(clickbotHistory.slice(-12)),
  );
}

function setChatStatus(message, state = "idle") {
  if (!chatStatusElement) {
    return;
  }

  chatStatusElement.textContent = message;
  chatStatusElement.dataset.state = state;
}

function ensureErrorModalElements() {
  if (errorModalElement) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "app-error-modal-overlay";
  overlay.hidden = true;

  const modal = document.createElement("article");
  modal.className = "app-error-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Erro da aplicacao");

  const heading = document.createElement("header");
  heading.className = "app-error-modal-head";

  const title = document.createElement("h3");
  title.textContent = "Falha ao executar operacao";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "task-card-btn app-error-modal-close";
  closeButton.setAttribute("aria-label", "Fechar alerta");
  closeButton.textContent = "x";

  heading.append(title, closeButton);

  const message = document.createElement("p");
  message.className = "app-error-modal-message";
  message.textContent = "Nao foi possivel concluir a operacao.";

  modal.append(heading, message);

  document.body.append(overlay, modal);

  closeButton.addEventListener("click", () => setErrorModalOpen(false));
  overlay.addEventListener("click", () => setErrorModalOpen(false));

  errorModalElement = modal;
  errorModalOverlayElement = overlay;
  errorModalTitleElement = title;
  errorModalMessageElement = message;
}

function setErrorModalOpen(isOpen) {
  if (!errorModalElement || !errorModalOverlayElement) {
    return;
  }

  errorModalElement.hidden = !isOpen;
  errorModalOverlayElement.hidden = !isOpen;
  document.body.classList.toggle("app-error-modal-open", isOpen);
}

function showErrorModal(title, message) {
  ensureErrorModalElements();

  if (errorModalTitleElement) {
    errorModalTitleElement.textContent = title || "Falha na operacao";
  }

  if (errorModalMessageElement) {
    errorModalMessageElement.textContent =
      message || "Nao foi possivel concluir a operacao.";
  }

  setErrorModalOpen(true);
}

function ensureConfirmModalElements() {
  if (confirmModalElement) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "app-confirm-modal-overlay";
  overlay.hidden = true;

  const modal = document.createElement("article");
  modal.className = "app-confirm-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Confirmacao da aplicacao");

  const heading = document.createElement("header");
  heading.className = "app-confirm-modal-head";

  const title = document.createElement("h3");
  title.textContent = "Confirmar acao";

  const message = document.createElement("p");
  message.className = "app-confirm-modal-message";
  message.textContent = "Deseja continuar?";

  const actions = document.createElement("div");
  actions.className = "app-confirm-modal-actions";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "task-card-btn app-confirm-modal-cancel";
  cancelButton.textContent = "Cancelar";

  const confirmButton = document.createElement("button");
  confirmButton.type = "button";
  confirmButton.className = "task-card-btn delete app-confirm-modal-confirm";
  confirmButton.textContent = "Excluir";

  heading.append(title);
  actions.append(cancelButton, confirmButton);
  modal.append(heading, message, actions);

  document.body.append(overlay, modal);

  overlay.addEventListener("click", () => resolveConfirmModal(false));
  cancelButton.addEventListener("click", () => resolveConfirmModal(false));
  confirmButton.addEventListener("click", () => resolveConfirmModal(true));

  confirmModalElement = modal;
  confirmModalOverlayElement = overlay;
  confirmModalTitleElement = title;
  confirmModalMessageElement = message;
  confirmModalCancelElement = cancelButton;
  confirmModalConfirmElement = confirmButton;
}

function setConfirmModalOpen(isOpen) {
  if (!confirmModalElement || !confirmModalOverlayElement) {
    return;
  }

  confirmModalElement.hidden = !isOpen;
  confirmModalOverlayElement.hidden = !isOpen;
  document.body.classList.toggle("app-confirm-modal-open", isOpen);
}

function resolveConfirmModal(result) {
  if (!confirmModalResolver) {
    setConfirmModalOpen(false);
    return;
  }

  const resolve = confirmModalResolver;
  confirmModalResolver = null;
  setConfirmModalOpen(false);
  resolve(result);
}

function showConfirmModal({
  title = "Confirmar acao",
  message = "Deseja continuar?",
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
} = {}) {
  ensureConfirmModalElements();

  if (confirmModalResolver) {
    resolveConfirmModal(false);
  }

  if (confirmModalTitleElement) {
    confirmModalTitleElement.textContent = title;
  }

  if (confirmModalMessageElement) {
    confirmModalMessageElement.textContent = message;
  }

  if (confirmModalCancelElement) {
    confirmModalCancelElement.textContent = cancelLabel;
  }

  if (confirmModalConfirmElement) {
    confirmModalConfirmElement.textContent = confirmLabel;
  }

  setConfirmModalOpen(true);

  return new Promise((resolve) => {
    confirmModalResolver = resolve;
    requestAnimationFrame(() => {
      confirmModalCancelElement?.focus();
    });
  });
}

function getDeleteConfirmationMessage(kind, item) {
  const itemLabel = item?.title?.trim();

  if (itemLabel) {
    return `Deseja excluir ${kind === "task" ? "a tarefa" : "a reuniao"} "${itemLabel}"? Esta acao nao pode ser desfeita.`;
  }

  return `Deseja excluir ${kind === "task" ? "esta tarefa" : "esta reuniao"}? Esta acao nao pode ser desfeita.`;
}

function getFriendlyErrorMessage(error, actionName = "") {
  const raw = String(error?.message || "Falha ao processar a requisicao.");
  const lowered = raw.toLowerCase();

  if (
    error?.status === 400 &&
    (actionName === "create" || actionName === "update-with-ai")
  ) {
    return raw;
  }

  if (
    lowered.includes("quota") ||
    lowered.includes("resource_exhausted") ||
    lowered.includes("cota") ||
    error?.status === 429
  ) {
    return "As cotas da IA foram atingidas agora. Aguarde alguns instantes e tente novamente.";
  }

  if (lowered.includes("gemini_api_key") || lowered.includes("chave")) {
    return "A chave da IA nao esta configurada corretamente no servidor.";
  }

  if (actionName === "create") {
    return `Nao foi possivel criar a tarefa com IA. ${raw}`;
  }

  if (actionName === "meeting-summary-stream") {
    return `Nao foi possivel gerar o resumo da reuniao. ${raw}`;
  }

  if (actionName === "save-manual") {
    return `Nao foi possivel salvar a tarefa manual. ${raw}`;
  }

  if (actionName === "delete-task") {
    if (error?.status === 404) {
      return "A tarefa nao foi encontrada. Atualize a lista e tente novamente.";
    }

    return `Nao foi possivel excluir a tarefa. ${raw}`;
  }

  if (actionName === "delete-meeting") {
    if (error?.status === 404) {
      return "A reuniao nao foi encontrada. Atualize a lista e tente novamente.";
    }

    return `Nao foi possivel excluir a reuniao. ${raw}`;
  }

  if (actionName === "suggest-tags") {
    return `Nao foi possivel sugerir tags agora. ${raw}`;
  }

  return raw;
}

function getActionErrorTitle(actionName) {
  if (actionName === "create") {
    return "Erro ao criar tarefa com IA";
  }

  if (actionName === "meeting-summary-stream") {
    return "Erro ao resumir reuniao";
  }

  if (actionName === "save-manual") {
    return "Erro ao salvar tarefa";
  }

  if (actionName === "delete-task") {
    return "Erro ao excluir tarefa";
  }

  if (actionName === "delete-meeting") {
    return "Erro ao excluir reuniao";
  }

  if (actionName === "update-with-ai") {
    return "Erro ao atualizar tarefa com IA";
  }

  if (actionName === "suggest-tags") {
    return "Erro ao sugerir tags";
  }

  return "Falha ao executar operacao";
}

function setChatDrawerOpen(isOpen) {
  if (!chatDrawerElement) {
    return;
  }

  chatDrawerElement.classList.toggle("is-open", isOpen);
  chatOverlayElement?.classList.toggle("is-visible", isOpen);
  document.body.classList.toggle("chat-drawer-open", isOpen);

  if (chatToggleButtonElement) {
    chatToggleButtonElement.setAttribute("aria-expanded", String(isOpen));
  }

  if (isOpen) {
    setTimeout(() => {
      clickbotInputElement?.focus();
    }, 60);
  }
}

function ensureChatHasMessages() {
  if (!chatEmptyElement || !chatThreadElement) {
    return;
  }

  chatEmptyElement.hidden =
    chatThreadElement.querySelector(".chat-message") !== null;
}

function scrollChatToBottom() {
  if (chatThreadElement) {
    chatThreadElement.scrollTop = chatThreadElement.scrollHeight;
  }
}

function createChatMessageElement(role, text = "") {
  const article = document.createElement("article");
  article.className = `chat-message chat-message--${role}`;

  const avatar = document.createElement("img");
  avatar.className = "chat-message-avatar";
  avatar.src = role === "user" ? USER_AVATAR_SRC : BOT_AVATAR_SRC;
  avatar.alt = role === "user" ? "Avatar do usuario" : "Avatar T-800";

  const roleLabel = document.createElement("span");
  roleLabel.className = "chat-message-role";
  roleLabel.textContent = role === "user" ? "Você" : "T800";

  const bubble = document.createElement("div");
  bubble.className = "chat-message-bubble";
  bubble.textContent = text;

  article.append(avatar, roleLabel, bubble);
  return { article, bubble };
}

function appendChatMessage(role, text = "", options = {}) {
  if (!chatThreadElement) {
    return null;
  }

  const message = createChatMessageElement(role, text);

  if (options.intro) {
    message.article.classList.add("chat-message--intro");
  }

  chatThreadElement.append(message.article);
  ensureChatHasMessages();
  scrollChatToBottom();
  return message;
}

function renderClickbotHistory() {
  if (!chatThreadElement) {
    return;
  }

  chatThreadElement.querySelectorAll(".chat-message").forEach((message) => {
    message.remove();
  });

  clickbotHistory.forEach((message) => {
    appendChatMessage(message.role, message.text);
  });

  if (clickbotHistory.length === 0) {
    appendChatMessage("assistant", INITIAL_CLICKBOT_MESSAGE, {
      intro: true,
    });
  }

  ensureChatHasMessages();
  setChatStatus(
    clickbotHistory.length > 0
      ? "Contexto carregado para continuar a conversa."
      : "T800 online. Envie sua primeira mensagem.",
    clickbotHistory.length > 0 ? "ready" : "idle",
  );
}

async function streamClickbotReply(message) {
  const response = await fetch("/chat-stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      history: clickbotHistory.slice(-8),
    }),
  });

  if (!response.ok || !response.body) {
    let errorMessage = "Falha ao iniciar o stream do ClickBot.";

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Mantem a mensagem padrao se nao houver JSON valido.
    }

    throw new Error(errorMessage);
  }

  const assistantMessage = appendChatMessage("assistant", "");

  if (!assistantMessage) {
    throw new Error("Nao foi possivel renderizar a resposta do chat.");
  }

  assistantMessage.bubble.classList.add("is-streaming");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assistantText = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const dataLine = event
        .split("\n")
        .find((line) => line.startsWith("data:"));

      if (!dataLine) {
        continue;
      }

      const payloadText = dataLine.slice(5).trim();

      if (payloadText === "[DONE]") {
        assistantMessage.bubble.classList.remove("is-streaming");
        assistantMessage.bubble.textContent = assistantText.trim() || "...";
        return assistantText.trim();
      }

      let payload;

      try {
        payload = JSON.parse(payloadText);
      } catch {
        continue;
      }

      if (payload.error) {
        throw new Error(payload.error);
      }

      if (payload.text) {
        assistantText += payload.text;
        assistantMessage.bubble.textContent = assistantText;
        scrollChatToBottom();
      }
    }
  }

  assistantMessage.bubble.classList.remove("is-streaming");
  assistantMessage.bubble.textContent = assistantText.trim() || "...";
  return assistantText.trim();
}

function setActionButtonsDisabled(isDisabled) {
  [
    createButtonElement,
    saveManualButtonElement,
    updateWithAIButtonElement,
    meetingSummaryStreamButtonElement,
    clickbotButtonElement,
    suggestTagsButtonElement,
  ].forEach((buttonElement) => {
    if (buttonElement) {
      buttonElement.disabled = isDisabled;
    }
  });
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.error || "Falha na requisição.");
    error.status = response.status;
    throw error;
  }

  return data;
}

// Task Cards

const PRIORITY_LABEL = { high: "alta", medium: "média", low: "baixa" };

function buildTaskCard(task) {
  const card = document.createElement("article");
  card.className = "task-card";
  card.dataset.taskId = task.id;

  const tags = Array.isArray(task.tags) ? task.tags : [];
  const tagsHtml = tags
    .slice(0, 4)
    .map((t) => `<span class="task-tag">${escapeHtml(t)}</span>`)
    .join("");

  const hours =
    task.estimated_hours != null
      ? `<span class="task-card-hours">${task.estimated_hours}h</span>`
      : "";

  const dateStr = task.created_at
    ? new Date(task.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  let dueDateHtml = "";
  if (task.due_date) {
    const due = new Date(task.due_date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = due < today;
    const [year, month, day] = String(task.due_date).split("-");
    const dueFmt =
      year && month && day ? `${day}/${month}/${year}` : task.due_date;
    dueDateHtml = `<span class="task-card-due${isOverdue ? " overdue" : ""}">⏰ Prazo: ${dueFmt}</span>`;
  }

  card.dataset.dueDate = task.due_date || "";

  card.innerHTML = `
    <div class="task-card-header">
      <span class="task-card-title">${escapeHtml(task.title || "—")}</span>
      <div class="task-card-actions">
        <button class="task-card-btn edit" title="Carregar no formulário" aria-label="Editar">✎</button>
        <button class="task-card-btn delete" title="Excluir tarefa" aria-label="Excluir">✕</button>
      </div>
    </div>
    ${task.description ? `<p class="task-card-desc">${escapeHtml(task.description)}</p>` : ""}
    <div class="task-card-footer">
      <span class="task-badge ${task.priority || "medium"}">${PRIORITY_LABEL[task.priority] || task.priority}</span>
      ${tagsHtml}
      ${hours}
    </div>
    <div class="task-card-meta">
      ${dateStr ? `<span class="task-card-date">📅 ${dateStr}</span>` : ""}
      ${dueDateHtml}
    </div>
  `;

  card.querySelector(".edit").addEventListener("click", () => {
    syncTaskForm(task);
    setEditingState(task);
    card
      .closest("[data-task-list-section]")
      ?.previousElementSibling?.querySelector("[data-task-title]")
      ?.focus();
  });

  card
    .querySelector(".delete")
    .addEventListener("click", () => handleDeleteCard(card, task));

  return card;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Filtros e Ordenação

let currentFilter = "all";
let currentSort = null; // null = padrão (id desc), "due_date" = por prazo
let editingTaskId = null;
let meetingItems = [];
let selectedMeetingId = null;

function applyFilter(priority) {
  currentFilter = priority;

  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === priority);
  });

  if (!taskCardsElement) return;

  taskCardsElement.querySelectorAll(".task-card").forEach((card) => {
    const match = priority === "all" || card.dataset.priority === priority;
    card.hidden = !match;
  });

  if (taskListEmptyElement) {
    const visible = taskCardsElement.querySelectorAll(
      ".task-card:not([hidden])",
    ).length;
    taskListEmptyElement.hidden = visible > 0;
  }
}

function applySortByDueDate() {
  if (!taskCardsElement) return;

  const sortBtn = document.querySelector("[data-sort='due_date']");
  const isActive = currentSort === "due_date";

  if (isActive) {
    currentSort = null;
    if (sortBtn) sortBtn.classList.remove("active");
    const cards = [...taskCardsElement.querySelectorAll(".task-card")];
    cards
      .sort((a, b) => Number(b.dataset.taskId) - Number(a.dataset.taskId))
      .forEach((card) => taskCardsElement.append(card));
    return;
  }

  currentSort = "due_date";
  if (sortBtn) sortBtn.classList.add("active");

  const cards = [...taskCardsElement.querySelectorAll(".task-card")];
  cards
    .sort((a, b) => {
      const da = a.dataset.dueDate || "";
      const db = b.dataset.dueDate || "";
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.localeCompare(db);
    })
    .forEach((card) => taskCardsElement.append(card));
}

document.querySelectorAll("[data-filter]").forEach((btn) => {
  btn.addEventListener("click", () => applyFilter(btn.dataset.filter));
});

document
  .querySelector("[data-sort='due_date']")
  ?.addEventListener("click", applySortByDueDate);

function addTaskCard(task) {
  if (!taskCardsElement) return;

  if (taskListEmptyElement) {
    taskListEmptyElement.hidden = true;
  }

  // Evita duplicatas: remove card anterior com mesmo id
  const existing = taskCardsElement.querySelector(
    `[data-task-id="${task.id}"]`,
  );
  if (existing) existing.remove();

  const card = buildTaskCard(task);
  card.dataset.priority = task.priority || "medium";
  const isHidden =
    currentFilter !== "all" && card.dataset.priority !== currentFilter;
  card.hidden = isHidden;
  taskCardsElement.prepend(card);

  if (!isHidden && taskListEmptyElement) taskListEmptyElement.hidden = true;
}

function renderTaskList(tasks) {
  if (!taskCardsElement) return;

  // Remove cards existentes, mantém o empty-state
  taskCardsElement
    .querySelectorAll(".task-card")
    .forEach((card) => card.remove());

  if (!Array.isArray(tasks) || tasks.length === 0) {
    if (taskListEmptyElement) taskListEmptyElement.hidden = false;
    return;
  }

  if (taskListEmptyElement) taskListEmptyElement.hidden = true;

  tasks.forEach((task) => {
    const card = buildTaskCard(task);
    card.dataset.priority = task.priority || "medium";
    taskCardsElement.append(card);
  });

  applyFilter(currentFilter);
}

async function handleDeleteCard(card, task) {
  const id = task?.id;

  const confirmed = await showConfirmModal({
    title: "Excluir tarefa",
    message: getDeleteConfirmationMessage("task", task),
    confirmLabel: "Excluir",
    cancelLabel: "Cancelar",
  });

  if (!confirmed) {
    return;
  }

  const editBtn = card.querySelector(".edit");
  const deleteBtn = card.querySelector(".delete");
  editBtn.disabled = true;
  deleteBtn.disabled = true;

  try {
    await requestJson(`/api/tasks/${id}`, { method: "DELETE" });
    card.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    card.style.opacity = "0";
    card.style.transform = "scale(0.95)";
    setTimeout(() => {
      card.remove();
      if (taskCardsElement && taskListEmptyElement) {
        const visible = taskCardsElement.querySelectorAll(
          ".task-card:not([hidden])",
        ).length;
        taskListEmptyElement.hidden = visible > 0;
      }
    }, 260);
    setOutput({ success: true, data: { id, deleted: true } });
  } catch (error) {
    editBtn.disabled = false;
    deleteBtn.disabled = false;
    showErrorModal(
      getActionErrorTitle("delete-task"),
      getFriendlyErrorMessage(error, "delete-task"),
    );
    setOutput({ success: false, error: error.message });
  }
}

// Ações

async function createTask() {
  const text = promptInputElement.value.trim();

  if (!text) {
    throw new Error("Digite um texto para criar a tarefa.");
  }

  const result = await requestJson("/api/tasks/create", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

  editingTaskId = null;
  syncTaskForm(result.data);
  addTaskCard(result.data);
  setOutput(result);
  clearTaskInputs();
}

async function loadSavedTasks() {
  const result = await requestJson("/api/tasks?limit=20", {
    method: "GET",
  });

  // Ao recarregar a página, mantém a lista visível e o formulário limpo.
  editingTaskId = null;
  clearTaskInputs();

  renderTaskList(result.data);
}

async function updateTaskWithAI() {
  if (!editingTaskId) {
    throw new Error("Nenhuma tarefa selecionada para edição.");
  }

  const text = aiEditTextElement?.value.trim();

  if (!text) {
    throw new Error("Descreva as alterações que deseja fazer na tarefa.");
  }

  const result = await requestJson(`/api/tasks/${editingTaskId}/ai`, {
    method: "PUT",
    body: JSON.stringify({ text }),
  });

  addTaskCard(result.data);
  setOutput(result);
  setEditingState(null);
  clearTaskInputs();
}

function formatMeetingDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setMeetingModalOpen(isOpen) {
  if (!meetingModalElement || !meetingModalOverlayElement) {
    return;
  }

  if (isOpen) {
    meetingModalOverlayElement.hidden = false;
    meetingModalElement.hidden = false;
    requestAnimationFrame(() => {
      meetingModalElement.classList.add("is-open");
    });
    return;
  }

  meetingModalElement.classList.remove("is-open");
  meetingModalOverlayElement.hidden = true;
  meetingModalElement.hidden = true;
}

function updateMeetingDetail(meeting) {
  if (!meetingModalElement) {
    return;
  }

  if (meetingDetailTitleElement) {
    meetingDetailTitleElement.textContent =
      meeting?.title || "Detalhes da reunião";
  }

  if (meetingDetailDateElement) {
    meetingDetailDateElement.textContent = meeting?.created_at
      ? formatMeetingDate(meeting.created_at)
      : "";
  }

  if (meetingDetailSummaryElement) {
    meetingDetailSummaryElement.textContent =
      meeting?.summary || "Sem sumário.";
  }

  setMeetingModalOpen(Boolean(meeting));
}

function buildMeetingCard(meeting) {
  const card = document.createElement("article");
  card.className = "task-card meeting-card";
  card.dataset.meetingId = String(meeting.id);

  const title = escapeHtml(meeting.title || "Reunião sem título");
  const createdAt = formatMeetingDate(meeting.created_at);

  card.innerHTML = `
    <div class="task-card-header">
      <span class="task-card-title">${title}</span>
      <div class="task-card-actions">
        <button class="task-card-btn delete" title="Excluir reunião" aria-label="Excluir reunião">✕</button>
      </div>
    </div>
    <div class="task-card-meta">
      <span class="task-card-date">📅 ${escapeHtml(createdAt || "Sem data")}</span>
    </div>
  `;

  card.querySelector(".delete")?.addEventListener("click", (event) => {
    event.stopPropagation();
    handleDeleteMeetingCard(card, meeting);
  });

  card.addEventListener("click", async () => {
    if (!meetingCardsElement) {
      return;
    }

    meetingCardsElement
      .querySelectorAll(".meeting-card")
      .forEach((item) => item.classList.remove("is-selected"));

    card.classList.add("is-selected");

    try {
      const result = await requestJson(`/api/meetings/${meeting.id}`, {
        method: "GET",
      });
      selectedMeetingId = meeting.id;
      updateMeetingDetail(result.data);
    } catch (error) {
      updateMeetingDetail({
        title: meeting.title || "Reunião",
        created_at: meeting.created_at,
        summary: `Falha ao carregar sumário: ${error.message}`,
      });
    }
  });

  return card;
}

async function handleDeleteMeetingCard(card, meeting) {
  const id = meeting?.id;
  const deleteBtn = card.querySelector(".delete");

  const confirmed = await showConfirmModal({
    title: "Excluir reuniao",
    message: getDeleteConfirmationMessage("meeting", meeting),
    confirmLabel: "Excluir",
    cancelLabel: "Cancelar",
  });

  if (!confirmed) {
    return;
  }

  if (deleteBtn) {
    deleteBtn.disabled = true;
  }

  try {
    await requestJson(`/api/meetings/${id}`, { method: "DELETE" });

    meetingItems = meetingItems.filter((meeting) => meeting.id !== id);

    if (selectedMeetingId === id) {
      selectedMeetingId = null;
      updateMeetingDetail(null);
    }

    card.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    card.style.opacity = "0";
    card.style.transform = "scale(0.95)";

    setTimeout(() => {
      applyMeetingSearch();
    }, 260);

    setOutput({ success: true, data: { id, deleted: true } });
  } catch (error) {
    if (deleteBtn) {
      deleteBtn.disabled = false;
    }

    showErrorModal(
      getActionErrorTitle("delete-meeting"),
      getFriendlyErrorMessage(error, "delete-meeting"),
    );
    setOutput({ success: false, error: error.message });
  }
}

function renderMeetingList(items) {
  if (!meetingCardsElement) {
    return;
  }

  meetingCardsElement
    .querySelectorAll(".meeting-card")
    .forEach((card) => card.remove());

  if (!Array.isArray(items) || items.length === 0) {
    if (meetingListEmptyElement) {
      meetingListEmptyElement.hidden = false;
    }
    updateMeetingDetail(null);
    return;
  }

  if (meetingListEmptyElement) {
    meetingListEmptyElement.hidden = true;
  }

  items.forEach((meeting) => {
    meetingCardsElement.append(buildMeetingCard(meeting));
  });

  const selectedCard = meetingCardsElement.querySelector(
    `.meeting-card[data-meeting-id="${selectedMeetingId}"]`,
  );

  if (selectedCard) {
    selectedCard.classList.add("is-selected");
  }
}

function applyMeetingSearch() {
  const query = (meetingSearchElement?.value || "").trim().toLowerCase();

  if (!query) {
    renderMeetingList(meetingItems);
    return;
  }

  const filtered = meetingItems.filter((meeting) => {
    const title = String(meeting.title || "").toLowerCase();
    const summary = String(meeting.summary || "").toLowerCase();
    const originalText = String(meeting.original_text || "").toLowerCase();
    return (
      title.includes(query) ||
      summary.includes(query) ||
      originalText.includes(query)
    );
  });

  renderMeetingList(filtered);
}

async function loadSavedMeetings() {
  const result = await requestJson("/api/meetings?limit=50", {
    method: "GET",
  });

  meetingItems = Array.isArray(result.data) ? result.data : [];
  setMeetingModalOpen(false);

  applyMeetingSearch();
}

async function saveManualTask() {
  const task = getTaskFromForm();

  if (!task.title) {
    throw new Error("Preencha o Título antes de salvar a tarefa.");
  }

  const isEditing = Number.isInteger(editingTaskId) && editingTaskId > 0;
  const endpoint = isEditing
    ? `/api/tasks/${editingTaskId}`
    : "/api/tasks/save";
  const method = isEditing ? "PUT" : "POST";

  const result = await requestJson(endpoint, {
    method,
    body: JSON.stringify(task),
  });

  addTaskCard(result.data);
  setOutput(result);
  editingTaskId = null;
  clearTaskInputs();
}

async function sendClickbotMessage() {
  const message =
    clickbotInputElement?.value.trim() || promptInputElement.value.trim();

  if (!message) {
    throw new Error("Digite uma mensagem para conversar com o ClickBot.");
  }

  appendChatMessage("user", message);
  clickbotHistory.push({ role: "user", text: message });
  clickbotHistory = clickbotHistory.slice(-12);
  persistClickbotHistory();

  if (clickbotInputElement) {
    clickbotInputElement.value = "";
  }

  setChatStatus("T800 esta respondendo em tempo real...", "streaming");

  try {
    const reply = await streamClickbotReply(message);
    clickbotHistory.push({ role: "assistant", text: reply });
    clickbotHistory = clickbotHistory.slice(-12);
    persistClickbotHistory();
    setChatStatus("Resposta concluida. Contexto atualizado.", "ready");
    setOutput({
      success: true,
      data: {
        reply,
        streamed: true,
        historySize: clickbotHistory.length,
      },
    });
  } catch (error) {
    const lastAssistantMessage = chatThreadElement?.lastElementChild;

    if (
      lastAssistantMessage?.classList.contains("chat-message--assistant") &&
      !lastAssistantMessage.textContent.trim()
    ) {
      lastAssistantMessage.remove();
    }

    const chatErrorMessage = getFriendlyErrorMessage(error, "clickbot");
    setChatStatus("Falha ao responder. Tente novamente.", "idle");
    appendChatMessage(
      "assistant",
      `Nao consegui responder agora. ${chatErrorMessage}`,
    );
    clickbotHistory.push({
      role: "assistant",
      text: `Nao consegui responder agora. ${chatErrorMessage}`,
    });
    clickbotHistory = clickbotHistory.slice(-12);
    persistClickbotHistory();
    throw new Error(chatErrorMessage);
  }
}

async function suggestTags() {
  const result = await requestJson("/api/tasks/suggest-tags", {
    method: "POST",
    body: JSON.stringify({ task: getTaskFromForm() }),
  });

  syncTaskForm(result.data);
  editingTaskId = null;
  setOutput(result);
}

async function streamMeetingSummary() {
  const projectId = Number(meetingProjectIdElement?.value);
  const title = meetingTitleElement?.value.trim() || "";
  const originalText = meetingTextElement?.value.trim() || "";

  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error("Informe um Project ID inteiro e maior que zero.");
  }

  if (!originalText) {
    throw new Error("Cole as notas da reunião para gerar o sumário.");
  }

  if (!title) {
    throw new Error("Informe o título da reunião.");
  }

  if (meetingProcessingElement) {
    meetingProcessingElement.hidden = false;
  }

  if (meetingSummaryOutputElement) {
    meetingSummaryOutputElement.textContent = "";
  }

  const response = await fetch("/meeting-summary-stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project_id: projectId,
      title,
      original_text: originalText,
    }),
  });

  if (!response.ok || !response.body) {
    let errorMessage = "Falha ao iniciar stream de resumo da reunião.";

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Mantem a mensagem padrao se nao houver JSON valido.
    }

    if (meetingProcessingElement) {
      meetingProcessingElement.hidden = true;
    }

    throw new Error(errorMessage);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let streamedSummary = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          continue;
        }

        let payload;

        try {
          payload = JSON.parse(trimmedLine);
        } catch {
          continue;
        }

        if (payload.type === "status") {
          continue;
        }

        if (payload.type === "chunk") {
          streamedSummary += payload.text || "";

          if (meetingSummaryOutputElement) {
            meetingSummaryOutputElement.textContent = streamedSummary;
          }
        }

        if (payload.type === "done") {
          await loadSavedMeetings();
          setOutput({
            success: true,
            data: payload.data,
          });
          if (meetingProjectIdElement) {
            meetingProjectIdElement.value = "";
          }
          if (meetingTitleElement) {
            meetingTitleElement.value = "";
          }
          if (meetingTextElement) {
            meetingTextElement.value = "";
          }
        }

        if (payload.type === "error") {
          throw new Error(payload.error || "Erro durante stream da reunião.");
        }
      }
    }
  } finally {
    if (meetingProcessingElement) {
      meetingProcessingElement.hidden = true;
    }
  }
}

async function runAction(actionName) {
  setActionButtonsDisabled(true);
  setOutput(`Executando ${actionName}...`);

  try {
    if (actionName === "create") {
      await createTask();
    } else if (actionName === "save-manual") {
      await saveManualTask();
    } else if (actionName === "update-with-ai") {
      await updateTaskWithAI();
    } else if (actionName === "clickbot") {
      await sendClickbotMessage();
    } else if (actionName === "suggest-tags") {
      await suggestTags();
    } else if (actionName === "meeting-summary-stream") {
      await streamMeetingSummary();
    } else {
      throw new Error("Ação não suportada nesta tela.");
    }
  } catch (error) {
    const friendlyMessage = getFriendlyErrorMessage(error, actionName);

    if (actionName !== "clickbot") {
      showErrorModal(getActionErrorTitle(actionName), friendlyMessage);
    }

    setOutput({
      success: false,
      status: error.status || 500,
      error: friendlyMessage,
    });
  } finally {
    setActionButtonsDisabled(false);
  }
}

createButtonElement?.addEventListener("click", () => runAction("create"));
saveManualButtonElement?.addEventListener("click", () =>
  runAction("save-manual"),
);
updateWithAIButtonElement?.addEventListener("click", () =>
  runAction("update-with-ai"),
);
cancelEditButtonElement?.addEventListener("click", () => {
  setEditingState(null);
});
clickbotButtonElement?.addEventListener("click", () => runAction("clickbot"));
suggestTagsButtonElement?.addEventListener("click", () =>
  runAction("suggest-tags"),
);
meetingSummaryStreamButtonElement?.addEventListener("click", () =>
  runAction("meeting-summary-stream"),
);
meetingSearchElement?.addEventListener("input", applyMeetingSearch);
meetingModalCloseElement?.addEventListener("click", () => {
  setMeetingModalOpen(false);
});
meetingModalOverlayElement?.addEventListener("click", () => {
  setMeetingModalOpen(false);
});

clickbotInputElement?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    runAction("clickbot");
  }
});

chatToggleButtonElement?.addEventListener("click", () => {
  const isCurrentlyOpen = chatDrawerElement?.classList.contains("is-open");
  setChatDrawerOpen(!isCurrentlyOpen);
});

chatCloseButtonElement?.addEventListener("click", () => {
  setChatDrawerOpen(false);
});

chatOverlayElement?.addEventListener("click", () => {
  setChatDrawerOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!confirmModalElement?.hidden) {
      resolveConfirmModal(false);
      return;
    }

    if (!errorModalElement?.hidden) {
      setErrorModalOpen(false);
      return;
    }

    if (!meetingModalElement?.hidden) {
      setMeetingModalOpen(false);
      return;
    }

    setChatDrawerOpen(false);
  }
});

restoreLastOutput();
ensureErrorModalElements();
renderClickbotHistory();
setChatDrawerOpen(false);
if (taskCardsElement) {
  loadSavedTasks();
}
if (meetingCardsElement) {
  loadSavedMeetings();
}
