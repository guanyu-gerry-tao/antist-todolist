import '../App.css'
import './AddNewProject.css'

import type { ProjectType } from '../utils/type.ts'
import { createBackup, createBulkPayload, optimisticUIUpdate, postPayloadToServer, restoreBackup } from '../utils/utils'
import { useAppContext } from './AppContext.tsx';
import { useNavigate } from 'react-router-dom';

/**
 * AddNewProject component allows users to add a new project by typing in an input field.
 * @actions - The actions object containing methods to manipulate projects.
 * @projects - The list of existing projects, used to determine the order of the new project.
 */
function AddNewProject({ projects }: { projects: [string, ProjectType][] }) {

  const navigate = useNavigate();

  // Use the AppContext to access the global state and actions
  const { states, setStates, actions } = useAppContext();

  const handleKeyboard = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    const event = e
    if (event.key === 'Enter') { // Check if the Enter key is pressed: this will add a new task
      console.log('Enter pressed');
      const newProjectTitle = event.currentTarget.value.trim(); // Get the trimmed value of the input field
      
      if (newProjectTitle) { // Check if the input is not empty
        const newProject = {
          title: newProjectTitle,
          prev: projects.length > 0 ? projects[projects.length - 1][0] : null, // Set the previous project to the last project in the list or null if no projects exist
          next: null, // Set the next project to null initially
          userId: states.userProfile.id as string, // Assuming the user ID is available in the states
        };
        
        event.currentTarget.value = ''; // Clear the input field after adding the task
        
        //
        const bulkPayload = createBulkPayload(); // Create a bulk payload for the new project
        const backup = createBackup(states, bulkPayload); // Create a backup of the current state
        
        try {
          const id = actions.addProject(newProject, backup, true); // Call the addProject function from actions with the new project
          actions.focusProject(id, backup); // Focus on the newly added project
          optimisticUIUpdate(setStates, backup);
          await postPayloadToServer('/api/bulk', navigate, backup);
        } catch (error) {
          console.error('Error adding project:', error);
          restoreBackup(setStates, backup);
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
        placeholder={"+ add new project"}
        onKeyDown={handleKeyboard}
        className='addNewProjectInput' />
    </>
  )
}

export default AddNewProject