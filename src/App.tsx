import { useState, useEffect } from 'react'
import { PlusIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline'

interface Todo {
  id: number
  text: string
  completed: boolean
  parentId: number | null
  expanded?: boolean
  taskType: 'deadline' | 'scheduled' | 'ongoing'
  startTime?: string
  endTime?: string
  deadline?: string
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  todoId: number | null
}

interface SubTaskInputState {
  parentId: number | null
  value: string
}

interface EditingTodoState {
  todoId: number | null
  text: string
  taskType: 'deadline' | 'scheduled' | 'ongoing'
  startTime: string
  endTime: string
  deadline: string
}

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const savedTodos = localStorage.getItem('todos')
    return savedTodos ? JSON.parse(savedTodos) : []
  })
  const [input, setInput] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    todoId: null
  })
  const [subTaskInput, setSubTaskInput] = useState<SubTaskInputState>({
    parentId: null,
    value: ''
  })
  const [taskType, setTaskType] = useState<'deadline' | 'scheduled' | 'ongoing'>('ongoing')
  const [subTaskType, setSubTaskType] = useState<'deadline' | 'scheduled' | 'ongoing'>('ongoing')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [deadline, setDeadline] = useState('')
  const [subTaskStartTime, setSubTaskStartTime] = useState('')
  const [subTaskEndTime, setSubTaskEndTime] = useState('')
  const [subTaskDeadline, setSubTaskDeadline] = useState('')
  const [editingTodo, setEditingTodo] = useState<EditingTodoState>({
    todoId: null,
    text: '',
    taskType: 'ongoing',
    startTime: '',
    endTime: '',
    deadline: ''
  })

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isContextMenu = target.closest('.context-menu');
      const isSubTaskInput = target.closest('.sub-task-input');

      if (!isContextMenu) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }

      if (!isSubTaskInput && !subTaskInput.value.trim()) {
        setSubTaskInput({ parentId: null, value: '' })
      setSubTaskStartTime('')
      setSubTaskEndTime('')
      setSubTaskDeadline('');
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [subTaskInput.value]);

  const handleContextMenu = (e: React.MouseEvent, todoId: number) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      todoId
    })
  }

  const toggleExpand = (todoId: number) => {
    setTodos(prevTodos => prevTodos.map(todo => {
      if (todo.id === todoId) {
        return { ...todo, expanded: !todo.expanded }
      }
      return todo
    }))
  }

  const toggleTodo = (todoId: number) => {
    setTodos(prevTodos => prevTodos.map(todo => {
      if (todo.id === todoId) {
        return { ...todo, completed: !todo.completed }
      }
      return todo
    }))
  }

  const getChildTodos = (parentId: number | null) => {
    return todos.filter(todo => todo.parentId === parentId)
  }

  const startAddingSubTask = (parentId: number) => {
    setContextMenu({ visible: false, x: 0, y: 0, todoId: null });
    const parentTodo = todos.find(todo => todo.id === parentId);
    if (parentTodo) {
      setSubTaskType(parentTodo.taskType);
      if (parentTodo.taskType === 'scheduled') {
        setSubTaskStartTime(parentTodo.startTime || '');
        setSubTaskEndTime(parentTodo.endTime || '');
      } else if (parentTodo.taskType === 'deadline') {
        setSubTaskDeadline(parentTodo.deadline || '');
      }
      // 确保父任务处于展开状态
      if (!parentTodo.expanded) {
        setTodos(prevTodos => prevTodos.map(todo => 
          todo.id === parentId ? { ...todo, expanded: true } : todo
        ));
      }
    }
    setSubTaskInput({ parentId, value: '' });
  }

  const addSubTask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && subTaskInput.value.trim() && subTaskInput.parentId) {
// 由于未使用 parentTodo，可以删除这行代码
      const newTodo: Todo = {
        id: Date.now(),
        text: subTaskInput.value.trim(),
        completed: false,
        parentId: subTaskInput.parentId,
        taskType: subTaskType,
        startTime: subTaskType === 'ongoing' ? new Date().toISOString() : subTaskType === 'scheduled' ? subTaskStartTime : undefined,
        endTime: subTaskType === 'scheduled' ? subTaskEndTime : undefined,
        deadline: subTaskType === 'deadline' ? subTaskDeadline : undefined
      }
      setTodos(prevTodos => [...prevTodos, newTodo])
      setSubTaskInput({ parentId: null, value: '' })
      setSubTaskStartTime('')
      setSubTaskEndTime('')
      setSubTaskDeadline('')
    }
  }

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      const newTodo: Todo = {
        id: Date.now(),
        text: input.trim(),
        completed: false,
        parentId: null,
        taskType,
        startTime: taskType === 'ongoing' ? new Date().toISOString() : taskType === 'scheduled' ? startTime : undefined,
        endTime: taskType === 'scheduled' ? endTime : undefined,
        deadline: taskType === 'deadline' ? deadline : undefined
      }
      setTodos(prevTodos => [...prevTodos, newTodo])
      setInput('')
      setStartTime('')
      setEndTime('')
      setDeadline('')
    }
  }

  const startEditingTodo = (todo: Todo) => {
    setContextMenu(prev => ({ ...prev, visible: false }))
    setEditingTodo({
      todoId: todo.id,
      text: todo.text,
      taskType: todo.taskType,
      startTime: todo.startTime || '',
      endTime: todo.endTime || '',
      deadline: todo.deadline || ''
    })
  }

  const saveEditingTodo = () => {
    if (editingTodo.todoId) {
      setTodos(prevTodos => prevTodos.map(todo => {
        if (todo.id === editingTodo.todoId) {
          const updatedTodo = { ...todo, text: editingTodo.text, taskType: editingTodo.taskType }
          if (editingTodo.taskType === 'ongoing') {
            updatedTodo.startTime = todo.startTime || new Date().toISOString()
            delete updatedTodo.endTime
            delete updatedTodo.deadline
          } else if (editingTodo.taskType === 'scheduled') {
            updatedTodo.startTime = editingTodo.startTime
            updatedTodo.endTime = editingTodo.endTime
            delete updatedTodo.deadline
          } else if (editingTodo.taskType === 'deadline') {
            updatedTodo.deadline = editingTodo.deadline
            delete updatedTodo.startTime
            delete updatedTodo.endTime
          }
          return updatedTodo
        }
        return todo
      }))
      setEditingTodo({
        todoId: null,
        text: '',
        taskType: 'ongoing',
        startTime: '',
        endTime: '',
        deadline: ''
      })
    }
  }

  const cancelEditingTodo = () => {
    setEditingTodo({
      todoId: null,
      text: '',
      taskType: 'ongoing',
      startTime: '',
      endTime: '',
      deadline: ''
    })
  }

  const deleteTodo = (id: number) => {
    const deleteRecursive = (todoId: number) => {
      const childTodos = getChildTodos(todoId)
      childTodos.forEach(child => deleteRecursive(child.id))
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== todoId))
    }
    deleteRecursive(id)
  }

  const renderTodoTree = (parentId: number | null, level = 0) => {
    return getChildTodos(parentId).map(todo => (
      <div key={todo.id} className="mb-2">
        <div 
          className={`flex items-center gap-4 p-2 rounded-lg hover:bg-gray-100`}
          onContextMenu={(e) => handleContextMenu(e, todo.id)}
          style={{ paddingLeft: `${level * 32 + 8}px` }}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center text-gray-500">
              {getChildTodos(todo.id).length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpand(todo.id)
                  }}
                >
                  {todo.expanded ? '▼' : '▶'}
                </button>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleTodo(todo.id)
              }}
              className={`p-1 rounded-full ${todo.completed ? 'bg-green-500' : 'bg-gray-200'} hover:bg-opacity-80`}
            >
              <CheckIcon className={`h-4 w-4 ${todo.completed ? 'text-white' : 'text-gray-400'}`} />
            </button>
          </div>
          <div className="flex-1 flex items-center gap-4">
            <div className={`flex items-center gap-2 ${todo.completed ? 'text-gray-400 line-through' : ''}`}>
              {todo.taskType === 'ongoing' && <span className="text-blue-500">♾️</span>}
              {todo.taskType === 'scheduled' && <span className="text-green-500">📅</span>}
              {todo.taskType === 'deadline' && <span className="text-red-500">⏳</span>}
              <span>{todo.text}</span>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-2">
              {todo.taskType === 'ongoing' && todo.startTime && (
                <span>开始于: {new Date(todo.startTime).toLocaleString()}</span>
              )}
              {todo.taskType === 'scheduled' && todo.startTime && todo.endTime && (
                <span>{new Date(todo.startTime).toLocaleString()} - {new Date(todo.endTime).toLocaleString()}</span>
              )}
              {todo.taskType === 'deadline' && todo.deadline && (
                <span>截止时间: {new Date(todo.deadline).toLocaleString()}</span>
              )}
              {getChildTodos(todo.id).length > 0 && (
                <span className="ml-2">
                  {getChildTodos(todo.id).filter(t => t.completed).length}/{getChildTodos(todo.id).length}
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteTodo(todo.id)
              }}
              className="text-red-500 hover:text-red-600 ml-auto"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        {todo.expanded && (
          <div>
            {renderTodoTree(todo.id, level + 1)}
            {subTaskInput.parentId === todo.id && (
              <div className="space-y-2 sub-task-input" style={{ paddingLeft: `${(level + 1) * 32 + 8}px` }}>
                <div className="flex items-center gap-2">
                  <select
                    value={subTaskType}
                    onChange={(e) => setSubTaskType(e.target.value as 'deadline' | 'scheduled' | 'ongoing')}
                    className="w-48 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="ongoing">长期任务 ♾️</option>
                    <option value="scheduled">固定时间任务 📅</option>
                    <option value="deadline">最终期限任务 ⏳</option>
                  </select>
                  <input
                    type="text"
                    value={subTaskInput.value}
                    onChange={(e) => setSubTaskInput(prev => ({ ...prev, value: e.target.value }))}
                    onKeyDown={addSubTask}
                    placeholder="添加子任务..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                  />
                </div>
                {subTaskType === 'scheduled' && (
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      value={subTaskStartTime}
                      onChange={(e) => setSubTaskStartTime(e.target.value)}
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <span className="flex items-center">至</span>
                    <input
                      type="datetime-local"
                      value={subTaskEndTime}
                      onChange={(e) => setSubTaskEndTime(e.target.value)}
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                )}
                {subTaskType === 'deadline' && (
                  <input
                    type="datetime-local"
                    value={subTaskDeadline}
                    onChange={(e) => setSubTaskDeadline(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    ))
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4" onClick={() => setContextMenu(prev => ({ ...prev, visible: false }))}>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center relative">
          待办事项管理系统
          {/* 导入/导出按钮 */}
          <div className="absolute right-0 top-0 flex items-center gap-2">
            <button
              onClick={() => handleImportTodos()}
              className="px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              导入
            </button>
            <button
              onClick={exportTodos}
              className="px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              导出
            </button>
          </div>
        </h1>
        
        <form onSubmit={addTodo} className="space-y-4 mb-6">
          <div className="flex gap-2">
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as 'deadline' | 'scheduled' | 'ongoing')}
              className="w-48 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="ongoing">长期任务 ♾️</option>
              <option value="scheduled">固定时间任务 📅</option>
              <option value="deadline">最终期限任务 ⏳</option>
            </select>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="添加新的待办事项..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <PlusIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex gap-4">
            {taskType === 'scheduled' && (
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <span className="flex items-center">至</span>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            )}

            {taskType === 'deadline' && (
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            )}
          </div>
        </form>

        <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
          {renderTodoTree(null)}
          {todos.length === 0 && (
            <p className="text-center text-gray-500 mt-4">暂无待办事项</p>
          )}
        </div>

        {contextMenu.visible && (
          <div
            className="fixed bg-white rounded-lg shadow-lg py-2 z-50 context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => startAddingSubTask(contextMenu.todoId!)}
            >
              添加子任务
            </button>
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => {
                if (contextMenu.todoId) {
                  const todo = todos.find(t => t.id === contextMenu.todoId)
                  if (todo) {
                    startEditingTodo(todo)
                  }
                }
              }}
            >
              编辑任务
            </button>
          </div>
        )}

        {editingTodo.todoId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={cancelEditingTodo}>
            <div className="bg-white rounded-lg p-6 w-[600px]" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4">编辑任务</h2>
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={editingTodo.text}
                    onChange={(e) => setEditingTodo(prev => ({ ...prev, text: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                  />
                </div>
                <div>
                  <select
                    value={editingTodo.taskType}
                    onChange={(e) => setEditingTodo(prev => ({ ...prev, taskType: e.target.value as 'deadline' | 'scheduled' | 'ongoing' }))}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="ongoing">长期任务 ♾️</option>
                    <option value="scheduled">固定时间任务 📅</option>
                    <option value="deadline">最终期限任务 ⏳</option>
                  </select>
                </div>
                {editingTodo.taskType === 'scheduled' && (
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      value={editingTodo.startTime}
                      onChange={(e) => setEditingTodo(prev => ({ ...prev, startTime: e.target.value }))}
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <span className="flex items-center">至</span>
                    <input
                      type="datetime-local"
                      value={editingTodo.endTime}
                      onChange={(e) => setEditingTodo(prev => ({ ...prev, endTime: e.target.value }))}
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                )}
                {editingTodo.taskType === 'deadline' && (
                  <div>
                    <input
                      type="datetime-local"
                      value={editingTodo.deadline}
                      onChange={(e) => setEditingTodo(prev => ({ ...prev, deadline: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={cancelEditingTodo}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    取消
                  </button>
                  <button
                    onClick={saveEditingTodo}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

  const exportTodos = () => {
    const exportData = JSON.stringify(window.localStorage.getItem('todos') ? JSON.parse(window.localStorage.getItem('todos')!) : [], null, 2)
    const overlay = document.createElement('div')
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    
    const container = document.createElement('div')
    container.className = 'bg-white rounded-lg p-6 space-y-4 relative'
    
    const closeButton = document.createElement('button')
    closeButton.className = 'absolute top-2 right-2 text-gray-500 hover:text-gray-700'
    closeButton.innerHTML = '✕'
    closeButton.onclick = () => document.body.removeChild(overlay)
    
    const title = document.createElement('h2')
    title.className = 'text-xl font-bold mb-4'
    title.textContent = '导出数据'
    
    const textarea = document.createElement('textarea')
    textarea.className = 'w-full h-48 p-4 border rounded-lg font-mono text-sm'
    textarea.value = exportData
    textarea.readOnly = true
    
    const copyButton = document.createElement('button')
    copyButton.className = 'px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
    copyButton.textContent = '复制到剪贴板'
    copyButton.onclick = () => {
      navigator.clipboard.writeText(exportData).then(() => {
        copyButton.textContent = '复制成功!'
        copyButton.className = 'px-4 py-2 bg-green-500 text-white rounded-lg'
        setTimeout(() => {
          copyButton.textContent = '复制到剪贴板'
          copyButton.className = 'px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
        }, 2000)
      }).catch(error => {
        console.error('复制失败:', error)
        alert('复制失败，请重试')
      })
    }
    
    container.appendChild(closeButton)
    container.appendChild(title)
    container.appendChild(textarea)
    container.appendChild(copyButton)
    overlay.appendChild(container)
    document.body.appendChild(overlay)
  }

  const handleImportTodos = () => {
    const overlay = document.createElement('div')
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    
    const container = document.createElement('div')
    container.className = 'bg-white rounded-lg p-6 space-y-4 relative'
    
    const closeButton = document.createElement('button')
    closeButton.className = 'absolute top-2 right-2 text-gray-500 hover:text-gray-700'
    closeButton.innerHTML = '✕'
    closeButton.onclick = () => document.body.removeChild(overlay)
    
    const title = document.createElement('h2')
    title.className = 'text-xl font-bold mb-4'
    title.textContent = '导入数据'
    
    const textarea = document.createElement('textarea')
    textarea.className = 'w-full h-48 p-4 border rounded-lg font-mono text-sm'
    textarea.placeholder = '请粘贴导出的JSON数据...'
    
    const buttonContainer = document.createElement('div')
    buttonContainer.className = 'flex justify-end gap-2'
    
    const cancelButton = document.createElement('button')
    cancelButton.className = 'px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600'
    cancelButton.textContent = '取消'
    cancelButton.onclick = () => document.body.removeChild(overlay)
    
    const importButton = document.createElement('button')
    importButton.className = 'px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
    importButton.textContent = '导入'
    importButton.onclick = () => {
      try {
        const importedTodos = JSON.parse(textarea.value)
        localStorage.setItem('todos', JSON.stringify(importedTodos))
        window.location.reload()
      } catch (error) {
        console.error('导入失败:', error)
        alert('导入失败，请确保数据格式正确')
      }
    }
    
    buttonContainer.appendChild(cancelButton)
    buttonContainer.appendChild(importButton)
    container.appendChild(closeButton)
    container.appendChild(title)
    container.appendChild(textarea)
    container.appendChild(buttonContainer)
    overlay.appendChild(container)
    document.body.appendChild(overlay)
  }

  // 导入功能 - 临时测试用
  // 由于该函数未被使用，可以删除或添加导出
  export const importTodos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedTodos = JSON.parse(e.target?.result as string)
          // 将导入的数据保存到 localStorage
          localStorage.setItem('todos', JSON.stringify(importedTodos))
          // 强制刷新页面以重新加载数据
          window.location.reload()
        } catch (error) {
          console.error('导入失败:', error)
        }
      }
      reader.readAsText(file)
    }
  }
