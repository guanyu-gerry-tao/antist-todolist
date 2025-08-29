import type { TaskId, TaskType, ProjectId, ProjectType, StatusId, StatusType, BulkPayload, UserId } from "./type.ts";
import type { States, SetStates } from "./states.ts";
import { sortChain, createBulkPayload, optimisticUIUpdate, postPayloadToServer, createBackup, restoreBackup } from './utils.ts';
import type { DragDropContextProps, DragStart, DragUpdate, DropResult, ResponderProvided } from '@hello-pangea/dnd';
import { animate } from 'motion';

export const createActions = (states: States, setStates: SetStates): Actions => {

  /**
   * Function to add new tasks to the task list.
   * It generates unique IDs for the new tasks, adds them to the tasks state,
   * Notice: this function only add tasks to one status bar, not multiple status bars.
   * @param newTask - The new task items to be added - without an ID - ID will be generated automatically. next and prev can be both null if added to last. Specific prev or next to insert at desired position.
   * @param bulkPayload - The bulk payload to be used for the add operation.
   */
  const addTask = (newTask: Omit<TaskType, 'id'>, bulkPayload: BulkPayload, addWithAnimation: boolean = false): TaskId => {
    const id = crypto.randomUUID(); // Generate a unique ID for the new task
    const targetStatusExistingTasks = Object.fromEntries(Object.entries(states.tasks).filter(([_, t]) => t.status === newTask.status));
    const sortedTargetStatusTasks = sortChain(targetStatusExistingTasks);
    // Generate a unique ID for the new task:
    const newTaskWithId: TaskType = ({
      ...newTask,
      id: id
    });

    // find the index based on provided newTask.prev or newTask.next
    let index: number = 0;
    if (newTaskWithId.prev && sortedTargetStatusTasks.map(task => task[0]).includes(newTaskWithId.prev)) {
      index = sortedTargetStatusTasks.findIndex(task => task[0] === newTaskWithId.prev) + 1;
    } else if (newTaskWithId.next && sortedTargetStatusTasks.map(task => task[0]).includes(newTaskWithId.next)) {
      index = sortedTargetStatusTasks.findIndex(task => task[0] === newTaskWithId.next);
    } else {
      index = sortedTargetStatusTasks.length; // Default to the end of the tasks
    }

    // set the prev and next correctly:
    if (index === 0) {
      newTaskWithId.prev = null; // No previous task
      newTaskWithId.next = sortedTargetStatusTasks.length > 0 ? sortedTargetStatusTasks[0][0] : null; // First task in the status
    } else if (index === sortedTargetStatusTasks.length) {
      newTaskWithId.prev = sortedTargetStatusTasks[sortedTargetStatusTasks.length - 1][0]; // Last task in the status
      newTaskWithId.next = null; // No next task
    } else {
      newTaskWithId.prev = sortedTargetStatusTasks[index - 1][0]; // Previous task in the status
      newTaskWithId.next = sortedTargetStatusTasks[index][0]; // Next task in the status
    }

    // add to payload:
    bulkPayload.ops.push({
      type: 'task',
      operation: 'add',
      data: newTaskWithId
    });

    // update surrounding tasks' prev and next:
    if (newTaskWithId.prev) {
      bulkPayload.ops.push({
        type: 'task',
        operation: 'update',
        data: {
          id: newTaskWithId.prev,
          updatedFields: { next: newTaskWithId.id }
        }
      });
    };
    if (newTaskWithId.next) {
      bulkPayload.ops.push({
        type: 'task',
        operation: 'update',
        data: {
          id: newTaskWithId.next,
          updatedFields: { prev: newTaskWithId.id }
        }
      });
    };

    // make the project top:
    const statusData = states.statuses[newTaskWithId.status];
    if (statusData && statusData.project) {
      moveProject(statusData.project, 0, bulkPayload); // Move the project to the top of the list
    }

    console.log(`addTask: payload: ${JSON.stringify(bulkPayload)}`);
    if (addWithAnimation) {
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) {
          animate(el, { opacity: [0, 1], }, { duration: 0.3 }); // Animate the new project card to fade in
          animate(el, { height: ["0px", el.scrollHeight] }, { duration: 0.2 }); // Animate the new project card to slide up
        }
      });
    }
    return id;
  };


  /**
   * Function to update existing tasks in the task list.
   * @param updatePayloads - An array of objects containing the ID of the task to be updated and the fields to be updated.
   */
  const updateTask = (updatePayload: { id: TaskId; updatedFields: Partial<TaskType> }, bulkPayload: BulkPayload) => {

    // Add the updated tasks to the bulk payload:
    bulkPayload.ops.push({
      type: 'task',
      operation: 'update',
      data: {
        id: updatePayload.id,
        updatedFields: updatePayload.updatedFields
      }
    })

    // make the project top:
    const statusData = states.statuses[states.tasks[updatePayload.id].status];
    if (statusData && statusData.project) {
      moveProject(statusData.project, 0, bulkPayload); // Move the project to the top of the list
    }
  };


  /**
   * Function to hard delete tasks.
   * This function will permanently remove the tasks.
   * Used for the trash bin feature. Soft delete -> trash bin -> want to perminate delete? -> hard delete.
   * It finds the tasks by their IDs and removes them from the tasks state.
   * Safe to use in multiple statuses.
   * @param ids - The IDs of the tasks to be hard deleted.
   * @param bulkPayload - The bulk payload to be used for the hard delete operation.
   */
  const hardDeleteTask = async (id: TaskId, bulkPayload: BulkPayload) => {
    // Check if the tasks exist before deleting them
    const task = states.tasks[id];
    if (!task) {
      throw new Error(`Task with id ${id} not found. Cannot hard delete.`);
    }

    const deletedTaskPrev = task.prev;
    const deletedTaskNext = task.next;

    // Add the task to the bulk payload for hard delete
    bulkPayload.ops.push({
      type: 'task',
      operation: 'delete',
      data: { id: id }
    });


    if (deletedTaskPrev) {
      bulkPayload.ops.push({
        type: 'task',
        operation: 'update',
        data: {
          id: deletedTaskPrev,
          updatedFields: { next: deletedTaskNext } // Update the next task of the previous task
        }
      });
    }
    if (deletedTaskNext) {
      bulkPayload.ops.push({
        type: 'task',
        operation: 'update',
        data: {
          id: deletedTaskNext,
          updatedFields: { prev: deletedTaskPrev } // Update the previous task of the next task
        }
      });
    }

    // make the project top:
    const statusData = states.statuses[task.status];
    if (statusData && statusData.project) {
      moveProject(statusData.project, 0, bulkPayload); // Move the project to the top of the list
    }

  };

  /**
   * Function to move multiple tasks. 
   * It can move tasks from one status to another, or reorder tasks within the same status.
   * It can move multiple tasks, to the same status or different statuses, or both.
   * 
   * 这个方法可以同时移动不同status下多个task到同一个status。
   * @ids - The IDs of the tasks to be moved.
   * @targetStatusId - The ID of the target status to move the tasks to.
   * @index - The index to insert the tasks at. It can be a number, "start", or "end".
   * @bulkPayload - The bulk payload to be used for the move operation.
   */
  const moveTask = (id: TaskId, targetStatusId: StatusId, index: number | "start" | "end", bulkPayload: BulkPayload, moveWithAnimation: boolean = false) => {

    // check if the status is exist
    if (Object.keys(states.statuses).includes(targetStatusId) === false && !targetStatusId.endsWith("-completed") && !targetStatusId.endsWith("-deleted")) {
      throw new Error(`Status with id ${targetStatusId} does not exist.`);
    }
    // check if the task is exist
    if (!states.tasks[id]) {
      throw new Error(`Task with id ${id} does not exist.`);
    }

    // get the target status chain
    const targetStatusChain = Object.fromEntries(Object.entries(states.tasks).filter(([_, task]) => task.status === targetStatusId));
    const sortedTargetChainWithoutTask = sortChain(targetStatusChain).filter(task => task[0] !== id); // Exclude the task being moved

    // convert index to a number if it's a string. If index is out of bounds, set it to the start or end of the tasks.
    if (index === "start" || index as number < 0) {
      index = 0;
    } else if (index === "end" || index as number >= sortedTargetChainWithoutTask.length) {
      index = sortedTargetChainWithoutTask.length; // Set index to the end of the tasks
    }

    // check if the task is not moving
    if (states.tasks[id].status === targetStatusId && index === Object.keys(sortedTargetChainWithoutTask).indexOf(id)) { // Task is not moving
      console.log(`Task with id ${id} is already at index ${index}. No action taken.`);
      return;
    }

    // find task's new prev and next:
    let newPrev: TaskId | null = null;
    let newNext: TaskId | null = null;

    if (sortedTargetChainWithoutTask.length === 0) {
      newPrev = null;
      newNext = null;
    } else if (index === 0) {
      newPrev = null; // No previous task
      newNext = sortedTargetChainWithoutTask[0][0]; // First task in the status
    } else if (index >= sortedTargetChainWithoutTask.length) {
      newPrev = sortedTargetChainWithoutTask[sortedTargetChainWithoutTask.length - 1][0]; // Last task in the status
      newNext = null; // No next task
    } else {
      newPrev = sortedTargetChainWithoutTask[index - 1][0]; // Previous task in the status
      newNext = sortedTargetChainWithoutTask[index][0]; // Next task in the status
    }

    // update the task's status and prev/next:
    bulkPayload.ops.push({
      type: 'task',
      operation: 'update',
      data: {
        id: id,
        updatedFields: {
          status: targetStatusId, // Update the status to the target status
          previousStatus: states.tasks[id].status, // Keep the previous status for reference
          prev: newPrev, // Will be updated later
          next: newNext // Will be updated later
        }
      }
    });


    // find old surrounding tasks' prev and next:
    const oldPrevTask = states.tasks[id].prev;
    const oldNextTask = states.tasks[id].next;

    // update surrounding tasks' prev and next:
    if (oldPrevTask) {
      bulkPayload.ops.push({
        type: 'task',
        operation: 'update',
        data: {
          id: oldPrevTask,
          updatedFields: { next: oldNextTask } // Update the next task of the old previous task
        }
      });
    }
    if (oldNextTask) {
      bulkPayload.ops.push({
        type: 'task',
        operation: 'update',
        data: {
          id: oldNextTask,
          updatedFields: { prev: oldPrevTask } // Update the previous task of the old next task
        }
      });
    }

    // find new surrounding tasks' prev and next:
    const newPrevTask = sortedTargetChainWithoutTask[index - 1] ? sortedTargetChainWithoutTask[index - 1][0] : null; // Previous task in the target status
    const newNextTask = sortedTargetChainWithoutTask[index] ? sortedTargetChainWithoutTask[index][0] : null; // Next task in the target status

    // update new surrounding tasks' prev and next:
    if (newPrevTask) {
      bulkPayload.ops.push({
        type: 'task',
        operation: 'update',
        data: {
          id: newPrevTask,
          updatedFields: { next: id } // Update the next task of the new previous task
        }
      });
    }
    if (newNextTask) {
      bulkPayload.ops.push({
        type: 'task',
        operation: 'update',
        data: {
          id: newNextTask,
          updatedFields: { prev: id } // Update the previous task of the new next task
        }
      });
    }
    if (moveWithAnimation) {
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        console.log('animating task move');
        if (el) {
          setStates.setJustDragged(true); // Set the just dragged state to the task being moved
          setTimeout(() => {
            setStates.setJustDragged(false); // Remove the task from the just dragged state after a delay
          }, 300); // Match the duration of the animation
          // animate(el, { x: ["0px", "-20px"], }, { duration: 0.3 }); // Animate the new project card to fade in
          console.log('animating task move');
        }
      });
    }

    // make the project top:
    const statusData = states.statuses[states.tasks[id].status];
    if (statusData && statusData.project) {
      moveProject(statusData.project, 0, bulkPayload); // Move the project to the top of the list
    }

    // requestAnimationFrame(() => {
    //   document.getElementById(id)?.classList.remove('hide'); // Ensure the task is visible after moving
    // });
  };


  const focusProject = (projectId: ProjectId | null, bulkPayload: BulkPayload) => {
    bulkPayload.ops.push({
      type: 'userProfile',
      operation: 'update',
      data: {
        id: states.userProfile.id as UserId,
        updatedFields: {
          lastProjectId: projectId // Update the last project ID in the user profile
        }
      }
    });
  }

  /**
   * Function to add a new status to the status list.
   * It generates a unique ID for the new status, adds it to the statuses state,
   * and maintains the linked list order.
   * @param newStatus - The new status item to be added - without an ID - ID will be generated automatically.
   * @param bulkPayload - The bulk payload to be used for the add operation.
   * @param addWithAnimation - Whether to add animation when adding the status.
   * @returns The ID of the newly added status.
   */
  const addStatus = (newStatus: Omit<StatusType, 'id'>, bulkPayload: BulkPayload, addWithAnimation: boolean = false): StatusId => {
    const id = crypto.randomUUID(); // Generate a unique ID for the new status
    const projectStatuses = Object.fromEntries(Object.entries(states.statuses).filter(([_, s]) => s.project === newStatus.project));
    const sortedProjectStatuses = sortChain(projectStatuses);
    
    // Generate a unique ID for the new status:
    const newStatusWithId: StatusType = ({
      ...newStatus,
      id: id
    });

    // If prev and next are explicitly provided, use them directly
    // Otherwise, calculate the position based on the current status chain
    if (newStatus.prev !== undefined && newStatus.next !== undefined) {
      // User explicitly provided prev and next, use them as-is
      // No need to recalculate
    } else {
      // Calculate position when prev/next are not fully specified
      let index: number = 0;
      if (newStatusWithId.prev && sortedProjectStatuses.map(status => status[0]).includes(newStatusWithId.prev)) {
        index = sortedProjectStatuses.findIndex(status => status[0] === newStatusWithId.prev) + 1;
      } else if (newStatusWithId.next && sortedProjectStatuses.map(status => status[0]).includes(newStatusWithId.next)) {
        index = sortedProjectStatuses.findIndex(status => status[0] === newStatusWithId.next);
      } else {
        index = sortedProjectStatuses.length; // Default to the end of the statuses
      }

      // set the prev and next correctly:
      if (index === 0) {
        newStatusWithId.prev = null; // No previous status
        newStatusWithId.next = sortedProjectStatuses.length > 0 ? sortedProjectStatuses[0][0] : null; // First status in the project
      } else if (index === sortedProjectStatuses.length) {
        newStatusWithId.prev = sortedProjectStatuses[sortedProjectStatuses.length - 1][0]; // Last status in the project
        newStatusWithId.next = null; // No next status
      } else {
        newStatusWithId.prev = sortedProjectStatuses[index - 1][0]; // Previous status in the project
        newStatusWithId.next = sortedProjectStatuses[index][0]; // Next status in the project
      }
    }

    // add to payload:
    bulkPayload.ops.push({
      type: 'status',
      operation: 'add',
      data: newStatusWithId
    });

    // update surrounding statuses' prev and next:
    if (newStatusWithId.prev) {
      bulkPayload.ops.push({
        type: 'status',
        operation: 'update',
        data: {
          id: newStatusWithId.prev,
          updatedFields: { next: newStatusWithId.id }
        }
      });
    };
    if (newStatusWithId.next) {
      bulkPayload.ops.push({
        type: 'status',
        operation: 'update',
        data: {
          id: newStatusWithId.next,
          updatedFields: { prev: newStatusWithId.id }
        }
      });
    };

    console.log(`addStatus: payload: ${JSON.stringify(bulkPayload)}`);
    if (addWithAnimation) {
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) {
          animate(el, { opacity: [0, 1], }, { duration: 0.3 }); // Animate the new status to fade in
          animate(el, { width: ["0px", el.scrollWidth] }, { duration: 0.2 }); // Animate the new status to slide in
        }
      });
    }
    return id;
  };

  /**
   * Function to delete a status from the status list.
   * This function will permanently remove the status and all tasks in it.
   * It finds the status by its ID and removes it from the statuses state.
   * @param statusId - The ID of the status to be deleted.
   * @param bulkPayload - The bulk payload to be used for the delete operation.
   */
  const deleteStatus = (statusId: StatusId, bulkPayload: BulkPayload) => {
    // Check if the status exists before deleting it
    if (!states.statuses[statusId]) {
      throw new Error(`Status with id ${statusId} not found. Cannot delete.`);
    }

    const deletedStatus = states.statuses[statusId];
    const deletedStatusPrev = deletedStatus.prev;
    const deletedStatusNext = deletedStatus.next;

    console.log(`deleteStatus: Deleting status with id ${statusId}, prev: ${deletedStatusPrev}, next: ${deletedStatusNext}`);

    // Add the deleted status to the bulk payload
    bulkPayload.ops.push({
      type: 'status',
      operation: 'delete',
      data: { id: statusId }
    });

    // update the prev and next of the surrounding statuses:
    if (deletedStatusPrev) {
      bulkPayload.ops.push({
        type: 'status',
        operation: 'update',
        data: {
          id: deletedStatusPrev,
          updatedFields: { next: deletedStatusNext } // Update the next status of the previous status
        }
      });
    }
    if (deletedStatusNext) {
      bulkPayload.ops.push({
        type: 'status',
        operation: 'update',
        data: {
          id: deletedStatusNext,
          updatedFields: { prev: deletedStatusPrev } // Update the previous status of the next status
        }
      });
    }

    // Also delete all tasks in the status
    const tasksInStatus = Object.entries(states.tasks).filter(([_, task]) => {
      return task.status === statusId && task.userId === states.userProfile.id;
    });
    for (const [taskId, _] of tasksInStatus) {
      bulkPayload.ops.push({
        type: 'task',
        operation: 'delete',
        data: { id: taskId } // Add the task ID to the bulk payload for deletion
      });
    }
  };

  /**
   * Function to add a new project to the project list.
   * It generates a unique ID for the new project, adds it to the projects state,
   * and reindexs the projects based on their order.
   * @param newProject - The new project item to be added. next and prev can be null if added to last. Specific prev or next to insert at desired position.
   * @returns The ID of the newly added project.
   */
  const addProject = (newProject: Omit<ProjectType, 'id'>, bulkPayload: BulkPayload, addWithAnimation: boolean = false): ProjectId => {

    // Generate a unique ID for the new project:
    const id = crypto.randomUUID();
    const newProjectWithId: ProjectType = {
      id,
      ...newProject
    };

    // Sort the existing projects
    const sortedProjects = sortChain(states.projects);

    let index: number = 0;
    if (newProjectWithId.prev && sortedProjects.map(task => task[0]).includes(newProjectWithId.prev)) {
      index = sortedProjects.findIndex(task => task[0] === newProjectWithId.prev) + 1;
    } else if (newProjectWithId.next && sortedProjects.map(task => task[0]).includes(newProjectWithId.next)) {
      index = sortedProjects.findIndex(task => task[0] === newProjectWithId.next);
    } else {
      index = sortedProjects.length; // Default to the end of the tasks
    }

    // set the prev and next correctly:
    newProjectWithId.prev = sortedProjects[index - 1]?.[0] || null;
    newProjectWithId.next = sortedProjects[index]?.[0] || null;


    // Add the new project to the bulk payload:
    bulkPayload.ops.push({
      type: 'project',
      operation: 'add',
      data: newProjectWithId
    });

    // Update surrounding projects' prev and next:
    if (newProjectWithId.prev) {
      bulkPayload.ops.push({
        type: 'project',
        operation: 'update',
        data: {
          id: newProjectWithId.prev,
          updatedFields: { next: newProjectWithId.id }
        }
      });
    }
    if (newProjectWithId.next) {
      bulkPayload.ops.push({
        type: 'project',
        operation: 'update',
        data: {
          id: newProjectWithId.next,
          updatedFields: { prev: newProjectWithId.id }
        }
      });
    }

    focusProject(newProjectWithId.id, bulkPayload); // Focus on the new project

    // Automatically create default statuses for the new project: "now", "next", "later"
    const defaultStatuses = [
      { title: "Now", description: "Currently working on", color: "#e8fdec" },
      { title: "Next", description: "Up next", color: "#f0f1fd" },
      { title: "Later", description: "Future tasks", color: "#fff8e8" }
    ];

    // Create statuses with proper linking
    const statusIds: StatusId[] = [];
    for (let i = 0; i < defaultStatuses.length; i++) {
      const statusData = defaultStatuses[i];
      const statusId = crypto.randomUUID(); // Pre-generate the ID
      statusIds.push(statusId);
      
      const prevStatusId = i > 0 ? statusIds[i - 1] : null;
      
      bulkPayload.ops.push({
        type: 'status',
        operation: 'add',
        data: {
          id: statusId,
          title: statusData.title,
          description: statusData.description,
          color: statusData.color,
          project: newProjectWithId.id,
          prev: prevStatusId,
          next: null, // Will be set correctly in the next loop
          userId: states.userProfile.id as UserId
        }
      });
    }

    // Now update the next pointers
    for (let i = 0; i < statusIds.length - 1; i++) {
      bulkPayload.ops.push({
        type: 'status',
        operation: 'update',
        data: {
          id: statusIds[i],
          updatedFields: { next: statusIds[i + 1] }
        }
      });
    }

    if (addWithAnimation) {
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) {
          animate(el, { opacity: [0, 1], }, { duration: 0.3 }); // Animate the new project card to fade in
          animate(el, { height: ["0px", "1rem"] }, { duration: 0.2 }); // Animate the new project card to slide up
        }
      });
    }

    return id; // Return the ID of the newly added project
  };

  const moveProject = (id: ProjectId, index: number, bulkPayload: BulkPayload) => {
    const sortedProjects = sortChain(states.projects);
    const currentProjectIndex = sortedProjects.findIndex(([projectId, _]) => projectId === id);
    const sortedProjectsWithoutMovedProject = sortedProjects.filter(project => project[0] !== id); // Exclude the project being moved

    // rebuild the linked list array for the projects, inserting the project at the specified index.
    if (currentProjectIndex === -1) {
      throw new Error(`Project with id ${id} not found.`);
    }
    if (index < 0 || index > sortedProjectsWithoutMovedProject.length) {
      throw new Error(`Index ${index} is out of bounds for the project list.`);
    }



    // Note: we need to at most update 5 projects:
    // 1. The project being moved
    // 2. The project before the destination position (if exists)
    // 3. The project after the destination position (if exists)
    // 4. The project before the origin position (if exists)
    // 5. The project after the origin position (if exists)
    //
    // the project being moved, has prev and next. Whatever the destination is,
    // that is because if it is moved to the end or start, the prev and next will be updated to null.
    // however, the rest four projects may not exist, so we need to check if they exist before updating them.

    // get prev and next projectIds of the origin position:
    const originProjectPrev = states.projects[id].prev;
    const originProjectNext = states.projects[id].next;

    // get prev and next projectIds of the destination position:
    const newProjectPrev = index === 0 ? null : sortedProjectsWithoutMovedProject[index - 1][0]; // If moving to the start, prev is null
    const newProjectNext = index === sortedProjectsWithoutMovedProject.length ? null : sortedProjectsWithoutMovedProject[index][0]; // If moving to the end, next is null

    if (originProjectNext === newProjectNext && originProjectPrev === newProjectPrev) {
      console.log(`move Project: Project with id ${id} is already at index ${index}. No action taken.`);
      return; // No need to move if the project is already at the desired index
    }
    // update the moved project's prev and next, even if there is a project in front of the destination -- the prev is just null:
    bulkPayload.ops.push({
      type: 'project',
      operation: 'update',
      data: {
        id,
        updatedFields: {
          prev: newProjectPrev,
          next: newProjectNext
        }
      }
    });

    // if there is a project before the origin position:
    if (originProjectPrev) { // if before move, the project has a previous project
      bulkPayload.ops.push({
        type: 'project',
        operation: 'update',
        data: {
          id: originProjectPrev,
          updatedFields: { next: originProjectNext }
        }
      });
    };

    // if there is a project after the origin position:
    if (originProjectNext) { // if before move, the project has a next project
      bulkPayload.ops.push({
        type: 'project',
        operation: 'update',
        data: {
          id: originProjectNext,
          updatedFields: { prev: originProjectPrev }
        }
      });
    };

    // when there is a project before the destination position:
    if (newProjectPrev) {
      bulkPayload.ops.push({
        type: 'project',
        operation: 'update',
        data: {
          id: newProjectPrev,
          updatedFields: { next: id }
        }
      });
    };

    // when there is a project after the destination position:
    if (newProjectNext) {
      bulkPayload.ops.push({
        type: 'project',
        operation: 'update',
        data: {
          id: newProjectNext,
          updatedFields: { prev: id }
        }
      });
    };
  };

  /**
   * Updates a project in the state and adds the update to the bulk payload.
   * @param id - The ID of the project to be updated.
   * @param updatedFields - The fields to be updated in the project.
   * @param bulkPayload - The bulk payload to be used for the update operation.
   */
  const updateProject = (id: ProjectId, updatedFields: Partial<ProjectType>, bulkPayload: BulkPayload) => {
    // Check if the project exists before updating it
    if (!states.projects[id]) {
      throw new Error(`Project with id ${id} not found. Cannot update.`);
    }

    // Add the updated project to the bulk payload:
    bulkPayload.ops.push({
      type: 'project',
      operation: 'update',
      data: {
        id,
        updatedFields
      }
    });
  };

  /**
   * Function to delete a project from the project list.
   * This function will permanently remove the project list, and permanently delete all tasks in the project.
   * It finds the project by its ID and removes it from the projects state.
   * @param projectId - The ID of the project to be deleted.
   */
  const deleteProject = (projectId: ProjectId, bulkPayload: BulkPayload) => {
    // Check if the project exists before deleting it
    if (!states.projects[projectId]) {
      throw new Error(`Project with id ${projectId} not found. Cannot delete.`);
    }

    const deletedProject = states.projects[projectId];
    const deletedProjectPrev = deletedProject.prev;
    const deletedProjectNext = deletedProject.next;

    console.log(`deleteProject: Deleting project with id ${projectId}, prev: ${deletedProjectPrev}, next: ${deletedProjectNext}`);

    // Add the deleted project to the bulk payload
    bulkPayload.ops.push({
      type: 'project',
      operation: 'delete',
      data: { id: projectId }
    });

    // update the prev and next of the surrounding projects:
    if (deletedProjectPrev) {
      bulkPayload.ops.push({
        type: 'project',
        operation: 'update',
        data: {
          id: deletedProjectPrev,
          updatedFields: { next: deletedProjectNext } // Update the next project of the previous project
        }
      });
    }
    if (deletedProjectNext) {
      bulkPayload.ops.push({
        type: 'project',
        operation: 'update',
        data: {
          id: deletedProjectNext,
          updatedFields: { prev: deletedProjectPrev } // Update the previous project of the next project
        }
      });
    }

    // Also delete all tasks in the project
    const tasksInProject = Object.entries(states.tasks).filter(([_, task]) => {
      const taskStatus = states.statuses[task.status];
      return taskStatus && taskStatus.project === projectId && task.userId === states.userProfile.id;
    });
    for (const [taskId, _] of tasksInProject) {
      bulkPayload.ops.push({
        type: 'task',
        operation: 'delete',
        data: { id: taskId } // Add the task ID to the bulk payload for deletion
      });
    }

    // Also delete all statuses in the project
    const statusesInProject = Object.entries(states.statuses).filter(([_, status]) => {
      return status.project === projectId && status.userId === states.userProfile.id;
    });
    for (const [statusId, _] of statusesInProject) {
      bulkPayload.ops.push({
        type: 'status',
        operation: 'delete',
        data: { id: statusId } // Add the status ID to the bulk payload for deletion
      });
    }

    if (states.userProfile.lastProjectId === projectId) {
      focusProject(deletedProjectPrev as ProjectId, bulkPayload); // Focus on the previous project if it exists
    }
  };



  // /**
  //  * Removes an item from a list and updates the list accordingly.
  //  * This function can not only handle deleting the item from the list,
  //  * but also can handle complete, as long as the item is removed from the list.
  //  * @param fromList - The list from which the item will be removed.
  //  * @param item - The item to be removed.
  //  * @param updateMethodItem - The method to update the item.
  //  * @param updateMethodOriginList - The method to update the original item's item.
  //  */
  // const transferItemFromList = (fromList: any[], item: any,
  //   updateMethodItem: (updatePayloads: { id: TaskId; updatedFields: Partial<TaskType> }[]) => Promise<void>,
  //   updateMethodOriginList: any) => {
  //   const index = fromList.indexOf(item);

  //   updateMethodItem(item[0]);
  //   fromList.splice(index, 1); // Remove the project from the projects array
  //   console.log(`called transferItemFromList, deleted item: ${item[1].title}, index: ${index}, list length: ${fromList.length}`);

  //   // 1. [A, B, C] -> [A, C] when deleting B,, C.prev = A, A.next = C,, 
  //   // 2. [A, B, C] -> [A, B] when deleting C,, B.next = null,, index === 2 === projects.length - 1
  //   // 3. [A, B, C] -> [B, C] when deleting A,, B.prev = null,, index === 0
  //   // 4. [A, B] -> [B] when deleting A,, B.prev = null
  //   // 5. [A, B] -> [A] when deleting B,, A.next = null
  //   // 6. [A] -> [] when deleting A, do nothing, as there is no next or previous project

  //   // if the first project is deleted, and there is project left,
  //   // index===0 is the next one of the deleted project,
  //   // set the index===0 project.prev to null
  //   // scenario 3, 4
  //   if (index === 0 && fromList.length > 0) {
  //     updateMethodOriginList(fromList[0][0], { prev: null });
  //     console.log(`Deleted the first project: ${item[1].title}, set its next project to null.`);
  //   }

  //   // if the last project is deleted, and there is still project left,
  //   // set the index===last project.next to null
  //   // index===length- is the previous one of the deleted project,
  //   // scenario 2, 5
  //   if (index === fromList.length && fromList.length > 0) {
  //     updateMethodOriginList(fromList[index - 1][0], { next: null });
  //     console.log(`Deleted the last project: ${item[1].title}, set its previous project to null.`);
  //   }

  //   // if the project is in the middle of the list,
  //   // set the previous project's next to the next project,
  //   // and the next project's prev to the previous project.
  //   // scenario 1
  //   if (index > 0 && index < fromList.length) {
  //     updateMethodOriginList(fromList[index - 1][0], { next: fromList[index][0] });
  //     updateMethodOriginList(fromList[index][0], { prev: fromList[index - 1][0] });
  //     console.log(`Deleted the project: ${item[1].title}, set its previous project's next to the next project and the next project's prev to the previous project.`);
  //   }

  //   // if the project was the only project in the list,
  //   // do nothing, as there is no next or previous project.
  //   // scenario 6
  // };




  /**
   * Function to handle the end of a drag and drop event for the DragDropContext - hello-pangea/dnd.
   * It updates the task or project chain based on the drag result.
   */
  const onDragEnd: DragDropContextProps['onDragEnd'] = async (result: DropResult, navigate: any) => {
    // handle "task" type drag and drop
    if (result.type === 'task') {
      console.log('onDragEnd', result); // Log the drag result for debugging
      if (result.destination) { // If true, the task was dropped in a valid droppable area. If false, it means the task was dropped outside of a droppable area.
        const taskId = result.draggableId; // Get the ID of the dragged task
        const task = states.tasks[taskId]; // Find the task being dragged by its ID

        if (task) {
          const resultStatus = result.destination!.droppableId; // the status === droppableId, as defined in the TodoColumn component
          const payload = createBulkPayload(); // Create a bulk payload for the update operation
          const backup = createBackup(states, payload); // Create a backup of the current state for optimistic UI updates

          try {
            moveTask(taskId, resultStatus, result.destination!.index, backup, false);
            optimisticUIUpdate(setStates, backup); // Optimistically update the UI with the new task order
            postPayloadToServer('/api/bulk', navigate, backup); // Send the update to the server
          } catch (error) {
            console.error('Error updating task:', error);
            restoreBackup(setStates, backup);
          }



          //   const originTasks = Object.fromEntries(Object.entries(states.tasks)
          //     .filter(([id, t]) => t.status === originStatus &&
          //       t.projectId === task.projectId)); // Get all tasks in the result status
          //   const sortedOriginTasks = sortChain(originTasks);

          //   const resultTasks = Object.fromEntries(Object.entries(states.tasks)
          //     .filter(([id, t]) => t.status === resultStatus &&
          //       t.projectId === task.projectId)); // Get all tasks in the result status
          //   const sortedResultTasks = sortChain(resultTasks).filter(([id, t]) => id !== taskId); // Get all tasks in the result status except the dragged task

          //   const originPrevTask = task.prev;
          //   const originNextTask = task.next;
          //   const originIndex = sortedOriginTasks.findIndex(t => t[0] === result.draggableId); // Find the index of the task in the current status
          //   const resultIndex = result.destination!.index; // The index of the task in the destination status

          //   const resultPrevTask = sortedResultTasks[result.destination!.index - 1]?.[0] ?? null; // Get the previous task in the result status
          //   const resultNextTask = sortedResultTasks[result.destination!.index]?.[0] ?? null; // Get the next task in the result status


          //   console.log(`originStatus: ${originStatus}, resultStatus: ${resultStatus}`);
          //   console.log(`originIndex: ${originIndex}, resultIndex: ${resultIndex}`);

          //   if (resultStatus === originStatus && originIndex === resultIndex) {
          //     console.log('Task was moved within the same status and order, no changes made.');
          //     return;
          //   } else {
          //     const payloads = [{
          //       id: taskId, updatedFields: {
          //         prev: resultPrevTask,
          //         next: resultNextTask,
          //         status: resultStatus,
          //         previousStatus: originStatus
          //       }
          //     }] as { id: TaskId; updatedFields: Partial<TaskType> }[]; // Prepare payloads for batch update

          //     if (resultPrevTask) {
          //       payloads.push({ id: resultPrevTask, updatedFields: { next: taskId } }); // Update the previous task's next task to the dragged task
          //     }

          //     if (resultNextTask) {
          //       payloads.push({ id: resultNextTask, updatedFields: { prev: taskId } }); // Update the next task's previous task to the dragged task
          //     }

          //     if (originPrevTask) {
          //       payloads.push({ id: originPrevTask, updatedFields: { next: originNextTask } }); // Update the previous task's next task to the original task's next task
          //     }
          //     if (originNextTask) {
          //       payloads.push({ id: originNextTask, updatedFields: { prev: originPrevTask } }); // Update the next task's previous task to the original task's previous task
          //     }
          //     updateTasks(payloads);
          //   }
          // }


          // setTasks(draft => {
          //   const task = draft[result.draggableId]; // Find the task being dragged by its ID
          //   if (task) { // If the task was found and task was moved
          //     const originStatus = task.status;
          //     const resultStatus = result.destination!.droppableId; // the status === droppableId, as defined in the TodoColumn component

          //     // handle original and result task's previous and next tasks:

          //     // handle original task's previous and next tasks
          //     const originPrevTask = task.prev;
          //     const originNextTask = task.next;
          //     if (originPrevTask) { // If the original task is not the first task, update its previous task to the original's next task (skip the original task)
          //       draft[originPrevTask].next = originNextTask;
          //     }
          //     if (originNextTask) { // If the original task is not the last task, update its next task to the original's previous task (skip the original task)
          //       draft[originNextTask].prev = originPrevTask;
          //     }

          //     // handle result task's previous and next tasks and the dragged task
          //     const resultTasks = Object.fromEntries(Object.entries(draft)
          //       .filter(([id, t]) => t.status === resultStatus &&
          //         t.projectId === task.projectId &&
          //         id !== result.draggableId)); // Get all tasks in the result status
          //     const sortedTasks = sortChain(resultTasks);

          //     const resultPrevTask = sortedTasks[result.destination!.index - 1]?.[0] ?? null; // Get the previous task in the result status
          //     const resultNextTask = sortedTasks[result.destination!.index]?.[0] ?? null; // Get the next task in the result status

          //     if (resultPrevTask) { // If the result task is not the first task, handle A task and result task, [A(null), B(A)] -> [A(null), Result(A), B(Result)], B is handled in the next step
          //       draft[resultPrevTask].next = result.draggableId; // Update the previous task's next task to the dragged task
          //     }
          //     if (resultNextTask) { // If the result task is not the last task, handle B task and result task, [A(B), B(null)] -> [A(Result), Result(null), B(Result)], A is handled in the previous step
          //       draft[resultNextTask].prev = result.draggableId; // Update the next task's previous task to the dragged task
          //     }


          //     task.prev = resultPrevTask;
          //     task.next = resultNextTask;


          //     if (originStatus !== resultStatus) { // If the task's status has changed (i.e., it was moved to a different column)
          //       task.previousStatus = originStatus; // Save the previous status of the task before updating it
          //       task.status = resultStatus; // Update the task's status to the result status
          //     } // else do nothing
          //   }
          // });
        } else {
          // If the task was dropped outside of a droppable area
          // This is a placeholder for handling tasks dropped outside of valid areas
          // Do nothing for now
        }
        setTimeout(() => {
          setStates.setJustDragged(false); // Reset the just dragged task after the drag ends
        }, 300);
        console.log('onDragEnd completed');
      }
    }


    // handle "project" type drag and drop
    if (result.type === 'project') {
      console.log('onDragEnd for project', result); // Log the drag result for debugging
      if (result.destination) { // Check if the destination is valid. If true, the project was dropped in a valid droppable area. If false, it means the project was dropped outside of a droppable area.
        const projectId = result.draggableId; // Get the ID of the dragged project
        const project = states.projects[projectId]; // Find the project being dragged by its ID
        if (project) { // If the project was found and project was moved

          const payload = createBulkPayload(); // Create a bulk payload for the update operation
          const backup = createBackup(states, payload); // Create a backup of the current state for optimistic UI updates

          try {
            moveProject(projectId, result.destination!.index, backup);
            optimisticUIUpdate(setStates, backup); // Optimistically update the UI with the new project order
            postPayloadToServer('/api/bulk', navigate, backup); // Send the update to the server
          } catch (error) {
            console.error('Error updating project:', error);
            restoreBackup(setStates, backup); // Restore the previous state in case of an error
          }





          // if (originPrevProject) { // If the original task is not the first task, update its previous task to the original's next task (skip the original task)
          //   draft[originPrevProject].next = originNextProject;
          // }
          // if (originNextProject) { // If the original task is not the last task, update its next task to the original's previous task (skip the original task)
          //   draft[originNextProject].prev = originPrevProject;
          // }

          // // handle result task's previous and next tasks and the dragged task
          // const resultProjects = Object.fromEntries(Object.entries(draft)
          //   .filter(([id, t]) => id !== result.draggableId)); // Get all tasks in the result status
          // const sortedProjects = sortChain(resultProjects);

          // const resultPrevProject = sortedProjects[result.destination!.index - 1]?.[0] ?? null; // Get the previous project in the result status
          // const resultNextProject = sortedProjects[result.destination!.index]?.[0] ?? null; // Get the next project in the result status

          // if (resultPrevProject) { // If the result project is not the first project, handle A project and result project, [A(null), B(A)] -> [A(null), Result(A), B(Result)], B is handled in the next step
          //   draft[resultPrevProject].next = result.draggableId; // Update the previous project's next project to the dragged project
          // }
          // if (resultNextProject) { // If the result project is not the last project, handle B project and result project, [A(B), B(null)] -> [A(Result), Result(null), B(Result)], A is handled in the previous step
          //   draft[resultNextProject].prev = result.draggableId; // Update the next project's previous project to the dragged project
          // }

          // project.prev = resultPrevProject;
          // project.next = resultNextProject;
        }
      }
    }
  };


  /**
   * Function to handle the start of a drag and drop event for the DragDropContext - hello-pangea/dnd.
   * It sets the dragged task ID if the draggable type is 'task'.
   * Currently, it does not handle project dragging. Not implemented yet.
   */
  const onDragStart: DragDropContextProps['onDragStart'] = (_start) => {
    setStates.setJustDragged(true);
  }
  const onDragUpdate: DragDropContextProps['onDragUpdate'] = (_update) => {
    setStates.setJustDragged(true); // Set the just dragged task ID and all tasks in the status to the state
  }

  return {
    addTask,
    updateTask,
    hardDeleteTask,
    moveTask,
    focusProject,
    addStatus,
    deleteStatus,
    addProject,
    updateProject,
    moveProject,
    deleteProject,
    onDragEnd,
    onDragStart,
    onDragUpdate,
  };
};


