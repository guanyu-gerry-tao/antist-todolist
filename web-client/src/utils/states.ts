import { useImmer, type Updater } from "use-immer";
import { useEffect } from "react";
import type { TaskData, ProjectData, UserProfileData, StatusData, TaskId, ProjectId } from "./type";

export const createStatesAndSetStates = (): [States, SetStates] => {


  // State management using useImmer for tasks, projects, user status, and dragged task

  const emptyUserProfile: UserProfileData = {
    id: null,
    nickname: null,
    lastProjectId: null,
    avatarUrl: null,
    language: null
  };

  const [tasks, setTasks] = useImmer<TaskData>({}); // Initial tasks data loaded from testTaskData
  const [projects, setProjects] = useImmer<ProjectData>({}); // Initial projects data loaded from testProjectData
  const [statuses, setStatuses] = useImmer<StatusData>({}); // Initial statuses data loaded from testStatusData
  const [userProfile, setUserProfile] = useImmer<UserProfileData>(emptyUserProfile); // Initial users data loaded from testUserData
  const [showDeleted, setShowDeleted] = useImmer<boolean>(false);
  const [showCompleted, setShowCompleted] = useImmer<boolean>(false);
  const [justDragged, setJustDragged] = useImmer<boolean>(false); // State to manage the dragging state of tasks
  const [focusedItem, setFocusedItem] = useImmer<TaskId | ProjectId | null>(null); // State to manage the focused task ID

  const states: States = {
    tasks,
    projects,
    statuses,
    userProfile,
    showDeleted,
    showCompleted,
    justDragged,
    focusedItem
  };

  const setStates: SetStates = {
    setTasks,
    setProjects,
    setStatuses,
    setUserProfile,
    setShowDeleted,
    setShowCompleted,
    setJustDragged,
    setFocusedItem
  };

  return [states, setStates];
};

export type States = {
  tasks: TaskData;
  projects: ProjectData;
  statuses: StatusData;
  userProfile: UserProfileData;
  showDeleted: boolean; // State to manage the visibility of deleted tasks
  showCompleted: boolean; // State to manage the visibility of completed tasks, optional for future use
  justDragged: boolean; // State to manage the dragging state of tasks
  focusedItem: TaskId | ProjectId | null; // State to manage the focused task or project ID
};

export type SetStates = {
  setTasks: Updater<TaskData>;
  setProjects: Updater<ProjectData>;
  setStatuses: Updater<StatusData>;
  setUserProfile: Updater<UserProfileData>;
  setShowDeleted: Updater<boolean>; // Action to toggle the visibility of deleted tasks
  setShowCompleted: Updater<boolean>; // Optional action to toggle the visibility of completed tasks, for future use
  setJustDragged: Updater<boolean>; // Action to manage the just dragged state of tasks
  setFocusedItem: Updater<TaskId | ProjectId | null>; // Action to manage the focused task or project ID
};