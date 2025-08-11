import React, { useState } from "react";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
  Avatar
} from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import '../App.css'
import { motion } from "motion/react";
import './AIChatPanel.css';
import { p } from "framer-motion/client";

type Task = {
  id: string;
  title: string;
  description?: string;
};

const AIChatPanel = ({ onClose, onAcceptTask }: { onClose?: () => void; onAcceptTask?: (task: Task) => void }) => {
  const [messages, setMessages] = useState([
    {
      message: "Hello, I am your AI assistant. How can I help you?",
      sender: "ai"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingTask, setPendingTask] = useState<Task | null>(null);

  // 发送消息到后端
  const handleSend = async (text: string) => {
    setMessages(prev => [...prev, { message: text, sender: "user" }]);
    setIsTyping(true);

    const res = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();

    // 检查 AI 回复是否为任务 JSON
    let aiReply = data.reply;
    let taskObj: Task | null = null;
    try {
      const parsed = JSON.parse(aiReply);
      if (parsed && parsed.type === "task" && parsed.title) {
        taskObj = {
          id: parsed.id || Date.now().toString(),
          title: parsed.title,
          description: parsed.description
        };
        setPendingTask(taskObj);
        aiReply = "I've created a new task for you below.";
      }
    } catch {
      // 普通文本回复
    }

    setMessages(prev => [
      ...prev,
      { message: aiReply, sender: "ai" }
    ]);
    setIsTyping(false);
  };

  // 用户接受任务
  const handleAcceptTask = () => {
    if (pendingTask && onAcceptTask) {
      onAcceptTask(pendingTask);
    }
    setPendingTask(null);
    setMessages(prev => [
      ...prev,
      { message: "Task accepted and added to status bar.", sender: "user" }
    ]);
  };

  return (
    <>
      <div className="aiChatPanelContainer">
        <MainContainer>
          <ChatContainer>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: 8 }}>
              <button className="close-button" onClick={onClose}>关闭</button>
            </div>
            <MessageList
              typingIndicator={isTyping ? <TypingIndicator content="Thinking..." /> : null}
            >
              <div className="aiChatPanelContainerHeader">
                <h2 className="aiChatPanelContainerHeaderTitle">Reccoon AI</h2>
              </div>
              {messages.map((msg, idx) => (
                <motion.div key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SenderName sender={msg.sender} />
                  <Message
                    model={{
                      message: msg.message,
                      sentTime: "just now",
                      sender: msg.sender === "user" ? "You" : "AI",
                      direction: msg.sender === "user" ? "outgoing" : "incoming"
                    }}
                  >
                  </Message>
                </motion.div>
              ))}
              {/* 新增：任务卡片和一键添加按钮 */}
              {pendingTask && (
                <Message
                  key="task"
                  model={{
                    message: "",
                    sentTime: "just now",
                    sender: "AI",
                    direction: "incoming"
                  }}
                >
                  <Avatar name="AI" />
                  <div className="task-card">
                    <div className="task-title">{pendingTask.title}</div>
                    {pendingTask.description && (
                      <div className="task-description">
                        {pendingTask.description}
                      </div>
                    )}
                    <button
                      className="accept-button"
                      onClick={handleAcceptTask}
                    >
                      一键添加任务
                    </button>
                  </div>
                </Message>
              )}
            </MessageList>
            <MessageInput placeholder="Ask AI..." onSend={handleSend} />
          </ChatContainer>
        </MainContainer>
      </div>
    </>
  );
};

export default AIChatPanel


function SenderName({ sender }: { sender: string }) {
  return (
    <div className={`sender-name ${sender}`}>
      {sender === "user" ? "You" : "AI"}
    </div>
  );
}