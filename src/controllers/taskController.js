import taskService from "../services/taskService.js";

const {
  createTaskFromText,
  isGeminiUnavailableError,
  suggestTagsForTask: suggestTagsForTaskService,
  planSprintFromText: planSprintFromTextService,
  generateTaskBreakdownFromText: generateTaskBreakdownFromTextService,
} = taskService;

function getErrorResponse(error) {
  if (error?.status === 400 || error?.name === "UnsupportedTaskIntentError") {
    return {
      status: 400,
      body: {
        success: false,
        error:
          error.message || "A ação solicitada não é compatível com este campo.",
      },
    };
  }

  if (error?.code && String(error.code).startsWith("ER_")) {
    return {
      status: 500,
      body: {
        success: false,
        error: "Falha ao acessar o banco de dados.",
      },
    };
  }

  if (isGeminiUnavailableError(error)) {
    return {
      status: 503,
      body: {
        success: false,
        error:
          "A integração com o Gemini está indisponível porque a GEMINI_API_KEY não foi configurada.",
      },
    };
  }

  return {
    status: 502,
    body: {
      success: false,
      error: error.message || "Falha ao processar a requisição com o Gemini.",
    },
  };
}

function normalizeOptionalDate(dateValue) {
  if (typeof dateValue !== "string") {
    return null;
  }

  const value = dateValue.trim();

  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const brDateMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDateMatch) {
    const [, day, month, year] = brDateMatch;
    return `${year}-${month}-${day}`;
  }

  return null;
}

const createTask = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "O campo 'text' é obrigatório.",
      });
    }

    const trimmedText = text.trim();
    const task = await createTaskFromText(trimmedText, "create");
    const savedTask = await taskService.saveTask(task, trimmedText);

    res.status(201).json({
      success: true,
      data: savedTask,
    });
  } catch (error) {
    console.error("Erro ao criar tarefa:", error);
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
};

const listTasks = async (req, res) => {
  try {
    const { limit } = req.query;
    const tasks = await taskService.listTasks(limit);

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error("Erro ao listar tarefas salvas:", error);
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
};

const suggestTagsForTask = async (req, res) => {
  try {
    const { task } = req.body;

    if (!task || typeof task !== "object") {
      return res.status(400).json({
        success: false,
        error: "O campo 'task' é obrigatório e deve ser um objeto.",
      });
    }

    if (
      !task.description ||
      typeof task.description !== "string" ||
      task.description.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          "A task deve ter o campo 'description' preenchido para sugerir tags.",
      });
    }

    const tarefaComTags = await suggestTagsForTaskService(task);
    res.status(200).json({
      success: true,
      data: tarefaComTags,
    });
  } catch (error) {
    console.error("Erro ao sugerir tags para a tarefa:", error);
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
};

const planSprint = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "O campo 'text' é obrigatório.",
      });
    }

    const sprint = await planSprintFromTextService(text.trim());

    res.status(200).json({
      success: true,
      data: sprint,
    });
  } catch (error) {
    console.error("Erro ao gerar sprint:", error);
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
};

const generateBreakdown = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "O campo 'text' é obrigatório.",
      });
    }

    const task = await generateTaskBreakdownFromTextService(text.trim());

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("Erro ao gerar breakdown:", error);
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
};

const saveManualTask = async (req, res) => {
  try {
    const { title, description, priority, tags, due_date, estimated_hours } =
      req.body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "O campo 'title' é obrigatório.",
      });
    }

    const task = {
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : "",
      priority: ["high", "medium", "low"].includes(priority)
        ? priority
        : "medium",
      tags: Array.isArray(tags) ? tags : [],
      estimated_hours:
        typeof estimated_hours === "number" && !Number.isNaN(estimated_hours)
          ? estimated_hours
          : null,
      due_date: normalizeOptionalDate(due_date),
    };

    const savedTask = await taskService.saveTask(task, null);

    res.status(201).json({
      success: true,
      data: savedTask,
    });
  } catch (error) {
    console.error("Erro ao salvar tarefa manual:", error);
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
};

const updateManualTask = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, description, priority, tags, due_date, estimated_hours } =
      req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: "ID inválido.",
      });
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "O campo 'title' é obrigatório.",
      });
    }

    const task = {
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : "",
      priority: typeof priority === "string" ? priority : "medium",
      tags: Array.isArray(tags) ? tags : [],
      estimated_hours:
        typeof estimated_hours === "number" && !Number.isNaN(estimated_hours)
          ? estimated_hours
          : null,
      due_date: normalizeOptionalDate(due_date),
    };

    const updatedTask = await taskService.updateTask(id, task);

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        error: "Tarefa não encontrada.",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    console.error("Erro ao atualizar tarefa manual:", error);
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
};

const deleteTask = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: "ID inválido.",
      });
    }

    const deleted = await taskService.deleteTask(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Tarefa não encontrada.",
      });
    }

    res.status(200).json({ success: true, data: { id } });
  } catch (error) {
    console.error("Erro ao deletar tarefa:", error);
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
};

const updateTaskWithAI = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { text } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: "ID inválido.",
      });
    }

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "O campo 'text' é obrigatório.",
      });
    }

    const parsedTask = await createTaskFromText(text.trim(), "update");
    const updatedTask = await taskService.updateTask(id, parsedTask);

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        error: "Tarefa não encontrada.",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    console.error("Erro ao atualizar tarefa com IA:", error);
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
};

const taskController = {
  createTask,
  listTasks,
  suggestTagsForTask,
  planSprint,
  generateBreakdown,
  saveManualTask,
  updateManualTask,
  updateTaskWithAI,
  deleteTask,
};

export default taskController;
