# AI Chat API 使用指南

## 概述
AI Chat API 现在集成了完整的用户认证和数据库自动查询功能。系统会从JWT token中获取用户身份，自动查询用户的当前项目数据并发送给AI微服务。

## 认证机制
- 使用JWT token存储在cookie中进行用户认证
- 所有端点都需要有效的认证token
- 系统会自动从token中提取用户ID

## 端点

### 1. AI 对话 - POST `/api/ai-chat`

#### 认证要求
- 必须在cookie中包含有效的JWT token
- 系统会自动从token中获取用户ID

#### 请求体参数
```json
{
  "message": "string (必需) - 用户消息"
}
```

#### 系统自动查询流程
1. **从JWT token获取用户ID**
2. **查询用户profile** → 获取`lastProjectId`(当前项目)
3. **如果有当前项目，自动查询**:
   - 项目名称和描述
   - 该项目的所有状态列表
   - 该项目的所有任务
4. **发送完整上下文给AI微服务**

#### 响应示例

**成功响应 (技术问答):**
```json
{
  "reply": "Hey! Here's how you can approach this: First, you'll need to...",
  "type": "technical_answer",
  "intent": "technical_question",
  "confidence": 0.85,
  "note": "Technical guidance provided",
  "microservice_response": true
}
```

**成功响应 (任务创建):**
```json
{
  "reply": "Hey! I've created a task to help you: \"Setup authentication system\".",
  "type": "task", 
  "intent": "task_creation",
  "confidence": 0.75,
  "task": {
    "title": "Setup authentication system",
    "description": "Implement user login and registration",
    "status": "todo",
    "id": "task_1234567890_abc123"
  },
  "note": "A new task has been generated for you",
  "microservice_response": true
}
```

### 2. 获取用户项目列表 - GET `/api/ai-chat/projects`

#### 认证要求
- 需要有效的JWT token

#### 响应示例
```json
{
  "projects": [
    {
      "id": "project_123",
      "title": "Web应用开发",
      "description": "创建一个现代化的Web应用",
      "taskCount": 5,
      "statusCount": 3,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "totalProjects": 1,
  "currentProjectId": "project_123",
  "currentProject": {
    "id": "project_123",
    "title": "Web应用开发",
    "taskCount": 5,
    "statusCount": 3
  }
}
```

### 3. 切换当前项目 - POST `/api/ai-chat/switch-project`

#### 认证要求
- 需要有效的JWT token

#### 请求体参数
```json
{
  "projectId": "string (必需) - 要切换到的项目ID"
}
```

#### 响应示例
```json
{
  "success": true,
  "message": "Switched to project: Web应用开发",
  "currentProjectId": "project_123",
  "projectName": "Web应用开发"
}
```

## 错误处理

### 认证失败 (401)
```json
{
  "message": "Authentication token is missing"
}
```
或
```json
{
  "message": "Invalid authentication token"
}
```

### 用户资料未找到 (404)
```json
{
  "error": "User profile not found",
  "message": "User profile not found. Please complete your profile setup."
}
```

### 项目未找到 (404)
```json
{
  "error": "Project not found",
  "message": "Project not found or you do not have access to it."
}
```

### AI服务不可用 (503)
```json
{
  "error": "AI service unavailable",
  "message": "The AI microservice is currently unavailable. Please try again later.",
  "service_status": "offline"
}
```

## 使用示例

### 带认证的AI对话
```bash
curl -X POST http://localhost:3001/api/ai-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: token=your-jwt-token" \
  -d '{
    "message": "help me create a login page"
  }'
```

### 获取用户项目列表
```bash
curl http://localhost:3001/api/ai-chat/projects \
  -H "Cookie: token=your-jwt-token"
```

### 切换当前项目
```bash
curl -X POST http://localhost:3001/api/ai-chat/switch-project \
  -H "Content-Type: application/json" \
  -H "Cookie: token=your-jwt-token" \
  -d '{
    "projectId": "project_456"
  }'
```

## 系统架构

```
前端应用 (带JWT cookie)
    ↓ (POST /api/ai-chat)
认证中间件 (验证JWT token)
    ↓ (提取用户ID)
主服务器 (ai-chat.js)
    ↓ (自动查询数据库)
MongoDB (用户profile → 当前项目 → 状态 → 任务)
    ↓ (整理完整上下文)
AI 微服务 (/api/smart)
    ↓ (LangChain + OpenAI)
智能AI回复
    ↓ (返回结果)
前端应用
```

## 数据流详解

1. **用户认证流程**:
   ```
   JWT Cookie → Auth Middleware → req.user.id
   ```

2. **自动数据查询流程**:
   ```
   用户ID → UserProfile → lastProjectId → Project信息
                                      ↓
                                  Status列表 → Task列表
   ```

3. **AI上下文构建**:
   ```json
   {
     "userId": "user_123",
     "projectName": "我的项目",
     "statuses": ["待办", "进行中", "已完成"],
     "existingTasks": [...]
   }
   ```

## 注意事项

1. **自动上下文**: 系统自动从用户的当前项目获取所有相关数据
2. **安全性**: 所有数据查询都基于认证用户的权限
3. **容错性**: 如果当前项目不存在或查询失败，系统会使用默认值继续工作
4. **项目切换**: 用户可以通过API切换当前工作项目
5. **性能**: 数据库查询已优化，使用适当的索引和关联查询
