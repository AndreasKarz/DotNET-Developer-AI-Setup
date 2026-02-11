# Customizing the AI Setup for Your Technology Stack

This repository is built around a specific stack — **.NET, HotChocolate GraphQL, MongoDB, Azure DevOps, MassTransit** — but the entire `.github/` configuration is designed to be adapted. You don't need to rewrite everything manually. **Use GitHub Copilot itself to do the heavy lifting.**

The key insight: The AI configuration files (Instructions, Agents, Skills, Prompts) are just Markdown. Copilot can read them, understand their structure, and rewrite them for a different technology stack — if you give it the right prompt.

## How It Works

1. **Fork or clone** this repository
2. **Open it in VS Code** with GitHub Copilot enabled (Agent Mode)
3. **Give Copilot a migration prompt** (see examples below)
4. **Review the changes** — Copilot will rewrite instructions, agents, and skills to match your stack
5. **Iterate** — refine with follow-up prompts until it fits your project

> **Tip:** Work one axis at a time. Don't try to switch the language, API style, database, and CI/CD platform in a single prompt. Each example below focuses on one technology swap.

---

## Examples

<details>
<summary><strong>1. Switch from GraphQL (HotChocolate) to REST (ASP.NET Core Controllers)</strong></summary>

### What Changes

| File | Change |
|------|--------|
| `instructions/general.instructions.md` | Replace GraphQL API Structure section with REST conventions (controllers, DTOs, route naming) |
| `instructions/graphql.instructions.md` | **Delete** or rename to `rest.instructions.md` with controller/endpoint rules |
| `agents/HotChocolateExpert.agent.md` | **Delete** or replace with a REST API Expert agent |
| `agents/APIStitchingExpert.agent.md` | Replace with API Gateway / BFF agent (if applicable) |
| `skills/hotchocolate-specialist/` | **Delete** or replace with a REST/Swagger/OpenAPI skill |
| `skills/backend-developer/SKILL.md` | Replace HotChocolate resolver patterns with controller patterns |
| `AGENTS.md` | Update delegation tables, remove GraphQL references |

### Example Prompt

```
Read the entire .github/ folder structure. I want to migrate this AI setup 
from HotChocolate GraphQL to ASP.NET Core REST APIs with Controllers.

For every file that references GraphQL, HotChocolate, resolvers, schema stitching, 
ObjectType, or DataLoader — rewrite it for REST conventions:
- Controllers with [ApiController] and route attributes
- DTOs for request/response (not GraphQL input/output types)
- Swagger/OpenAPI documentation with XML comments
- Mediator pattern (MediatR) instead of resolvers
- API versioning via URL path (/api/v1/)

Rename graphql.instructions.md to rest.instructions.md with the new applyTo 
pattern "**/Controllers/**/*.cs".

Delete the HotChocolateExpert agent and replace it with a REST API Expert agent.
Replace the APIStitchingExpert agent with an API Gateway Expert.
Update AGENTS.md delegation tables accordingly.
Keep all other conventions (testing, naming, architecture layers) intact.
```

</details>

<details>
<summary><strong>2. Switch from Azure DevOps to Jira + Confluence</strong></summary>

### What Changes

| File | Change |
|------|--------|
| `agents/DevOpsExpert.agent.md` | Replace ADO MCP tool references with Jira/Confluence MCP tools |
| `skills/devops-specialist/SKILL.md` | Replace ADO pipeline YAML with GitHub Actions or Jenkins |
| `prompts/Implement_from_PBI.prompt.md` | Replace PBI/ADO terminology with Jira Issue/Story; swap ADO MCP calls for Jira MCP calls |
| `AGENTS.md` | Update tool references in delegation tables |
| `setup-mcp-servers.mjs` | Replace `azure-devops` MCP server with Jira and Confluence MCP servers |
| `README.md` | Update MCP server table and setup instructions |

### Example Prompt

