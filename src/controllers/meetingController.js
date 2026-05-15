import meetingSummaryService from "../services/meetingSummaryService.js";

function buildErrorResponse(error) {
  if (error?.code && String(error.code).startsWith("ER_")) {
    return {
      status: 500,
      body: {
        success: false,
        error: "Falha ao acessar o banco de dados.",
      },
    };
  }

  return {
    status: 500,
    body: {
      success: false,
      error: error?.message || "Falha ao processar reuniões.",
    },
  };
}

async function listMeetings(req, res) {
  try {
    const { limit, search } = req.query;
    const meetings = await meetingSummaryService.listMeetingSummaries({
      limit,
      search,
    });

    res.status(200).json({
      success: true,
      data: meetings,
    });
  } catch (error) {
    console.error("Erro ao listar reuniões:", error);
    const errorResponse = buildErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
}

async function getMeetingById(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: "O parâmetro 'id' deve ser um número inteiro positivo.",
      });
    }

    const meeting = await meetingSummaryService.getMeetingSummaryById(id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: "Reunião não encontrada.",
      });
    }

    res.status(200).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    console.error("Erro ao buscar reunião por ID:", error);
    const errorResponse = buildErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
}

async function deleteMeeting(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: "O parâmetro 'id' deve ser um número inteiro positivo.",
      });
    }

    const deleted = await meetingSummaryService.deleteMeetingSummary(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Reunião não encontrada.",
      });
    }

    res.status(200).json({ success: true, data: { id } });
  } catch (error) {
    console.error("Erro ao deletar reunião:", error);
    const errorResponse = buildErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
}

const meetingController = {
  listMeetings,
  getMeetingById,
  deleteMeeting,
};

export default meetingController;
