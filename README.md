# Projeto AI

Uma API REST desenvolvida com **Node.js**, **Express** e **Google Gemini** para integrar inteligência artificial em aplicações. Oferece funcionalidades de chat em tempo real, resumo inteligente de reuniões e planejamento automático de sprints.

## 👤 Autor

**Daniel Moraes**
**218 (Identificação UpSkill)**

## 🔗 Repositório

https://github.com/DanielMoraesTI/projeto_ai

---

## 🚀 Como Executar

### Pré-requisitos

- Node.js instalado (versão 16 ou superior)
- npm ou yarn
- MySQL Server instalado (versão 5.7 ou superior)
- Chave de API Google Gemini

### Passos para Instalar e Rodar

1. **Clone o repositório:**

   ```bash
   git clone https://github.com/DanielMoraesTI/projeto_ai
   cd Projeto_ai
   ```

2. **Instale as dependências:**

   ```bash
   npm install
   ```

3. **Configure o banco de dados MySQL:**
   - Crie um banco de dados chamado `projeto_ai`
   - Execute as queries SQL para criar as tabelas
   - Veja [sql/database_schema.sql](sql/database_schema.sql) para os schemas

4. **Configure as variáveis de ambiente** (arquivo `.env`):

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=sua_senha
   DB_NAME=projeto_ai
   DB_PORT=3306
   PORT=3000
   GEMINI_API_KEY=sua_chave_api_google_gemini
   ```

5. **Inicie o servidor:**

   ```bash
   npm start
   ```

6. **Acesse a aplicação:**
   ```
   http://localhost:3000
   ```

---

## 📋 Recursos Disponíveis

### Chat com IA (`/stream`)

- `POST /stream/chat` - Enviar mensagem e receber resposta em tempo real (streaming)
- Integração com Google Gemini
- Respostas contínuas sem interrupção

### Reuniões (`/meetings`)

- `POST /meetings` - Criar nova reunião
- `GET /meetings` - Listar reuniões
- `GET /meetings/:id` - Obter detalhes de uma reunião
- `POST /meetings/:id/summarize` - Gerar resumo inteligente de uma reunião
- Resumos automáticos com IA

### Tarefas (`/tasks`)

- `GET /tasks` - Listar tarefas
- `POST /tasks` - Criar tarefa
- `PUT /tasks/:id` - Atualizar tarefa
- `DELETE /tasks/:id` - Deletar tarefa
- `POST /tasks/generate` - Gerar tarefas automaticamente com IA
- `POST /tasks/plan-sprint` - Planejar sprint com distribuição de tarefas

---

## 🎯 Principais Decisões Tomadas

### 1. **Integração com Google Gemini**

- Utiliza a API do Google Gemini para processamento de IA
- Suporta streaming de respostas em tempo real
- Configuração centralizada em `config/genai.js`

**Justificativa**: Fornece respostas de IA de alta qualidade com latência reduzida através do streaming.

### 2. **Arquitetura em Camadas**

- **Controllers**: Responsáveis por receber e validar requisições HTTP
- **Services**: Contêm toda a lógica de negócios e integração com IA
- **Routes**: Definem os endpoints e aplicam middlewares

**Justificativa**: Essa separação promove código mais limpo, testável e fácil de manter.

### 3. **Streaming de Respostas de Chat**

- Respostas do chat utilizam Server-Sent Events (SSE) para streaming
- Não bloqueia requisições, oferecendo melhor experiência ao usuário

**Justificativa**: Permite ao usuário receber respostas parciais enquanto a IA continua processando.

### 4. **Processamento de Reuniões com IA**

- Transcrições de reuniões são analisadas por IA para gerar resumos
- Identificação automática de pontos-chave e ações

**Justificativa**: Automatiza o processo manual de documentação de reuniões.

### 5. **Planejamento Automático de Sprints**

- IA gera decomposição de tarefas e distribui entre o time
- Otimização automática de prioridades

**Justificativa**: Reduz tempo de planejamento e melhora distribuição de carga de trabalho.

---

## 🏗️ Estrutura do Projeto

```
Projeto_ai/
├── src/
│   ├── app.js                          # Servidor Express principal
│   ├── start.js                        # Inicialização da aplicação
│   ├── config/
│   │   ├── genai.js                    # Configuração Google Gemini
│   │   └── mysql.js                    # Pool de conexão MySQL
│   ├── controllers/
│   │   ├── chatStreamController.js     # Lógica de chat com streaming
│   │   ├── meetingController.js        # Lógica de reuniões
│   │   └── taskController.js           # Lógica de tarefas
│   ├── services/
│   │   ├── chatbotService.js           # Integração Gemini para chat
│   │   ├── meetingSummaryService.js    # Geração de resumos de reuniões
│   │   └── taskService.js              # Lógica de tarefas
│   ├── routes/
│   │   ├── streamRoutes.js             # Endpoints de chat
│   │   ├── meetingRoutes.js            # Endpoints de reuniões
│   │   └── taskRoutes.js               # Endpoints de tarefas
│   └── utils/
│       ├── generateTaskBreakdown.js    # Decomposição de tarefas com IA
│       ├── planSprint.js               # Planejamento de sprint
│       └── systemPrompt.js             # Prompts do sistema para IA
├── public/
│   ├── index.html                      # Interface web
│   ├── reunioes.html                   # Página de reuniões
│   ├── main.js                         # JavaScript frontend
│   ├── styles.css                      # Estilos
│   └── assets/
│       └── images/                     # Imagens do projeto
├── sql/
│   └── database_schema.sql             # Schema do banco de dados
├── package.json
├── .env                                # Variáveis de ambiente
└── README.md
```

---

## 📝 Exemplos Rápidos

### Chat com IA (Streaming)

```bash
POST http://localhost:3000/stream/chat
Content-Type: application/json

{
  "message": "Como organizar um projeto de IA?",
  "context": "desenvolvimento"
}
```

### Criar Reunião

```bash
POST http://localhost:3000/meetings
Content-Type: application/json

{
  "title": "Planning Sprint 1",
  "date": "2024-05-15",
  "attendees": ["Daniel", "João", "Maria"]
}
```

### Gerar Resumo de Reunião

```bash
POST http://localhost:3000/meetings/1/summarize
Content-Type: application/json

{
  "transcript": "Discussão sobre arquitetura e requisitos do projeto..."
}
```

### Gerar Tarefas Automaticamente

```bash
POST http://localhost:3000/tasks/generate
Content-Type: application/json

{
  "objective": "Desenvolver módulo de autenticação",
  "requirements": "Usar JWT e bcrypt"
}
```

---

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js + Express
- **IA**: Google Gemini API
- **Banco de Dados**: MySQL
- **Frontend**: HTML5 + CSS + Vanilla JavaScript
- **Streaming**: Server-Sent Events (SSE)

---

## 📄 Licença

Este projeto é desenvolvido para fins educacionais no programa UpSkill.

### Associar Tag a Tarefa

```bash
POST http://localhost:3000/tasks/1/tags
Content-Type: application/json

{
  "tagId": 3
}
```

## 📚 Conceitos Utilizados

- **REST API** - Arquitetura orientada a recursos
- **MVC** - Separação de responsabilidades
- **Middlewares** - Processamento de requisições
- **HTTP Status Codes** - 200, 201, 400, 404, etc
- **JSON** - Formato de dados
- **MySQL** - Banco de dados relacional
- **Relacionamentos** - 1:N (tarefas → usuários) e N:N (tarefas ↔ tags)

---