```
Read the entire .github/ folder and the setup-mcp-servers.mjs file. 
I want to replace Azure DevOps with Jira + Confluence throughout.

Specifically:
- In the DevOpsExpert agent: replace all ADO MCP tool references 
  (ado/wit_*, ado/repo_*, ado/pipelines_*) with Jira MCP equivalents 
  (jira/get_issue, jira/search, jira/create_issue, etc.)
- In the Implement_from_PBI prompt: rename to Implement_from_Story.prompt.md, 
  replace "PBI" with "Story", replace "Work Item ID" with "Jira Issue Key", 
  replace all ADO MCP calls with Jira MCP calls
- In devops-specialist skill: replace Azure DevOps pipeline templates 
  with GitHub Actions workflow patterns
- In setup-mcp-servers.mjs: replace the azure-devops MCP server entry 
  with atlassian-jira and atlassian-confluence MCP servers
- Update the README MCP server table accordingly
- Keep all coding standards, testing conventions, and architecture rules intact
```

</details>

<details>
<summary><strong>3. Switch from C# / .NET to Java / Spring Boot</strong></summary>

### What Changes

This is the most comprehensive migration — it touches nearly every file.

| File | Change |
|------|--------|
| `instructions/general.instructions.md` | Rewrite coding standards for Java (naming, packages, build tools) |
| `instructions/tests.instructions.md` | Replace xUnit/Moq/FluentAssertions with JUnit 5/Mockito/AssertJ |
| `instructions/graphql.instructions.md` | Replace HotChocolate with Spring for GraphQL or Netflix DGS |
| `instructions/worker.instructions.md` | Replace MassTransit consumers with Spring Kafka/RabbitMQ listeners |
| All agents | Rewrite for Java ecosystem (Spring Boot, Maven/Gradle, JPA) |
| All skills | Rewrite code examples, patterns, and framework references |
| `AGENTS.md` | Update tech stack, dependency rules, project structure |
| `prompts/Implement_from_PBI.prompt.md` | Replace `dotnet build`/`dotnet test` with `mvn`/`gradle` commands |

### Example Prompt

```
I want to migrate this entire .github/ AI setup from C#/.NET to Java/Spring Boot.
Read every file in .github/ and rewrite them for the following stack:

- Language: Java 21 (LTS)
- Framework: Spring Boot 3.x
- API: Spring for GraphQL (or replace with Spring MVC REST if preferred)
- Database: MongoDB with Spring Data MongoDB
- Messaging: Spring Kafka (instead of MassTransit + Azure Service Bus)
- Testing: JUnit 5 + Mockito + AssertJ
- Build: Gradle (Kotlin DSL)
- Background Jobs: Spring Scheduler + Quartz

Rewrite general.instructions.md:
- Java naming conventions (camelCase fields, PascalCase classes)
- Package structure instead of .NET project structure
- Spring dependency injection instead of Microsoft DI
- Gradle multi-module project layout

Rewrite all agents to reference Java/Spring equivalents.
Rewrite the CSharpExpert agent into a JavaExpert agent.
Rewrite tests.instructions.md for JUnit 5 + Mockito.
Update all build/test commands from dotnet CLI to gradle.
Keep the overall architecture philosophy (layered, domain-driven) intact.
```

</details>

<details>
<summary><strong>4. Switch from MongoDB to PostgreSQL</strong></summary>

### What Changes

| File | Change |
|------|--------|
| `instructions/general.instructions.md` | Replace MongoDB references with PostgreSQL + EF Core / Dapper |
| `agents/MongoDBExpert.agent.md` | Replace with PostgreSQL Expert agent |
| `skills/database-specialist/SKILL.md` | Rewrite for EF Core migrations, DbContext, LINQ queries |
| `skills/backend-developer/SKILL.md` | Replace MongoDB repository patterns with EF Core repository patterns |
| `AGENTS.md` | Update database references and delegation tables |
| `setup-mcp-servers.mjs` | Replace MongoDB MCP server with PostgreSQL MCP server |

### Example Prompt

