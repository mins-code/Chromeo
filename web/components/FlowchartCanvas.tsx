import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  Connection,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Task, TaskLink } from '../types';
import TaskNode from './TaskNode';
import DeletableEdge from './DeletableEdge';

interface FlowchartCanvasProps {
  tasks: Task[];
  links: TaskLink[];
  layout: { taskId: string; x: number; y: number }[];
  onTaskMove: (taskId: string, x: number, y: number) => void;
  onLinkCreate: (fromTaskId: string, toTaskId: string, sourceHandle?: string, targetHandle?: string) => void;
  onLinkDelete: (linkId: string) => void;
  onTaskClick: (task: Task) => void;
  onAutoArrange?: () => void;
  onSelectionChange?: (selectedTaskIds: string[]) => void;
  onAddTaskBetween?: (sourceTaskId: string, targetTaskId: string) => void;
}

const nodeTypes = {
  taskNode: TaskNode,
};

const edgeTypes = {
  deletable: DeletableEdge,
};

const FlowchartCanvas: React.FC<FlowchartCanvasProps> = ({
  tasks,
  links,
  layout,
  onTaskMove,
  onLinkCreate,
  onLinkDelete,
  onTaskClick,
  onAutoArrange,
  onSelectionChange,
  onAddTaskBetween,
}) => {
  // Handle selection change
  const handleSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    if (onSelectionChange) {
      onSelectionChange(nodes.map(node => node.id));
    }
  }, [onSelectionChange]);
  
  // Convert tasks to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return tasks.map(task => {
      const position = layout.find(l => l.taskId === task.id);
      return {
        id: task.id,
        type: 'taskNode',
        position: position ? { x: position.x, y: position.y } : { x: Math.random() * 500, y: Math.random() * 500 },
        data: { task, onClick: () => onTaskClick(task) },
      };
    });
  }, [tasks, layout, onTaskClick]);

  // Convert links to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    return links.map(link => {
      // Find the source and target tasks to calculate time gap
      const sourceTask = tasks.find(t => t.id === link.fromTaskId);
      const targetTask = tasks.find(t => t.id === link.toTaskId);
      
      let timeGap: number | null = null;
      
      if (sourceTask?.dueDate && targetTask?.dueDate) {
        const sourceStart = new Date(sourceTask.dueDate).getTime();
        const sourceDuration = (sourceTask.duration || 30) * 60 * 1000; // Convert minutes to ms
        const sourceEnd = sourceStart + sourceDuration;
        const targetStart = new Date(targetTask.dueDate).getTime();
        
        // Time gap in minutes (can be negative if tasks overlap)
        timeGap = Math.round((targetStart - sourceEnd) / (60 * 1000));
      }

      return {
        id: link.id,
        source: link.fromTaskId,
        target: link.toTaskId,
        sourceHandle: link.sourceHandle || 'bottom',
        targetHandle: link.targetHandle || 'top',
        animated: link.linkType === 'flow',
        deletable: true,
        selectable: true,
        type: 'deletable',
        data: {
          onDelete: onLinkDelete,
          onAddTask: onAddTaskBetween,
          timeGap,
        },
        style: {
          stroke: link.linkType === 'flow' ? '#6366f1' : '#ef4444',
          strokeWidth: 3,
          cursor: 'pointer',
        },
        markerEnd: {
          type: 'arrowclosed' as const,
          color: link.linkType === 'flow' ? '#6366f1' : '#ef4444',
        },
      };
    });
  }, [links, onLinkDelete, onAddTaskBetween, tasks]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when tasks or layout change
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Update edges when links change
  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Handle connection creation
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        onLinkCreate(
          connection.source, 
          connection.target,
          connection.sourceHandle || undefined,
          connection.targetHandle || undefined
        );
      }
    },
    [onLinkCreate]
  );

  // Handle node drag end
  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      onTaskMove(node.id, node.position.x, node.position.y);
    },
    [onTaskMove]
  );

  // Handle edge deletion
  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      edgesToDelete.forEach(edge => {
        onLinkDelete(edge.id);
      });
    },
    [onLinkDelete]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={handleSelectionChange}
        onNodeDragStop={onNodeDragStop}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Control"
        edgesUpdatable={true}
        edgesFocusable={true}
        snapToGrid={true}
        snapGrid={[20, 20]}
        defaultEdgeOptions={{
          deletable: true,
          selectable: true,
        }}
        fitView
        fitViewOptions={{
          padding: 0.2,
          maxZoom: 1,
        }}
        proOptions={{ hideAttribution: true }}
        attributionPosition="bottom-left"
        className="bg-slate-50 dark:bg-black/20"
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={16} 
          size={1}
          className="bg-slate-50 dark:bg-black/20"
        />
        <Controls 
          className="!bg-white/80 dark:!bg-slate-800/90 !border !border-slate-200/50 dark:!border-white/10 !rounded-xl !shadow-xl backdrop-blur-sm [&>button]:!bg-transparent [&>button]:!border-none [&>button]:!text-slate-600 dark:[&>button]:!text-slate-300 [&>button:hover]:!bg-slate-100 dark:[&>button:hover]:!bg-slate-700 [&>button]:!rounded-lg [&>button]:!m-1 [&>button>svg]:!fill-current"
          showInteractive={false}
        />
        <MiniMap 
          className="!bg-white/80 dark:!bg-slate-800/90 !border !border-slate-200/50 dark:!border-white/10 !rounded-xl !shadow-xl backdrop-blur-sm"
          nodeColor={(node) => {
            const task = tasks.find(t => t.id === node.id);
            if (!task) return '#94a3b8';
            switch (task.priority) {
              case 'HIGH': return '#ef4444';
              case 'MEDIUM': return '#f59e0b';
              case 'LOW': return '#10b981';
              default: return '#94a3b8';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.2)"
          nodeBorderRadius={8}
        />
        
        {/* Instructions Panel */}
        {tasks.length === 0 && (
          <Panel position="top-center" className="pointer-events-none">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-6 py-4 rounded-xl shadow-lg border border-slate-200 dark:border-white/10">
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                Drag tasks from the sidebar to create your daily flow
              </p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};

export default FlowchartCanvas;
