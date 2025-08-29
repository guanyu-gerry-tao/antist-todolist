import '../App.css'
import './AddNewTask.css'

import { createBackup, createBulkPayload, optimisticUIUpdate, postPayloadToServer, restoreBackup } from '../utils/utils'
import { useAppContext } from './AppContext.tsx';
import { useNavigate } from 'react-router-dom';
import type { StatusId } from '../utils/type.ts';

/**
 * AddNewTask component allows users to add a new task by typing in an input field.
 * @actions - The actions object containing methods to manipulate tasks.
 * @status - The status of the task (e.g., To Do, In Progress, Done).
 * @newOrder - The order number for the new task, used to determine its position in the list.
 * @currentProjectID - The ID of the current project to which the new task will be added.
 */
function AddNewTask({ status }: { status: StatusId }) {

  const navigate = useNavigate();

  // Use the AppContext to access the global state and actions
  const { states, setStates, actions } = useAppContext();

  /**
   * This function handles keyboard events in the input field.
   * @param e - The keyboard event triggered when the user presses a key in the input field.
   */
  const handleKeyboard = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    const event = e; // Store the current target for later use
    if (event.key === 'Enter') { // Check if the Enter key is pressed: this will add a new task
      const newTaskTitle = event.currentTarget.value.trim(); // Get the trimmed value of the input field
      event.currentTarget.value = ''; // Clear the input field after adding the task

      if (newTaskTitle) { // Check if the input is not empty
        const newTask = {
          title: newTaskTitle,
          status: status,
          previousStatus: status, // for new task, the previous status is the same as the current status
          prev: null, // 
          next: null, // if prev and next are null, by default, the task will be added to the end of the list
          userId: states.userProfile.id as string,
        };

        // create a bulk payload and backup for the new task
        const bulkPayload = createBulkPayload(); // Create a bulk payload for the new task
        const backup = createBackup(states, bulkPayload); // Create a backup of the current state

        try {
          await actions.addTask(newTask, backup, false); // Call the addTask function from actions with the new task
          optimisticUIUpdate(setStates, backup); // Optimistically update the UI with the new task
          await postPayloadToServer('/api/bulk', navigate, backup); // Send the new task to the server
        }
        catch (error) {
          console.error('Error adding new task:', error);
          restoreBackup(setStates, backup); // Restore the previous state in case of an error
        }
      }
    }
    if (event.key === 'Escape') { // Check if the Escape key is pressed: this will clear the input field
      event.currentTarget.value = ''; // Clear the input field
      event.currentTarget.blur(); // Remove focus from the input field
    }
  };

  return (
    <>
      <input type="text"
        placeholder={"+ add new task"}
        onKeyDown={handleKeyboard}
        className='addNewTaskInput' />
    </>
  )
}

export default AddNewTask