// web-client/src/components/type.ts

import type { DragStart, DragUpdate, DropResult, ResponderProvided } from "@hello-pangea/dnd";
import type { Updater } from "use-immer";

// using semanic types for better clarity and maintainability






/**
 * Task represents a single task in the todo list.
 */
export type TaskType = {
  id: TaskId; // Unique identifier for the task
  title: string;
  dueDate?: Date | null;
  description?: string;
  status: string;
  previousStatus: string;
  prev: TaskId | null;
  next: TaskId | null;
  userId: UserId;
};
export type TaskId = string;
export type TaskData = Record<TaskId, TaskType>;


/**
 * TodoColumnProps defines the properties for the TodoColumn component.
 */
// type TodoColumnProps = {
//   title: React.ReactNode;
//   bgColor: string;
//   status: number;
//   actions: Actions;
//   tasks: Record<TaskId, TaskItem>;
//   draggingType?: string | null;
//   draggingTaskId?: TaskId | null;
//   currentProjectID: ProjectId | null;
// };


// type Projects = {
//   [id: ProjectId]: ProjectItem;
// };

/**
 * ProjectId represents a unique identifier for a project in the todo list application.
 */
export type ProjectType = {
  id: ProjectId; // Unique identifier for the project
  title: string;
  description?: string;
  prev: ProjectId | null;
  next: ProjectId | null;
  userId: UserId;
};
export type ProjectId = string;
export type ProjectData = Record<ProjectId, ProjectType>;

/**
 * UserId represents a unique identifier for a user in the todo list application.
 */
export type UserProfileData = {
  id: UserId | null; // Unique identifier for the user
  nickname: string | null; // The nickname of the user, can be null if not set
  lastProjectId: ProjectId | null; // The last project ID the user interacted with
  avatarUrl: string | null; // The avatar URL of the user, can be null if not set;
  language: string | null; // The language preference of the user, can be null if not set
};

// UserId is a semantic identifier that uniquely identifies a user in the application.
export type UserId = string;

/**
 * Status represents a single status in the todo list.
 */
export type StatusType = {
  id: StatusId; // Unique identifier for the status
  title: string;
  description: string;
  color: string;
  project: ProjectId; // The project to which this status belongs
  prev: StatusId | null;
  next: StatusId | null;
  userId: UserId;
}
export type StatusId = string;
export type StatusData = Record<StatusId, StatusType>;

export type BulkPayload = {
  ops: {
    type: 'task' | 'project' | 'status' | 'userProfile',
    operation: 'add' | 'update' | 'delete',
    data:

    TaskType | ProjectType | StatusType | UserProfileData | // New items to be added

    { id: TaskId; updatedFields: Partial<Omit<TaskType, 'userId'>> } | // Update payloads for tasks, projects, and statuses
    { id: ProjectId; updatedFields: Partial<Omit<ProjectType, 'userId'>> } |
    { id: StatusId; updatedFields: Partial<Omit<StatusType, 'userId'>> } |
    { id: UserId; updatedFields: Partial<Omit<UserProfileData, 'id'>> } | // Update payload for user profile

    {id: TaskId} | {id: ProjectId} | {id: StatusId}; // Ids for deletion

  }[];
  backup: {
    statuses: StatusData;
    tasks: TaskData;
    projects: ProjectData;
    userProfile: UserProfileData
  }; // Backup of the current state before changes, and use for undo functionality
}