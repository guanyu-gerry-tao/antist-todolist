import { useRef, useState, useEffect, act } from 'react'

import '../App.css'
import './ProjectButton.css'

import type { ProjectType, ProjectId } from '../utils/type'
import { Draggable } from '@hello-pangea/dnd'
import { useAppContext } from './AppContext'
import { createBackup, createBulkPayload, optimisticUIUpdate, postPayloadToServer, restoreBackup } from '../utils/utils'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { i } from 'framer-motion/client'

/**
 * This function is used to get the style of the project button when it is being dragged
 * @param style - The current style of the project button
 * @param snapshot - The snapshot of the drag state, provides information about the drag state, provided by the Draggable component
 * @returns The updated style for the project button, used in the Draggable component.
 */
function getStyle(style: any, snapshot: any) {
  if (snapshot.isDragging) {
    return {
      ...style,
      boxShadow: `rgba(114, 114, 114, 0.5) 0px 5px 10px 5px`,
      opacity: 0.5,
    }
  }
  return style
}

/**
 * ProjectButton component represents a single project button in the project panel.
 * It is draggable and can be clicked to select the project.
 * @param project - The project item to be displayed in this button. Contains properties like id, title, and order.
 * @param projects - The list of all projects, used for deleting and reordering.
 * @param currentProjectID - The ID of the currently selected/showing project.
 * @param setCurrentProjectID - Function to set the currently selected project ID.
 * @param actions - The actions object containing methods to manipulate projects. Defined in App.tsx.
 */
