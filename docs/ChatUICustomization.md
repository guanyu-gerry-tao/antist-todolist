# ChatUI Kit CSS 自定义指南

## 方法一：CSS 类名覆盖（推荐）

ChatUI Kit 使用标准的 CSS 类名，你可以通过以下类名进行自定义：

### 主要组件类名：
- `.cs-main-container` - 主容器
- `.cs-chat-container` - 聊天容器
- `.cs-message-list` - 消息列表
- `.cs-message` - 消息项
- `.cs-message--incoming` - 接收的消息
- `.cs-message--outgoing` - 发送的消息
- `.cs-message-input` - 输入框容器
- `.cs-message-input__content-editor` - 输入框编辑器
- `.cs-message-input__send-button` - 发送按钮
- `.cs-typing-indicator` - 打字指示器
- `.cs-avatar` - 头像

### 自定义示例：

```css
/* 容器背景渐变 */
.aiChatPanelContainer .cs-main-container {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 消息气泡阴影效果 */
.aiChatPanelContainer .cs-message {
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: transform 0.2s;
}

.aiChatPanelContainer .cs-message:hover {
    transform: translateY(-1px);
}

/* 输入框样式 */
.aiChatPanelContainer .cs-message-input__content-editor {
    border: 2px solid #e0e0e0;
    border-radius: 25px;
    background: rgba(255,255,255,0.9);
    backdrop-filter: blur(10px);
}

/* 发送按钮动画 */
.aiChatPanelContainer .cs-message-input__send-button {
    background: linear-gradient(45deg, #ff6b6b, #ee5a24);
    transition: all 0.3s;
}

.aiChatPanelContainer .cs-message-input__send-button:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(238, 90, 36, 0.4);
}
```

## 方法二：CSS 变量（如果支持）

某些版本的 ChatUI Kit 支持 CSS 变量：

```css
:root {
    --cs-message-bg-color-incoming: #e3f2fd;
    --cs-message-bg-color-outgoing: #2196f3;
    --cs-message-border-radius: 18px;
    --cs-input-border-radius: 25px;
}
```

## 方法三：主题配置（通过 Props）

某些组件支持通过 props 传递样式：

```tsx
<MainContainer style={{
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px'
}}>
    <ChatContainer style={{
        background: 'rgba(255,255,255,0.95)'
    }}>
        <MessageList style={{
            padding: '20px'
        }}>
            {/* Messages */}
        </MessageList>
        <MessageInput 
            style={{
                background: 'rgba(255,255,255,0.9)',
                borderTop: '1px solid rgba(255,255,255,0.3)'
            }}
        />
    </ChatContainer>
</MainContainer>
```

## 方法四：自定义主题文件

1. 复制默认样式文件到你的项目
2. 修改样式
3. 导入你的自定义样式文件而不是默认的

```tsx
// 替换这行
// import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";

// 改为导入你的自定义样式
import "./styles/custom-chat-ui.css";
```

## 调试技巧

1. 使用浏览器开发者工具检查元素的实际类名
2. 使用 `!important` 强制覆盖样式（但要谨慎使用）
3. 确保你的自定义 CSS 在默认样式之后加载

```css
/* 使用 !important 强制覆盖 */
.aiChatPanelContainer .cs-message--incoming {
    background: #e8f5e8 !important;
    border-radius: 20px !important;
}
```

## 响应式设计

```css
@media (max-width: 768px) {
    .aiChatPanelContainer {
        width: 100vw;
        height: 100vh;
        right: 0;
        bottom: 0;
        border-radius: 0;
    }
}
```

## 动画效果

```css
.aiChatPanelContainer .cs-message {
    animation: messageSlideIn 0.3s ease-out;
}

@keyframes messageSlideIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```