```
Read the entire .github/ folder. I want to switch the primary database 
from MongoDB to PostgreSQL with Entity Framework Core.

Specifically:
- In general.instructions.md: replace "MongoDB with MongoDB.Driver" 
  with "PostgreSQL with Entity Framework Core" in the tech stack
- Rename MongoDBExpert.agent.md to PostgreSQLExpert.agent.md and rewrite it 
  for PostgreSQL — execution plans (EXPLAIN ANALYZE), index strategies (B-tree, 
  GIN, GiST), query optimization, connection pooling (Npgsql)
- In database-specialist skill: replace MongoDB repository patterns with 
  EF Core patterns — DbContext, migrations, LINQ queries, IQueryable, 
  change tracking, connection resilience
- In backend-developer skill: replace IMongoCollection patterns with 
  DbSet<T> patterns, replace MongoDB conventions with EF Core conventions
- In setup-mcp-servers.mjs: replace the mongodb MCP server with a 
  PostgreSQL MCP server
- Keep the MSSQLExpert agent as-is (it handles a different database)
- Update AGENTS.md delegation tables accordingly
```

</details>

<details>
<summary><strong>5. Switch from MassTransit / Azure Service Bus to RabbitMQ Direct</strong></summary>

### What Changes

| File | Change |
|------|--------|
| `instructions/worker.instructions.md` | Replace MassTransit consumer patterns with RabbitMQ.Client patterns |
| `instructions/general.instructions.md` | Update messaging entry in tech stack |
| `skills/backend-developer/SKILL.md` | Replace MassTransit IConsumer with RabbitMQ channel/consumer patterns |
| `agents/DebugExpert.agent.md` | Update MassTransit debugging sections for RabbitMQ |
| `AGENTS.md` | Update messaging references |

### Example Prompt

```
Read the .github/ folder. I want to replace MassTransit + Azure Service Bus 
with direct RabbitMQ (using the official RabbitMQ.Client NuGet package).

In worker.instructions.md:
- Replace MassTransit IConsumer<T> patterns with RabbitMQ IAsyncBasicConsumer
- Replace MassTransit ConsumeContext with RabbitMQ BasicDeliverEventArgs
- Update error handling from MassTransit retry/fault to RabbitMQ nack/dead-letter
- Replace Outbox pattern references with RabbitMQ publisher confirms

In backend-developer skill:
- Replace MassTransit DI registration with RabbitMQ ConnectionFactory setup
- Replace IBus.Publish with IModel.BasicPublish
- Update message serialization patterns (System.Text.Json with RabbitMQ)

In general.instructions.md:
- Change "Azure Service Bus through a Masstransit abstraction" 
  to "RabbitMQ with RabbitMQ.Client"

In DebugExpert agent:
- Replace MassTransit-specific debugging (saga issues, consumer filters) 
  with RabbitMQ-specific debugging (queue bindings, dead-letter, 
  connection recovery)

Keep all other conventions intact.
```

</details>

---

## Tips for Effective Migration

1. **One axis at a time** — Don't switch language + database + CI/CD in one prompt. Each migration creates cascading changes; review one before starting the next.

2. **Start with `general.instructions.md`** — This is the foundation. Once the tech stack, project structure, and dependency rules are correct here, everything else follows.

3. **Use the `skill-creator` and `agent-creator` skills** — After migrating, ask Copilot to create new skills or agents for your specific technologies:
   ```
   Create a new skill for Spring Data MongoDB best practices 
   in our Java/Spring Boot project.
   ```

4. **Validate with the Smoke Test** — After migration, run through the [Smoke Test](README.md#smoke-test) section to verify agents and skills load correctly.

5. **Keep the architecture philosophy** — The layered architecture (Abstractions → Core → DataAccess → API → Worker) is technology-agnostic. Change the implementation details, not the separation of concerns.

6. **Commit between migrations** — Create a Git commit after each successful technology swap. This gives you a clean rollback point if a subsequent migration goes wrong.
