# AI Chat 认证问题修复说明

## 🐛 问题描述
用户在使用AI聊天功能时，服务器报错：
```
👤 User ID (from auth): undefined
⚠️ User profile not found for userId: undefined
```

## 🔍 问题根本原因
JWT token中用户ID的字段名不匹配：

### JWT Token 创建时 (authController.js)
```javascript
const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, ...)
```
JWT payload: `{ userId: "actual_user_id" }`

### AI Chat 路由中的错误用法
```javascript
const userId = req.user.id; // ❌ 错误！应该是 req.user.userId
```

## ✅ 解决方案
修改 `ai-chat.js` 中所有对用户ID的引用：

```javascript
// 修改前 ❌
const userId = req.user.id;

// 修改后 ✅
const userId = req.user.userId;
```

## 🔧 已修复的地方

1. **主AI聊天路由**:
   ```javascript
   router.post('/', authMW, async (req, res) => {
     const userId = req.user.userId; // 修复
     // ...
   });
   ```

2. **获取项目列表路由**:
   ```javascript
   router.get('/projects', authMW, async (req, res) => {
     const userId = req.user.userId; // 修复
     // ...
   });
   ```

3. **切换项目路由**:
   ```javascript
   router.post('/switch-project', authMW, async (req, res) => {
     const userId = req.user.userId; // 修复
     // ...
   });
   ```

## 🐛 调试信息
添加了额外的调试日志：
```javascript
console.log('🔍 Debug - req.user:', req.user);
console.log('👤 User ID (from auth):', userId);
```

## ✅ 测试验证
修复后，应该能看到正确的日志：
```
🔍 Debug - req.user: { userId: 'actual_user_id', iat: ..., exp: ... }
👤 User ID (from auth): actual_user_id
📂 Current project: 项目名称
```

## 📝 注意事项
1. 确保JWT token有效且未过期
2. 确保用户已登录且cookie中有token
3. 确保用户有有效的UserProfile记录
4. 如果仍有问题，检查JWT_SECRET环境变量

## 🔄 重启服务
修改后需要重启服务器：
```bash
cd server
npm run dev
```

服务器会自动重新加载修改后的代码。
