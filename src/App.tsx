import { useState, useEffect } from 'react'
import { PlusIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline'

/**
 * 待办事项数据结构
 * @interface Todo
 * @property {number} id - 唯一标识符
 * @property {string} text - 任务内容
 * @property {boolean} completed - 完成状态
 * @property {number|null} parentId - 父任务ID，顶级任务为null
 * @property {boolean} [expanded] - 是否展开子任务
 * @property {'deadline'|'scheduled'|'ongoing'|'unscheduled'} taskType - 任务类型
 * @property {string} [startTime] - 开始时间（ISO格式）
 * @property {string} [endTime] - 结束时间（ISO格式）
 * @property {string} [deadline] - 截止时间（ISO格式）
 */
interface Todo {
  id: number
  text: string
  completed: boolean
  parentId: number | null
  expanded?: boolean
  taskType: 'deadline' | 'scheduled' | 'ongoing' | 'unscheduled'
  startTime?: string
  endTime?: string
  deadline?: string
}

/**
 * 右键菜单状态
 * @interface ContextMenuState
 * @property {boolean} visible - 是否显示
 * @property {number} x - 横坐标位置
 * @property {number} y - 纵坐标位置
 * @property {number|null} todoId - 关联的待办事项ID
 */
interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  todoId: number | null
}

/**
 * 子任务输入状态
 * @interface SubTaskInputState
 * @property {number|null} parentId - 父任务ID
 * @property {string} value - 输入内容
 */
interface SubTaskInputState {
  parentId: number | null
  value: string
}

/**
 * 编辑任务状态
 * @interface EditingTodoState
 * @property {number|null} todoId - 待编辑的任务ID
 * @property {string} text - 任务内容
 * @property {'deadline'|'scheduled'|'ongoing'|'unscheduled'} taskType - 任务类型
 * @property {string} startTime - 开始时间
 * @property {string} endTime - 结束时间
 * @property {string} deadline - 截止时间
 */
interface EditingTodoState {
  todoId: number | null
  text: string
  taskType: 'deadline' | 'scheduled' | 'ongoing' | 'unscheduled'
  startTime: string
  endTime: string
  deadline: string
}

/**
 * 待办事项管理系统主应用组件
 * 实现了任务的增删改查、子任务管理、时间筛选、列表/时间轴视图切换等功能
 */