export type Actions = {
  addTask: (newTask: Omit<TaskType, 'id'>, bulkPayload: BulkPayload, addWithAnimation?: boolean) => TaskId; // Returns the ID of the newly added task
  updateTask: (updatePayloads: { id: TaskId; updatedFields: Partial<TaskType> }, bulkPayload: BulkPayload) => void; // Accepts an array of update payloads, each containing the task ID and the fields to be updated
  hardDeleteTask: (id: TaskId, bulkPayload: BulkPayload) => void;
  moveTask: (id: TaskId, targetStatusId: StatusId, index: number | "start" | "end", bulkPayload: BulkPayload, moveWithAnimation?: boolean) => void;
  focusProject: (projectId: ProjectId | null, bulkPayload: BulkPayload) => void; // Focuses on a specific project, updating the user profile with the last interacted project ID
  addStatus: (newStatus: Omit<StatusType, 'id'>, bulkPayload: BulkPayload, addWithAnimation?: boolean) => StatusId; // Returns the ID of the newly added status
  deleteStatus: (statusId: StatusId, bulkPayload: BulkPayload) => void; // Deletes a status and all tasks in it
  addProject: (newProject: Omit<ProjectType, 'id'>, bulkPayload: BulkPayload, addWithAnimation?: boolean) => ProjectId; // Returns the ID of the newly added project
  updateProject: (id: ProjectId, updatedFields: Partial<ProjectType>, bulkPayload: BulkPayload) => void;
  moveProject: (id: ProjectId, index: number, bulkPayload: BulkPayload) => void;
  deleteProject: (projectId: ProjectId, bulkPayload: BulkPayload) => void;
  onDragEnd: (result: DropResult, provided: ResponderProvided) => void;
  onDragStart: (start: DragStart, provided: ResponderProvided) => void;
  onDragUpdate: (update: DragUpdate, provided: ResponderProvided) => void;
};