function ProjectButton({
  project,
  projects,
  currentProjectID, }:
  {
    project: [ProjectId, ProjectType],
    projects: [ProjectId, ProjectType][],
    currentProjectID: ProjectId | null,
  }) {

  const [isEditing, setIsEditing] = useState(false); // State to track if the project title is being edited
  const [mouseOver, setMouseOver] = useState(false); // State to track if the mouse is over the project button

  const navigate = useNavigate();

  // Use the AppContext to access the global state and actions
  const { states, setStates, actions } = useAppContext();

  /** Handle click event on the project button. */
  const handleClick = () => {
    const payload = createBulkPayload();
    const backup = createBackup(states, payload);

    setStates.setShowCompleted(false); // Hide completed tasks when switching projects
    setStates.setShowDeleted(false); // Hide deleted tasks when switching projects

    try {
      actions.focusProject(project[0], payload); // Focus on the clicked project
      optimisticUIUpdate(setStates, payload); // Optimistically update the UI
      postPayloadToServer('/api/bulk', navigate, payload); // Send the focus request
    } catch (error) {
      console.error('Error focusing project:', error);
      restoreBackup(setStates, backup); // Restore the previous state in case of an error
    }
  }
  // TODO: make project buttons scrollable.


  /**
   * Handle change event for the project title input field.
   * @param e - The change event for the input field.
  */
  const handlePressEnterAndEscape = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const event = e; // Store the current target for later use
    const oldTitle = project[1].title; // Get the old title of the project
    if (event.key === 'Enter') {
      const newTitle = event.currentTarget.value;
      if (newTitle.trim() === '') {
        event.currentTarget.value = oldTitle; // Reset the input field to the old title
        event.currentTarget.blur(); // Remove focus from the input field
        setIsEditing(false); // Stop editing mode
        return; // Prevent empty project titles
      } else if (newTitle === oldTitle) {
        event.currentTarget.blur(); // Remove focus from the input field if the title hasn't changed
        setIsEditing(false); // Stop editing mode
        return; // Prevent unnecessary updates

      } else {
        event.currentTarget.blur(); // Remove focus from the input field
        setIsEditing(false); // Stop editing mode
        const payload = createBulkPayload();
        const backup = createBackup(states, payload);

        try {
          actions.updateProject(project[0], { title: newTitle }, payload); // Call the update function from actions with the project ID and new title
          optimisticUIUpdate(setStates, payload); // Optimistically update the UI with the new title
          postPayloadToServer('/api/bulk', navigate, payload); // Send the update request to the server
        } catch (error) {
          console.error('Error updating project title:', error);
          restoreBackup(setStates, backup); // Restore the previous state in case of an error
        }
      }
      // TODO: Implement the logic to update the project title when the input field changes.
    }
    if (e.key === 'Escape') {
      event.currentTarget.blur(); // Remove focus from the input field
      setIsEditing(false); // Stop editing mode
      event.currentTarget.value = oldTitle; // Reset the input field to the old title
    }
  }

  /**
   * Handle mouse event for the delete button.
   * @param e - The mouse event for the delete button.
   */
  const handleDeleteButton = (e: React.MouseEvent<HTMLDivElement>) => {
    const event = e; // Store the current target for later use
    event.stopPropagation(); // Prevent the click event from propagating to the parent div
    if (window.confirm(`Are you sure you want to delete the project: ${project[1].title}? You cannot undo this action and all tasks will gone!`)) {

      // handle changing of the current project ID
      // if project deleted and there are still projects left,
      // set the current project ID to the previous project.


      // Create a bulk payload and backup for the delete operation
      const bulkPayload = createBulkPayload();
      const backup = createBackup(states, bulkPayload);

      try {
        actions.deleteProject(project[0], backup); // Call the delete function from actions with the project ID
        optimisticUIUpdate(setStates, backup); // Optimistically update the UI with the deleted project
        postPayloadToServer('/api/bulk', navigate, backup); // Send the delete request to the server
        console.log('tasks after deletion', JSON.stringify(states.projects));
      } catch (error) {
        console.error('Error deleting project:', error);
        restoreBackup(setStates, backup); // Restore the previous state in case of an error
      }

      // actions.deleteProject(project[0]); // Call the delete function from actions with the project ID

      console.log(`Delete button clicked for project: ${project[1].title}`);

    }
  }

  // Note: the Draggable component from @hello-pangea/dnd requires a unique draggableId for each task.
  // The setup below is specially for the draggable task component.
  // id: it should be unique and match the taskInfo.id, which is already unique. Specially required by Draggable component.
  // ref: it is used to get the reference of the task element for dragging. Specially Required by Draggable component.
  // ...provided.draggableProps: these are the props required by the Draggable component to make the task draggable.
  // ...provided.dragHandleProps: these are the props required by the Draggable component to make the <div> draggable.
  // style: this is used to apply the draggable styles to the task element. See getStyle function above.

  const reftitle = useRef<HTMLInputElement>(null);

  return (
    <>
      <motion.div
        id={project[0]}
        layout
        layoutId={project[0]}
        animate={{ zIndex: 2000 }}
        onMouseEnter={() => { setMouseOver(true); }}
        onMouseLeave={() => { setMouseOver(false); }}
        onDoubleClick={(e) => {
          e.stopPropagation(); // Prevent the click event from propagating to the parent div
          setIsEditing(true); // Set the editing mode to true when double-clicked
          reftitle.current?.focus(); // Focus the input field when double-clicked
          reftitle.current?.select(); // Select the input text when double-clicked
        }}
        className={`projectButton`}
        style={{
          border: currentProjectID === project[0] ? '1px solid #b6b6b6ff' : '1px solid transparent',
          boxShadow: isEditing ? 'rgba(49, 49, 49, 0.5) 0px 0px 0px 2px' : 'none',
        }}
        onClick={handleClick}
      >
        <div className="projectButtonContent"
        >
          <input
            type='text'
            className='projectButtonInput'
            ref={reftitle}
            defaultValue={project[1].title}
            onKeyDown={handlePressEnterAndEscape}
            onBlur={(e) => {
              setIsEditing(false)
              e.currentTarget.setSelectionRange(0, 0); // Deselect the input field when it loses focus
            }}
            readOnly={!isEditing} // Make the input field read-only when not in editing mode
          />


        </div>
        <div className="deleteProjectButton"
          style={{
            opacity: mouseOver ? 1 : 0,
            visibility: mouseOver ? 'visible' : 'hidden',
            pointerEvents: mouseOver ? 'auto' : 'none',
          }}
          onClick={handleDeleteButton}
        ></div>
      </motion.div>
    </>
  )
}

export default ProjectButton