function App() {
  // 当前选中日期，默认为今天，用于筛选任务
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today.toISOString()
  })

  // 所有待办事项数据，从localStorage加载
  const [todos, setTodos] = useState<Todo[]>(() => {
    const savedTodos = localStorage.getItem('todos')
    return savedTodos ? JSON.parse(savedTodos) : []
  })

  /**
   * 获取前后7天的日期列表，用于日期导航栏
   * @returns {string[]} ISO格式的日期字符串数组
   */
  // 获取前后7天的日期
  const getDates = () => {
    const dates = []
    const current = new Date(selectedDate)
    for (let i = -7; i <= 7; i++) {
      const date = new Date(current)
      date.setDate(current.getDate() + i)
      date.setHours(0, 0, 0, 0)
      dates.push(date.toISOString())
    }
    return dates
  }

  /**
   * 根据日期和父任务ID筛选任务
   * @param {number|null} parentId - 父任务ID，顶级任务为null
   * @returns {Todo[]} 筛选后的任务列表
   */
  // 根据日期筛选任务
  const getFilteredTodos = (parentId: number | null) => {
    return todos.filter(todo => {
      if (todo.parentId !== parentId) return false

      // 长期任务总是显示
      if (todo.taskType === 'ongoing') return true

      const date = new Date(selectedDate)
      date.setHours(0, 0, 0, 0)
      const startOfDay = date.getTime()
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000

      if (todo.taskType === 'scheduled') {
        const startTime = new Date(todo.startTime!).getTime()
        const endTime = new Date(todo.endTime!).getTime()
        return startTime < endOfDay && endTime >= startOfDay
      }

      if (todo.taskType === 'deadline') {
        const deadline = new Date(todo.deadline!).getTime()
        return deadline >= startOfDay && deadline < endOfDay
      }

      return false
    })
  }
  // 新任务输入框内容
  const [input, setInput] = useState('')
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    todoId: null
  })
  // 子任务输入状态
  const [subTaskInput, setSubTaskInput] = useState<SubTaskInputState>({
    parentId: null,
    value: ''
  })
  // 新任务类型，默认为长期任务
  const [taskType, setTaskType] = useState<'deadline' | 'scheduled' | 'ongoing' | 'unscheduled'>('ongoing')
  // 新子任务类型，默认为长期任务
  const [subTaskType, setSubTaskType] = useState<'deadline' | 'scheduled' | 'ongoing' | 'unscheduled'>('ongoing')
  // 新任务开始时间（用于固定时间任务）
  const [startTime, setStartTime] = useState('')
  // 新任务结束时间（用于固定时间任务）
  const [endTime, setEndTime] = useState('')
  // 新任务截止时间（用于最终期限任务）
  const [deadline, setDeadline] = useState('')
  // 新子任务开始时间
  const [subTaskStartTime, setSubTaskStartTime] = useState('')
  // 新子任务结束时间
  const [subTaskEndTime, setSubTaskEndTime] = useState('')
  // 新子任务截止时间
  const [subTaskDeadline, setSubTaskDeadline] = useState('')
  // 当前正在编辑的任务状态
  const [editingTodo, setEditingTodo] = useState<EditingTodoState>({
    todoId: null,
    text: '',
    taskType: 'ongoing',
    startTime: '',
    endTime: '',
    deadline: ''
  })

  // 当任务数据变化时，保存到localStorage
  // 处理点击事件，关闭右键菜单和子任务输入框
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

  // 当任务数据变化时，保存到localStorage
  // 处理点击事件，关闭右键菜单和子任务输入框
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

  /**
   * 处理右键菜单事件
   * @param {React.MouseEvent} e - 鼠标事件
   * @param {number} todoId - 任务ID
   */
  const handleContextMenu = (e: React.MouseEvent, todoId: number) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      todoId
    })
  }

  /**
   * 切换任务的展开/折叠状态
   * @param {number} todoId - 任务ID
   */
  const toggleExpand = (todoId: number) => {
    setTodos(prevTodos => prevTodos.map(todo => {
      if (todo.id === todoId) {
        return { ...todo, expanded: !todo.expanded }
      }
      return todo
    }))
  }

  /**
   * 切换任务的完成状态
   * @param {number} todoId - 任务ID
   */
  const toggleTodo = (todoId: number) => {
    setTodos(prevTodos => prevTodos.map(todo => {
      if (todo.id === todoId) {
        return { ...todo, completed: !todo.completed }
      }
      return todo
    }))
  }

  /**
   * 获取指定父任务的所有子任务
   * @param {number|null} parentId - 父任务ID
   * @returns {Todo[]} 子任务列表
   */
  const getChildTodos = (parentId: number | null) => {
    return todos.filter(todo => todo.parentId === parentId)
  }

  /**
   * 开始添加子任务，准备子任务输入界面
   * @param {number} parentId - 父任务ID
   */
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

  /**
   * 添加子任务，按Enter键确认
   * @param {React.KeyboardEvent<HTMLInputElement>} e - 键盘事件
   */
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

  /**
   * 添加新的顶级任务
   * @param {React.FormEvent} e - 表单事件
   */
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

  /**
   * 开始编辑任务，打开编辑对话框
   * @param {Todo} todo - 待编辑的任务
   */
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

  /**
   * 保存编辑中的任务
   */
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

  /**
   * 取消编辑任务
   */
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

  /**
   * 删除任务及其所有子任务
   * @param {number} id - 任务ID
   */
  const deleteTodo = (id: number) => {
    const deleteRecursive = (todoId: number) => {
      const childTodos = getChildTodos(todoId)
      childTodos.forEach(child => deleteRecursive(child.id))
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== todoId))
    }
    deleteRecursive(id)
  }

  /**
   * 渲染任务树形结构
   * @param {number|null} parentId - 父任务ID，顶级任务为null
   * @param {number} level - 当前层级，用于缩进
   * @returns {JSX.Element[]} 渲染的任务列表
   */
  const renderTodoTree = (parentId: number | null, level = 0) => {
    return getFilteredTodos(parentId).map(todo => (
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
              {todo.taskType === 'unscheduled' && <span className="text-yellow-500">🗓️</span>}
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
                    <option value="unscheduled">待安排任务 ⏱️</option>
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

  // 视图模式：列表或时间轴
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')

  /**
   * 渲染时间轴视图
   * @returns {JSX.Element} 时间轴视图组件
   */
  const renderTimelineView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const scheduledTasks = getFilteredTodos(null).filter(todo => todo.taskType === 'scheduled')
    const deadlineTasks = getFilteredTodos(null).filter(todo => todo.taskType === 'deadline')
    const ongoingTasks = todos.filter(todo => todo.taskType === 'ongoing' && todo.parentId === null)

    /**
     * 计算任务在时间轴上的层级，避免任务重叠
     * @param {Todo[]} tasks - 任务列表
     * @returns {{[key: number]: number}} 任务ID到层级的映射
     */
    // 计算任务的层级
    const calculateTaskLevels = (tasks: Todo[]) => {
      const levels: { [key: number]: number } = {}
      tasks.forEach(task => {
        const start = new Date(task.startTime!)
        const end = new Date(task.endTime!)
        let level = 0
        // 查找可用的最低层级
        while (tasks.some(otherTask => {
          if (otherTask.id === task.id) return false
          const otherStart = new Date(otherTask.startTime!)
          const otherEnd = new Date(otherTask.endTime!)
          return levels[otherTask.id] === level &&
            start < otherEnd && end > otherStart
        })) {
          level++
        }
        levels[task.id] = level
      })
      return levels
    }

    const taskLevels = calculateTaskLevels(scheduledTasks)
    const maxLevel = Math.max(...Object.values(taskLevels), 0)
    const timelineHeight = (maxLevel + 1) * 40 + 20 // 每个层级40px，额外留20px空间

    return (
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">时间轴视图</h2>
          <div className="relative">
            <div className="flex border-b">
              {hours.map(hour => (
                <div key={hour} className="flex-1 text-center text-sm text-gray-500">
                  {hour}:00
                </div>
              ))}
            </div>
            <div className="relative mt-2" style={{ height: `${timelineHeight}px` }}>
              {scheduledTasks.map(task => {
                const start = new Date(task.startTime!)
                const end = new Date(task.endTime!)
                const startPercent = (start.getHours() + start.getMinutes() / 60) / 24 * 100
                const endPercent = (end.getHours() + end.getMinutes() / 60) / 24 * 100
                const width = endPercent - startPercent
                const level = taskLevels[task.id]

                return (
                  <div
                    key={task.id}
                    className="absolute h-8 bg-green-200 rounded-lg shadow-sm hover:bg-green-300 transition-colors duration-200 flex items-center px-3 text-sm cursor-pointer group"
                    style={{
                      left: `${startPercent}%`,
                      width: `${Math.max(width, 5)}%`,
                      top: `${level * 40}px`
                    }}
                  >
                    <span className="truncate">{task.text}</span>
                    <div className="absolute hidden group-hover:block bg-white p-2 rounded-lg shadow-lg z-10 -top-12 left-0 whitespace-nowrap">
                      <p className="font-medium">{task.text}</p>
                      <p className="text-gray-500 text-xs">
                        {start.toLocaleTimeString()} - {end.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )
              })}
              {deadlineTasks.map(task => {
                const deadline = new Date(task.deadline!)
                const position = (deadline.getHours() + deadline.getMinutes() / 60) / 24 * 100

                return (
                  <div
                    key={task.id}
                    className="absolute group"
                    style={{ left: `${position}%`, bottom: 0 }}
                  >
                    <div className="h-full bg-red-500 relative" style={{ width: '2px', height: `${timelineHeight - 32}px` }}>
                      <div className="absolute -top-8 -translate-x-1/2 bg-red-100 px-2 py-1 rounded-lg shadow-sm hover:bg-red-200 transition-colors duration-200 cursor-pointer">
                        <p className="text-xs text-red-600 truncate max-w-[120px]">{task.text}</p>
                        <div className="absolute hidden group-hover:block bg-white p-2 rounded-lg shadow-lg z-10 -top-12 left-0 whitespace-nowrap">
                          <p className="font-medium text-red-600">{task.text}</p>
                          <p className="text-gray-500 text-xs">
                            截止时间: {deadline.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">长期任务</h2>
          <div className="space-y-2">
            {ongoingTasks.map(task => (
              <div key={task.id} className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-lg">
                <span className="text-blue-500">♾️</span>
                <span className={task.completed ? 'line-through text-gray-400' : ''}>{task.text}</span>
                <span className="text-sm text-gray-500 ml-auto">
                  开始于: {new Date(task.startTime!).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4" onClick={() => setContextMenu(prev => ({ ...prev, visible: false }))}>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center relative">
          待办事项管理系统
          {/* 导入/导出按钮 */}
          <div className="absolute right-0 top-0 flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'timeline' : 'list')}
              className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
            >
              {viewMode === 'list' ? '切换时间轴视图' : '切换列表视图'}
            </button>
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

        {/* 日期导航栏 */}
        <div className="mb-6 overflow-x-auto">
          {viewMode === 'timeline' && renderTimelineView()}
          {viewMode === 'list' && (
          <div className="flex gap-2 pb-2">
            {getDates().map(date => {
              const d = new Date(date)
              const isToday = d.toDateString() === new Date().toDateString()
              const isSelected = d.toISOString() === selectedDate
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`px-4 py-2 rounded-lg flex-shrink-0 ${isSelected ? 'bg-blue-500 text-white' : isToday ? 'bg-blue-100 text-blue-800' : 'bg-white text-gray-800'} hover:bg-blue-400 hover:text-white transition-colors`}
                >
                  <div className="text-sm font-semibold">{d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</div>
                  <div className="text-xs">{d.toLocaleDateString('zh-CN', { weekday: 'short' })}</div>
                </button>
              )
            })}
          </div>
          )}
        </div>
        
        <form onSubmit={addTodo} className="space-y-4 mb-6">
          <div className="flex gap-2">
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as 'deadline' | 'scheduled' | 'ongoing')}
              className="w-48 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="ongoing">长期任务 ♾️</option>
              <option value="unscheduled">待安排任务 ⏱️</option>
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

        <div className="overflow-y-auto max-h-[calc(100vh-350px)]">
          {getFilteredTodos(null).length > 0 ? (
            renderTodoTree(null)
          ) : (
            <p className="text-center text-gray-500 mt-4">当前日期暂无待办事项</p>
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
                    <option value="unscheduled">待安排任务 ⏱️</option>
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

/**
 * 导出待办事项数据
 * 创建一个弹窗显示JSON数据，并提供复制功能
 */
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

/**
 * 处理导入待办事项数据
 * 创建一个弹窗让用户粘贴JSON数据
 */
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

/**
 * 从文件导入待办事项数据（未使用的功能）
 * @param {React.ChangeEvent<HTMLInputElement>} e - 文件输入事件
 */
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
