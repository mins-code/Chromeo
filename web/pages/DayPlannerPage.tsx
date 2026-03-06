import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '../utils/logger';
import { format, addDays, subDays } from 'date-fns';
import { Task, DayPlan, TaskLink, TaskLayout } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Copy,
  Trash2,
  Save,
  Layout as LayoutIcon,
  Download,
  RefreshCw,
  Link2,
  Maximize2,
  X,
  Unlink,
} from 'lucide-react';
import Button from '../components/Button';
import FlowchartCanvas from '../components/FlowchartCanvas';
import CloneDayModal from '../components/CloneDayModal';
import SaveTemplateModal from '../components/SaveTemplateModal';
import TemplatesModal from '../components/TemplatesModal';
import RecurringPlanModal from '../components/RecurringPlanModal';
import * as DayPlanService from '../services/dayPlanService';
import { ReactFlowProvider } from '@xyflow/react';
import { DayPlanTemplate, RecurrenceConfig } from '../types';
import { formatTime } from '../utils/date';

interface DayPlannerPageProps {
  tasks: Task[];
  onCreateTask: (initialDate?: Date, type?: any) => void;
  onEditTask: (task: Task) => void;
  createTask: (task: any) => Promise<any>;
}

const DayPlannerPage: React.FC<DayPlannerPageProps> = ({
  tasks,
  onCreateTask,
  onEditTask,
  createTask,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(true);
  const [isMobileTaskPanelOpen, setIsMobileTaskPanelOpen] = useState(false);

  // Format current date as YYYY-MM-DD
  const dateKey = useMemo(() => format(currentDate, 'yyyy-MM-dd'), [currentDate]);

  // Load day plan for current date
  useEffect(() => {
    const loadPlan = async () => {
      const existingPlan = await DayPlanService.getDayPlan(dateKey);
      if (existingPlan) {
        setDayPlan(existingPlan);
        return;
      }
      
      // No existing plan - check for recurring templates
      const recurringTemplate = await DayPlanService.checkForRecurringPlans(dateKey, 'current-user');
      if (recurringTemplate) {
        logger.debug('[DayPlanner] Recurring template found', { recurringTemplate });
      }
      
      // Create empty day plan for this date
      const newPlan: DayPlan = {
        id: crypto.randomUUID(),
        userId: 'current-user',
        date: dateKey,
        taskIds: [],
        links: [],
        layout: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDayPlan(newPlan);
      await DayPlanService.saveDayPlan(newPlan);
    };
    loadPlan();
  }, [dateKey]);

  // Get tasks for current day plan
  const planTasks = useMemo(() => {
    if (!dayPlan) return [];
    return tasks.filter((t) => dayPlan.taskIds.includes(t.id));
  }, [tasks, dayPlan]);

  // Get tasks for the current date that are not in the plan
  const unusedTasks = useMemo(() => {
    // Filter tasks that have a due date matching the current date
    const tasksForDate = tasks.filter((t) => {
      if (!t.dueDate) return false;
      const taskDate = format(new Date(t.dueDate), 'yyyy-MM-dd');
      return taskDate === dateKey;
    });
    
    // Exclude tasks already in the plan
    if (!dayPlan) return tasksForDate;
    return tasksForDate.filter((t) => !dayPlan.taskIds.includes(t.id));
  }, [tasks, dayPlan, dateKey]);

  // Navigation handlers
  const goToPreviousDay = () => setCurrentDate((prev) => subDays(prev, 1));
  const goToNextDay = () => setCurrentDate((prev) => addDays(prev, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Clear day plan
  const handleClearPlan = useCallback(async () => {
    if (dayPlan && confirm('Clear all tasks from this day plan?')) {
      const clearedPlan: DayPlan = {
        ...dayPlan,
        taskIds: [],
        links: [],
        layout: [],
        updatedAt: new Date().toISOString(),
      };
      setDayPlan(clearedPlan);
      await DayPlanService.saveDayPlan(clearedPlan);
    }
  }, [dayPlan]);

  // Clear all links only
  const handleClearLinks = useCallback(async () => {
    if (dayPlan && dayPlan.links.length > 0 && confirm('Clear all links between tasks?')) {
      const updatedPlan: DayPlan = {
        ...dayPlan,
        links: [],
        updatedAt: new Date().toISOString(),
      };
      setDayPlan(updatedPlan);
      await DayPlanService.saveDayPlan(updatedPlan);
    }
  }, [dayPlan]);

  // Handle task drag from sidebar
  const handleDragStart = useCallback((task: Task) => {
    setDraggedTask(task);
  }, []);

  // Handle drop on canvas
  const handleCanvasDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      if (!draggedTask || !dayPlan) return;

      const canvasBounds = event.currentTarget.getBoundingClientRect();
      // Calculate position relative to canvas, accounting for header height (64px = 4rem)
      const HEADER_HEIGHT = 64;
      const x = Math.max(50, event.clientX - canvasBounds.left);
      const y = Math.max(50, event.clientY - canvasBounds.top - HEADER_HEIGHT);

      // Add task to plan
      const updatedPlan = await DayPlanService.addTaskToPlan(dayPlan.id, draggedTask.id, { x, y });
      if (updatedPlan) {
        setDayPlan(updatedPlan);
      }
      setDraggedTask(null);
    },
    [draggedTask, dayPlan]
  );

  const handleCanvasDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  // Handle task move
  const handleTaskMove = useCallback(
    async (taskId: string, x: number, y: number) => {
      if (!dayPlan) return;

      const updatedLayout = [...dayPlan.layout];
      const layoutIndex = updatedLayout.findIndex((l) => l.taskId === taskId);

      if (layoutIndex >= 0) {
        updatedLayout[layoutIndex] = { taskId, x, y };
      } else {
        updatedLayout.push({ taskId, x, y });
      }

      const updatedPlan = {
        ...dayPlan,
        layout: updatedLayout,
        updatedAt: new Date().toISOString(),
      };

      setDayPlan(updatedPlan);
      await DayPlanService.saveDayPlan(updatedPlan);
    },
    [dayPlan]
  );

  // Handle link creation - always link from earlier task to later task
  const handleLinkCreate = useCallback(
    async (fromTaskId: string, toTaskId: string, sourceHandle?: string, targetHandle?: string) => {
      if (!dayPlan) return;

      // Find the tasks to check their due times
      const fromTask = tasks.find(t => t.id === fromTaskId);
      const toTask = tasks.find(t => t.id === toTaskId);

      // Determine correct direction based on due times
      let actualFromId = fromTaskId;
      let actualToId = toTaskId;
      let actualSourceHandle = sourceHandle;
      let actualTargetHandle = targetHandle;

      if (fromTask?.dueDate && toTask?.dueDate) {
        const fromTime = new Date(fromTask.dueDate).getTime();
        const toTime = new Date(toTask.dueDate).getTime();

        // If the "from" task is actually later, swap the direction
        if (fromTime > toTime) {
          actualFromId = toTaskId;
          actualToId = fromTaskId;
          // Swap handles as well
          actualSourceHandle = targetHandle;
          actualTargetHandle = sourceHandle;
        }
      }

      // Check if this link already exists
      const linkExists = dayPlan.links.some(
        l => (l.fromTaskId === actualFromId && l.toTaskId === actualToId) ||
             (l.fromTaskId === actualToId && l.toTaskId === actualFromId)
      );

      if (linkExists) {
        return; // Don't create duplicate links
      }

      const newLink: TaskLink = {
        id: crypto.randomUUID(),
        fromTaskId: actualFromId,
        toTaskId: actualToId,
        linkType: 'flow',
        sourceHandle: actualSourceHandle,
        targetHandle: actualTargetHandle,
      };

      const updatedPlan = {
        ...dayPlan,
        links: [...dayPlan.links, newLink],
        updatedAt: new Date().toISOString(),
      };

      setDayPlan(updatedPlan);
      await DayPlanService.saveDayPlan(updatedPlan);
    },
    [dayPlan, tasks]
  );

  // Handle link deletion
  const handleLinkDelete = useCallback(
    async (linkId: string) => {
      if (!dayPlan) return;

      const updatedPlan = {
        ...dayPlan,
        links: dayPlan.links.filter((l) => l.id !== linkId),
        updatedAt: new Date().toISOString(),
      };

      setDayPlan(updatedPlan);
      await DayPlanService.saveDayPlan(updatedPlan);
    },
    [dayPlan]
  );

  // Handle task click
  const handleTaskClick = useCallback(
    (task: Task) => {
      onEditTask(task);
    },
    [onEditTask]
  );

  // Handle adding a task between two linked tasks
  const handleAddTaskBetween = useCallback(
    (sourceTaskId: string, targetTaskId: string) => {
      const sourceTask = tasks.find(t => t.id === sourceTaskId);
      const targetTask = tasks.find(t => t.id === targetTaskId);
      
      if (!sourceTask || !targetTask) return;
      
      // Calculate the midpoint time between source end and target start
      let newTaskDate: Date | undefined;
      
      if (sourceTask.dueDate && targetTask.dueDate) {
        const sourceStart = new Date(sourceTask.dueDate).getTime();
        const sourceDuration = (sourceTask.duration || 30) * 60 * 1000;
        const sourceEnd = sourceStart + sourceDuration;
        const targetStart = new Date(targetTask.dueDate).getTime();
        
        // Put new task at the midpoint between source end and target start
        const midpoint = sourceEnd + (targetStart - sourceEnd) / 2;
        newTaskDate = new Date(midpoint);
      } else {
        // Default to current date if no times available
        newTaskDate = currentDate;
      }
      
      // Open the create task modal with the calculated date
      onCreateTask(newTaskDate);
    },
    [tasks, currentDate, onCreateTask]
  );

  // Handle creating a task from a node handle
  const handleCreateFromHandle = useCallback(
    (taskId: string, position: 'top' | 'bottom' | 'left' | 'right') => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      let newTaskDate: Date;
      
      if (task.dueDate) {
        const taskStart = new Date(task.dueDate);
        const taskDuration = (task.duration || 30) * 60 * 1000;
        
        // For bottom/right handles, create task AFTER this one
        // For top/left handles, create task BEFORE this one
        if (position === 'bottom' || position === 'right') {
          // New task starts after current task ends
          newTaskDate = new Date(taskStart.getTime() + taskDuration);
        } else {
          // New task ends when current task starts (30 min before by default)
          newTaskDate = new Date(taskStart.getTime() - 30 * 60 * 1000);
        }
      } else {
        newTaskDate = currentDate;
      }
      
      onCreateTask(newTaskDate);
    },
    [tasks, currentDate, onCreateTask]
  );

  // Auto-arrange algorithm - arrange by start time
  const handleAutoArrange = useCallback(async () => {
    if (!dayPlan || planTasks.length === 0) return;

    const GRID_SIZE = 320;
    const COLUMNS = 3;

    // Sort tasks by due time (start time)
    const sortedTasks = [...planTasks].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const newLayout: TaskLayout[] = sortedTasks.map((task, index) => ({
      taskId: task.id,
      x: (index % COLUMNS) * GRID_SIZE + 50,
      y: Math.floor(index / COLUMNS) * 200 + 50,
    }));

    const updatedPlan = {
      ...dayPlan,
      layout: newLayout,
      updatedAt: new Date().toISOString(),
    };

    setDayPlan(updatedPlan);
    await DayPlanService.saveDayPlan(updatedPlan);
  }, [dayPlan, planTasks]);

  // Auto-link tasks based on their due times
  const handleAutoLink = useCallback(async () => {
    if (!dayPlan || planTasks.length < 2) return;

    // Filter tasks with due dates and sort by due time
    const tasksWithTime = planTasks
      .filter(t => t.dueDate)
      .map(t => ({
        task: t,
        dueTime: new Date(t.dueDate!).getTime(),
        endTime: new Date(t.dueDate!).getTime() + (t.duration || 30) * 60 * 1000,
      }))
      .sort((a, b) => a.dueTime - b.dueTime);

    if (tasksWithTime.length < 2) {
      alert('Need at least 2 tasks with due times to auto-link.');
      return;
    }

    // Create links from each task to the next one in chronological order
    const newLinks: TaskLink[] = [];
    for (let i = 0; i < tasksWithTime.length - 1; i++) {
      const currentTask = tasksWithTime[i];
      const nextTask = tasksWithTime[i + 1];

      // Check if link already exists
      const linkExists = dayPlan.links.some(
        l => l.fromTaskId === currentTask.task.id && l.toTaskId === nextTask.task.id
      );

      if (!linkExists) {
        newLinks.push({
          id: crypto.randomUUID(),
          fromTaskId: currentTask.task.id,
          toTaskId: nextTask.task.id,
          linkType: 'flow',
        });
      }
    }

    if (newLinks.length === 0) {
      alert('All tasks are already linked in order!');
      return;
    }

    const updatedPlan = {
      ...dayPlan,
      links: [...dayPlan.links, ...newLinks],
      updatedAt: new Date().toISOString(),
    };

    setDayPlan(updatedPlan);
    await DayPlanService.saveDayPlan(updatedPlan);
    alert(`Created ${newLinks.length} automatic link(s) based on task times!`);
  }, [dayPlan, planTasks]);

  // Handle clone day
  const handleCloneDay = useCallback(
    async (targetDate: Date, adjustTime: boolean, timeOffsetMinutes: number) => {
      if (!dayPlan) return;

      const targetDateStr = format(targetDate, 'yyyy-MM-dd');

      // Call service to clone plan structure first
      const clonedPlans = await DayPlanService.cloneDayPlan(dayPlan.id, [targetDateStr]);
      const clonedPlan = clonedPlans[0];

      if (clonedPlan) {
        // Clone tasks
        const idMap = new Map<string, string>(); // Old Task ID -> New Task ID

        // Determine which tasks to clone (all or selected)
        const tasksToClone =
          selectedTasks.length > 0
            ? planTasks.filter((t) => selectedTasks.includes(t.id))
            : planTasks;

        // Create new tasks for the target day
        for (const task of tasksToClone) {
          // Calculate new due date (keep time if exists)
          let newDueDate = targetDate;
          if (task.dueDate) {
            const oldDate = new Date(task.dueDate);
            newDueDate = new Date(targetDate);
            newDueDate.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);

            if (adjustTime && timeOffsetMinutes !== 0) {
              newDueDate = new Date(newDueDate.getTime() + timeOffsetMinutes * 60000);
            }
          }

          // Prepare new task payload
          const newTaskPayload: any = {
            ...task,
            id: undefined, // Let service generate
            createdAt: undefined,
            updatedAt: undefined,
            dueDate: newDueDate.toISOString(),
            status: 'TODO', // Reset status
            // Ensure we don't carry over specific completion data if any
          };

          try {
            const createdTask = await createTask(newTaskPayload);
            if (createdTask) {
              idMap.set(task.id, createdTask.id);
            }
          } catch (error) {
            logger.error(`Failed to clone task ${task.id}`, error);
          }
        }

        // Update cloned plan with new Task IDs
        clonedPlan.taskIds = Array.from(idMap.values());

        // Remap link IDs
        clonedPlan.links = clonedPlan.links
          .filter((link) => idMap.has(link.fromTaskId) && idMap.has(link.toTaskId))
          .map((link) => ({
            ...link,
            id: crypto.randomUUID(),
            fromTaskId: idMap.get(link.fromTaskId)!,
            toTaskId: idMap.get(link.toTaskId)!,
          }));

        // Remap layout IDs
        clonedPlan.layout = clonedPlan.layout
          .filter((item) => idMap.has(item.taskId))
          .map((item) => ({
            ...item,
            taskId: idMap.get(item.taskId)!,
          }));

        // Save updated plan
        await DayPlanService.saveDayPlan(clonedPlan);

        alert(`Day plan cloned to ${targetDateStr} with ${clonedPlan.taskIds.length} tasks!`);
        setCurrentDate(targetDate);
      }
    },
    [dayPlan]
  );

  // Handle save template
  const handleSaveTemplate = useCallback(
    (name: string, description: string) => {
      if (!dayPlan || planTasks.length === 0) return;

      // Create a mapping of original IDs to temporary template IDs if needed
      // For now, we'll store the tasks with their current IDs in the template
      // so we can map them back when applying.
      // The service strips sensitive fields but we need to ensure we keep enough info to reconstruct.

      // We pass the tasks as they are. The service will strip 'id' from the top level type,
      // but we might want to store the original ID as a 'sourceId' property if we modify the service.
      // However, looking at the service, it takes Omit<Task, 'id'>.
      // We need to verify if we can match tasks by index or if we need to modify the service.

      // Actually, looking at handleCloneDay, we map by ID.
      // If the template stores layout with IDs, but tasks without IDs, we have a problem.
      // We should modify the service or just pass the ID as a custom property 'templateRefId' inside the task object if possible,
      // or rely on the service to store it.

      // Let's rely on a modified service approach or just send them as is and let the service handle it.
      // Ideally, we should update dayPlanService to allow storing an identifier.
      // For this implementation, let's assume we update the service or use a workaround.
      // Workaround: We will modify DayPlanService.saveAsTemplate to allow keeping the ID in a '_tempId' field.

      const tasksForTemplate = planTasks.map((t) => ({
        ...t,
        _tempId: t.id, // Store original ID to map layout/links later
      }));

      DayPlanService.saveAsTemplate(dayPlan, tasksForTemplate, name, description);
      alert('Template saved successfully!');
    },
    [dayPlan, planTasks]
  );

  // Handle apply template
  const handleApplyTemplate = useCallback(
    async (template: DayPlanTemplate) => {
      if (dayPlan && planTasks.length > 0) {
        if (!confirm('This will append template tasks to your current plan. Continue?')) {
          return;
        }
      }

      const idMap = new Map<string, string>(); // Template Task ID -> New Task ID

      // Create new tasks from template
      for (const templateTask of template.tasks) {
        // Logic to recreate task
        const newTaskPayload: any = {
          ...templateTask,
          title: templateTask.title, // Ensure specific fields are explicitly set if needed
          dueDate:
            format(currentDate, 'yyyy-MM-dd') +
            (templateTask.dueDate ? 'T' + templateTask.dueDate.split('T')[1] : 'T09:00:00'), // Keep time or default
          status: 'TODO',
          createdAt: undefined,
          updatedAt: undefined,
          id: undefined,
          _tempId: undefined, // Remove our temp prop
        };

        try {
          const createdTask = await createTask(newTaskPayload);
          if (createdTask) {
            // Map the _tempId (source ID) to the new real ID
          // @ts-expect-error _tempId is a temporary property added during template creation
          const sourceId = templateTask._tempId || templateTask.id; // Fallback if id leaked
            if (sourceId) {
              idMap.set(sourceId, createdTask.id);
            }
          }
        } catch (error) {
          logger.error('Failed to create task from template', error);
        }
      }

      // Now call applyTemplate service but we need to intercept it because
      // the service's applyTemplate just creates a blank plan with unmapped IDs.
      // We actually want to merge into current plan or properly reconstruct using our map.

      // Let's do it manually here for "Expert" control similar to clone.

      const newLinks = template.links
        .filter((link) => idMap.has(link.fromTaskId) && idMap.has(link.toTaskId))
        .map((link) => ({
          id: crypto.randomUUID(),
          fromTaskId: idMap.get(link.fromTaskId)!,
          toTaskId: idMap.get(link.toTaskId)!,
          linkType: link.linkType,
        }));

      const newLayout = template.layout
        .filter((item) => idMap.has((item as any).taskId))
        .map((item) => ({
          taskId: idMap.get((item as any).taskId)!,
          x: item.x,
          y: item.y,
        }));

      // Update current plan
      if (dayPlan) {
        const updatedPlan = {
          ...dayPlan,
          taskIds: [...dayPlan.taskIds, ...Array.from(idMap.values())],
          links: [...dayPlan.links, ...newLinks],
          layout: [...dayPlan.layout, ...newLayout],
          updatedAt: new Date().toISOString(),
        };
        setDayPlan(updatedPlan);
        await DayPlanService.saveDayPlan(updatedPlan);
      } else {
        // Should exist due to useEffect, but just in case
        const newPlan: DayPlan = {
          id: crypto.randomUUID(),
          userId: 'current-user',
          date: dateKey,
          taskIds: Array.from(idMap.values()),
          links: newLinks,
          layout: newLayout,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setDayPlan(newPlan);
        await DayPlanService.saveDayPlan(newPlan);
      }

      setIsTemplatesModalOpen(false);
      alert('Template applied successfully!');
    }, [dayPlan, planTasks, currentDate, createTask, dateKey]
  );

  // Handle save recurring rule
  const handleSaveRecurring = useCallback(async (config: RecurrenceConfig) => {
    if (!dayPlan || planTasks.length === 0) {
      alert('Plan is empty. Add tasks before setting a recurring rule.');
      return;
    }
    
    // We need to create a "Template" from the current plan to be the recurring source
    // Similar to saveAsTemplate but internal
    const tasksForTemplate = planTasks.map(t => ({
      ...t,
      _tempId: t.id
    }));

     const templateName = `Recurring Rule - ${config.frequency}`;
     const template = await DayPlanService.saveAsTemplate(
       dayPlan, 
       tasksForTemplate, 
       templateName, 
       'Auto-generated for recurring rule'
     );

     DayPlanService.saveRecurringRule(template, config, 'current-user');
     alert(`Recurring rule set: ${config.frequency}!`);
  }, [dayPlan, planTasks]);

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/5 pb-4 lg:pb-6">
        {/* Date Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3 lg:mb-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={goToPreviousDay}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-colors touch-target"
              aria-label="Previous day"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="text-center min-w-0">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
                {format(currentDate, 'EEE, MMM d, yyyy')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {planTasks.length} tasks in plan
              </p>
            </div>

            <button
              onClick={goToNextDay}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-colors touch-target"
              aria-label="Next day"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <Button variant="secondary" size="sm" onClick={goToToday} className="flex-shrink-0">
            <Calendar size={16} />
            <span className="hidden xs:inline">Today</span>
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <Button variant="primary" size="sm" onClick={() => onCreateTask(currentDate)}>
            <Plus size={16} />
            <span className="hidden xs:inline">Add Task</span>
          </Button>

          {/* Mobile Task Panel Toggle */}
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => setIsMobileTaskPanelOpen(!isMobileTaskPanelOpen)}
            className="lg:hidden"
          >
            <Calendar size={16} />
            <span className="hidden sm:inline">Tasks ({unusedTasks.length})</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={() => setIsCloneModalOpen(true)} aria-label="Clone Plan">
            <Copy size={16} />
            <span className="hidden md:inline">Clone</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={() => setIsTemplatesModalOpen(true)} aria-label="Load Templates">
            <Download size={16} />
            <span className="hidden lg:inline">Templates</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={() => setIsSaveTemplateModalOpen(true)} aria-label="Save Template">
            <Save size={16} />
            <span className="hidden lg:inline">Save</span>
          </Button>

      <Button variant="secondary" size="sm" onClick={() => setIsRecurringModalOpen(true)} aria-label="Recurring Plan">
            <RefreshCw size={16} />
            <span className="hidden md:inline">Recurring</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={handleAutoArrange} className="hidden sm:flex">
            <LayoutIcon size={16} />
            <span className="hidden xl:inline">Arrange</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={handleAutoLink} title="Auto-link tasks by time" className="hidden sm:flex">
            <Link2 size={16} />
            <span className="hidden xl:inline">Auto-Link</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={() => setIsFullscreen(true)} title="Fullscreen mode" className="hidden md:flex">
            <Maximize2 size={16} />
            <span className="hidden xl:inline">Fullscreen</span>
          </Button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearLinks}
            className="text-amber-500 hover:text-amber-600"
            title="Clear all links"
          >
            <Unlink size={16} />
            <span className="hidden sm:inline">Clear Links</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearPlan}
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-6 pt-4 lg:pt-6 overflow-hidden">
        {/* Flowchart Canvas */}
        <div
          className="flex-1 min-w-0 min-h-[300px] lg:min-h-0 flex flex-col bg-white dark:bg-slate-900 rounded-xl lg:rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden"
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
        >
          <div className="p-4 border-b border-slate-200 dark:border-white/5 flex-shrink-0">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Day Flowchart</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Drag tasks to create your daily flow • Click a link and press Delete to remove it
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <ReactFlowProvider>
              <FlowchartCanvas
                tasks={planTasks}
                links={dayPlan?.links || []}
                layout={dayPlan?.layout || []}
                onTaskMove={handleTaskMove}
                onLinkCreate={handleLinkCreate}
                onLinkDelete={handleLinkDelete}
                onTaskClick={handleTaskClick}
                onAutoArrange={handleAutoArrange}
                onSelectionChange={setSelectedTasks}
                onAddTaskBetween={handleAddTaskBetween}
                onCreateFromHandle={handleCreateFromHandle}
              />
            </ReactFlowProvider>
          </div>
        </div>

        {/* Unused Tasks Sidebar - Hidden on mobile, visible on lg+ */}
        <div className="hidden lg:flex w-64 xl:w-72 min-h-[400px] flex-shrink-0 flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5">
          <div className="p-4 border-b border-slate-200 dark:border-white/5">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Available Tasks</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {unusedTasks.length} tasks not in plan
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {unusedTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                All tasks are in the plan
              </div>
            ) : (
              unusedTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  className="p-3 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5 hover:border-brand-500/30 cursor-move transition-all hover:shadow-md"
                >
                  <div className="font-medium text-sm text-slate-800 dark:text-slate-100">
                    {task.title}
                  </div>
                  {task.dueDate && (
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Calendar size={10} />
                      {formatTime(task.dueDate)}
                    </div>
                  )}
                  {task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.tags.slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mobile Task Panel Overlay */}
        {isMobileTaskPanelOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
              onClick={() => setIsMobileTaskPanelOpen(false)}
            />
            {/* Slide-in Panel */}
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-white/5 flex flex-col animate-slide-in-right">
              <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Available Tasks</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {unusedTasks.length} tasks not in plan
                  </p>
                </div>
                <button
                  onClick={() => setIsMobileTaskPanelOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  aria-label="Close task panel"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 scroll-touch">
                {unusedTasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    All tasks are in the plan
                  </div>
                ) : (
                  unusedTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      onClick={() => {
                        onEditTask(task);
                        setIsMobileTaskPanelOpen(false);
                      }}
                      className="p-3 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5 hover:border-brand-500/30 cursor-pointer transition-all hover:shadow-md active:scale-98"
                    >
                      <div className="font-medium text-sm text-slate-800 dark:text-slate-100">
                        {task.title}
                      </div>
                      {task.dueDate && (
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar size={10} />
                          {formatTime(task.dueDate)}
                        </div>
                      )}
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {task.tags.slice(0, 2).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-white/5">
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    onCreateTask(currentDate);
                    setIsMobileTaskPanelOpen(false);
                  }}
                >
                  <Plus size={16} />
                  Add New Task
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Mode Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
          {/* Fullscreen Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h2>
              <span className="text-sm text-slate-400">
                {planTasks.length} tasks in plan
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleAutoArrange}>
                <LayoutIcon size={16} />
                Arrange
              </Button>
              <Button variant="secondary" size="sm" onClick={handleAutoLink}>
                <Link2 size={16} />
                Auto-Link
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearLinks}
                className="text-amber-500 hover:text-amber-600"
              >
                <Unlink size={16} />
                Clear Links
              </Button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Fullscreen Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Flowchart Area */}
            <div 
              className="flex-1 min-w-0"
              onDrop={handleCanvasDrop}
              onDragOver={handleCanvasDragOver}
            >
              <ReactFlowProvider>
                <FlowchartCanvas
                  tasks={planTasks}
                  links={dayPlan?.links || []}
                  layout={dayPlan?.layout || []}
                  onTaskMove={handleTaskMove}
                  onLinkCreate={handleLinkCreate}
                  onLinkDelete={handleLinkDelete}
                  onTaskClick={handleTaskClick}
                  onAutoArrange={handleAutoArrange}
                  onSelectionChange={setSelectedTasks}
                  onAddTaskBetween={handleAddTaskBetween}
                  onCreateFromHandle={handleCreateFromHandle}
                />
              </ReactFlowProvider>
            </div>
            
            {/* Collapsible Task Panel */}
            <div className={`flex flex-col transition-all duration-300 ${isTaskPanelOpen ? 'w-80' : 'w-12'}`}>
              {/* Panel Toggle */}
              <button
                onClick={() => setIsTaskPanelOpen(!isTaskPanelOpen)}
                className="flex items-center justify-center gap-2 p-3 bg-slate-800 border-b border-white/10 text-white hover:bg-slate-700 transition-colors"
              >
                {isTaskPanelOpen ? (
                  <>
                    <ChevronRight size={16} />
                    <span className="text-sm font-medium">Hide Tasks</span>
                  </>
                ) : (
                  <ChevronLeft size={16} />
                )}
              </button>
              
              {/* Task List */}
              {isTaskPanelOpen && (
                <div className="flex-1 overflow-y-auto bg-slate-800/50 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-white mb-3">
                    Available Tasks ({unusedTasks.length})
                  </h3>
                  {unusedTasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      All tasks are in the plan
                    </div>
                  ) : (
                    unusedTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task)}
                        className="p-3 bg-slate-700/50 rounded-xl border border-white/10 hover:border-indigo-500/50 cursor-move transition-all hover:shadow-md"
                      >
                        <div className="font-medium text-sm text-white">
                          {task.title}
                        </div>
                        {task.dueDate && (
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Calendar size={10} />
                            {formatTime(task.dueDate)}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CloneDayModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onClone={handleCloneDay}
        sourceDate={currentDate}
        taskCount={planTasks.length}
        selectedTaskCount={selectedTasks.length}
      />

      <SaveTemplateModal
        isOpen={isSaveTemplateModalOpen}
        onClose={() => setIsSaveTemplateModalOpen(false)}
        onSave={handleSaveTemplate}
      />

      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onApply={handleApplyTemplate}
      />

      <RecurringPlanModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        onSave={handleSaveRecurring}
      />
    </div>
  );
};

export default React.memo(DayPlannerPage);
