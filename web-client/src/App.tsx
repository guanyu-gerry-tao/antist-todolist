import './App.css';

import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Todolist from './components/Todolist.tsx';
import Login from './components/Login.tsx';
import ProtectedPage from './components/ProtectedPage.tsx';

/**
 * Main application component.
 * This component initializes the application state and handles task and project management.
 * It provides functions to add, update, delete tasks and projects, and manages the drag-and-drop functionality.
 */
function App() {
  // Note: The DragDropContext component is used to wrap the entire application to enable drag-and-drop functionality.
  // It provides the necessary context for drag-and-drop operations.
  // The onDragEnd, onDragStart, and onDragUpdate functions are passed as props to handle the drag-and-drop events.
  // The Todolist component is the main component that displays the tasks and projects.
  // It receives the tasks, projects, user status, actions, and dragged task as props.
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={
          <ProtectedPage><Todolist /></ProtectedPage>
        } />
        <Route path='/about' element={<div>ABOUT PAGE</div>} />
        <Route path='/intro' element={<div>INTRO PAGE</div>} />
        {/* <Route path='/reset' element={<ResetTestButton />} /> */}
        <Route path='/login' element={<Login />} />
        <Route path='/signup' element={<div>Signup Page</div>} />
        <Route path='*' element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  )
}
export default App