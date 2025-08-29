import { act, useState } from 'react'
import '../App.css'
import './Menubar.css'

import ProjectButton from './ProjectButton.tsx'
import { useImmer } from 'use-immer'
import TaskDropArea from './TaskDropArea.tsx'
import ProjectPanel from './ProjectPanel.tsx'

import { useAppContext } from './AppContext.tsx'



/**
 * The Menubar component is the left sidebar of the todolist application.
 * It contains the project list, search bar, and other menu items.
 * @param actions - The actions object containing functions to manipulate projects and tasks.
 * @param projects - The list of projects available in the application.
 * @param currentProjectID - The ID of the currently selected project.
 * @param setCurrentProjectID - Function to set the currently selected project ID.
 * @param isMouseOverDropZone - Boolean indicating if the mouse is over the drop zone.
 */
function Menubar() {

  // Use the AppContext to access the global state and actions
  const { states, setStates, actions } = useAppContext();

  /**
   * Handle click event for the delete tasks button.
   */
  const handleDeleteTasksClick = () => {
    if (states.showDeleted) {
      setStates.setShowDeleted(false);
      const ele = document.getElementById('deletedContainer');
      if (ele) {
        ele.classList.add('hide');
        setTimeout(() => {
          // ele.style.display = 'none';
        }, 300);
      }
    } else {
      setStates.setShowDeleted(true);
      const ele = document.getElementById('deletedContainer');
      if (ele) {
        setTimeout(() => {
          ele.classList.remove('hide');
        }, 10);
        // ele.style.display = 'block';
      }
    }
  };

  const handleCompletedTasksClick = () => {
    if (states.showCompleted) {
      setStates.setShowCompleted(false);
      const ele = document.getElementById('completedContainer');
      if (ele) {
        ele.classList.add('hide');
        setTimeout(() => {
          // ele.style.display = 'none';
        }, 300);
      }
    } else {
      setStates.setShowCompleted(true);
      const ele = document.getElementById('completedContainer');
      if (ele) {
        setTimeout(() => {
          ele.classList.remove('hide');
        }, 10);
        // ele.style.display = 'block';
      }
    }
  };

  return (
    <>
      <div className='menubarContainer'>
        {/* Logo part 
        // TODO: make a logo */}
        <div>
          <p className='menubarTitle'>Raccoon Study</p>
        </div>

        <div className='menubarSearchBar'>
          <input className="searchInput" type="text" placeholder="Search..." />
          {/* TODO: Search bar tbd */}
        </div>

        {/* The project list */}
        <div className='menubarProjectsHeader'>
          <p className='menubarProjectsTitle'>Projects</p>
        </div>

        {/* The actual project buttons components, a droppable */}
        <ProjectPanel />

        {/* Places for additional actions, such as call deleted and completed tasks, settings and Help+About */}
        <div className='menubarBottom'>
          {/*
          // TODO: Delete Button, hit to pop column with deleted tasks
          // TODO: Completed Tasks Button, hit to pop column with completed task
          */}
          <div className='menubarBottomItems'
            onClick={handleDeleteTasksClick}>
            <p>Deleted Tasks</p>
          </div>
          <div className='menubarBottomItems'
            onClick={handleCompletedTasksClick}>
            <p>Completed Tasks</p>
          </div>
          <div className='menubarBottomItems'>
            <p>Settings</p>
          </div>
          <div className='menubarBottomItems'>
            <p>Help & About</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Menubar