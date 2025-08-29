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
import { p, pre } from "framer-motion/client";
import { useAppContext } from './AppContext';
import { createBulkPayload, optimisticUIUpdate, postPayloadToServer, createBackup, restoreBackup } from '../utils/utils';
import { useNavigate } from 'react-router-dom';
import type { TaskType } from "../utils/type";

interface ChatMessage {
  message: string;
  sender: "user" | "ai";
  suggestedTask?: SuggestedTask;
}

interface SuggestedTask {
  title: string;
  description?: string;
  status?: string;
}

const AIChatPanel = ({ onClose }: { onClose?: () => void }) => {
  const { states, setStates, actions } = useAppContext();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      message: "Hello, I am your AI assistant. How can I help you?",
      sender: "ai"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Handle sending message to backend
  const handleSend = async (text: string) => {
    const userMessage: ChatMessage = { message: text, sender: "user" };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Collect recent conversation history (last 10 messages, excluding the current one)
      const conversationHistory = messages.slice(-10).map(msg => ({
        content: msg.message,
        sender: msg.sender === "ai" ? "assistant" : "user"
      }));

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ 
          message: text,
          conversationHistory
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const aiResponse = await response.json();
      
      // Create AI message
      const aiMessage: ChatMessage = {
        message: aiResponse.reply || "I received your message.",
        sender: "ai"
      };

      // Check if AI generated a task and add it directly to database as pending
      if (aiResponse.task) {
        // Find appropriate status for the task from current project only
        const currentProjectId = states.userProfile.lastProjectId;
        const currentProjectStatuses = Object.values(states.statuses).filter(s => 
          s.project === currentProjectId
        );
        
        const targetStatus = currentProjectStatuses.find(s => 
          s.title.toLowerCase() === (aiResponse.task.status || 'now').toLowerCase()
        ) || currentProjectStatuses[0]; // Fallback to first status of current project
        
        if (targetStatus) {
          // Get the first task in the target status to insert before it
          const tasksInStatus = Object.values(states.tasks).filter(task => 
            task.status === targetStatus.id
          );
          
          // Find the first task (the one with prev: null)
          const firstTask = tasksInStatus.find(task => task.prev === null);

          // Create new task to appear at the TOP of the list
          const newTask = {
            title: aiResponse.task.title,
            description: aiResponse.task.description || '',
            status: targetStatus.id,
            previousStatus: targetStatus.id,
            prev: null,  // No previous task (will be at top)
            next: firstTask ? firstTask.id : null,  // Next task is current first task (or null if list is empty)
            userId: states.userProfile.id || ''
          };

          // Use the exact same flow as AddNewTask
          const bulkPayload = createBulkPayload();
          const backup = createBackup(states, bulkPayload);

          try {
            const taskId = actions.addTask(newTask, backup, false);
            optimisticUIUpdate(setStates, backup);
            await postPayloadToServer('/api/bulk', navigate, backup);
            
            aiMessage.message = `✅ I've added a new task: "${newTask.title}" to your ${targetStatus.title} list.`;
          } catch (error) {
            console.error('Error adding task:', error);
            restoreBackup(setStates, backup);
            aiMessage.message = `❌ Failed to add the task. Please try again.`;
          }
        }
      }

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        message: "Sorry, I encountered an error. Please try again.",
        sender: "ai"
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle confirming a suggested task
  const handleConfirmTask = async (suggestedTask: SuggestedTask, messageIndex: number) => {
    try {
      // Find appropriate status for the task
      const currentProjectStatuses = Object.values(states.statuses);
      const targetStatus = currentProjectStatuses.find(s => 
        s.title.toLowerCase() === suggestedTask.status?.toLowerCase()
      ) || currentProjectStatuses[0]; // Fallback to first status
      
      if (!targetStatus) {
        throw new Error('No available status found');
      }

      // Create task using the existing action system
      const newTask: Omit<TaskType, 'id'> = {
        title: suggestedTask.title,
        description: suggestedTask.description || '',
        status: targetStatus.id,
        previousStatus: targetStatus.id,
        prev: null,
        next: null,
        userId: states.userProfile.id || '',
        dueDate: null
      };

      // Create bulk payload for the new task
      const bulkPayload = createBulkPayload();
      const taskId = actions.addTask(newTask, bulkPayload, true);
      
      // Send to server
      await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bulkPayload)
      });

      // Remove suggested task from the message
      setMessages(prev => prev.map((msg, i) => 
        i === messageIndex 
          ? { ...msg, suggestedTask: undefined }
          : msg
      ));

      // Add confirmation message
      const confirmMessage: ChatMessage = {
        message: `✅ Task "${suggestedTask.title}" has been added to your task list!`,
        sender: "ai"
      };
      setMessages(prev => [...prev, confirmMessage]);

    } catch (error) {
      console.error('Error creating task:', error);
      const errorMessage: ChatMessage = {
        message: "❌ Failed to add task. Please try again.",
        sender: "ai"
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Handle dismissing a suggested task
  const handleDismissTask = (messageIndex: number) => {
    setMessages(prev => prev.map((msg, i) => 
      i === messageIndex 
        ? { ...msg, suggestedTask: undefined }
        : msg
    ));
  };

  return (
    <>
      <div className="aiChatPanelContainer">
        <MainContainer>
          <ChatContainer>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: 8 }}>
              <button className="close-button" onClick={onClose}>Close</button>
            </div>
            <MessageList
              typingIndicator={isTyping ? <TypingIndicator content="Thinking..." /> : null}
            >
              <div className="aiChatPanelContainerHeader">
                <h2 className="aiChatPanelContainerHeaderTitle">Raccoon AI</h2>
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
                  
                  {/* Suggested Task Card */}
                  {msg.suggestedTask && (
                    <div className="pending-task-container">
                      <div className="pending-task-card">
                        <div className="pending-task-badge">Suggested Task</div>
                        <div className="pending-task-content">
                          <h4 className="pending-task-title">{msg.suggestedTask.title}</h4>
                          {msg.suggestedTask.description && (
                            <p className="pending-task-description">
                              {msg.suggestedTask.description}
                            </p>
                          )}
                          <div className="pending-task-status">
                            Status: {msg.suggestedTask.status || 'todo'}
                          </div>
                        </div>
                        <div className="pending-task-actions">
                          <button
                            className="pending-task-confirm-btn"
                            onClick={() => handleConfirmTask(msg.suggestedTask!, idx)}
                          >
                            ✓ Confirm
                          </button>
                          <button
                            className="pending-task-dismiss-btn"
                            onClick={() => handleDismissTask(idx)}
                          >
                            ✗ Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
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