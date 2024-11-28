import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva';
import { snapToShape } from './RecognizeShapes';

const DrawingCanvas = () => {
  const [lines, setLines] = useState([]); // Stores all drawn shapes/lines
  const [isDrawing, setIsDrawing] = useState(false); // Tracks drawing state
  const [selectedShapeIndex, setSelectedShapeIndex] = useState(null); // Index of the selected shape
  const [buttonPositions, setButtonPositions] = useState({}); // Tracks button positions for shapes
  const [draggingIndex, setDraggingIndex] = useState(null); // Tracks which shape is being dragged
  const stageRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (lines.length > 0) {
          setLines((prevLines) => prevLines.slice(0, -1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lines]);

  const handleMouseDown = (e) => {
    if (draggingIndex !== null) return; // Ignore if dragging
    setIsDrawing(true);
    setSelectedShapeIndex(null); // Deselect any selected shape
    const pos = stageRef.current.getPointerPosition();
    if (pos) {
      setLines([...lines, { points: [pos.x, pos.y], type: 'freehand' }]);
    }
  };
  

  const handleMouseMove = (e) => {
    // Only run if drawing and not dragging a shape
    if (!isDrawing || draggingIndex !== null) return;
  
    const pos = stageRef.current.getPointerPosition();
    if (pos) {
      const updatedLines = [...lines];
      const lastLine = updatedLines[updatedLines.length - 1];
      if (lastLine) {
        lastLine.points = [...lastLine.points, pos.x, pos.y];
        setLines(updatedLines);
      }
    }
  };
  
  

  const handleMouseUp = () => {
    if (draggingIndex !== null) {
      setDraggingIndex(null); // Stop dragging
      return;
    }
  
    setIsDrawing(false);
  
    const lastLine = lines[lines.length - 1];
    if (lastLine) {
      const shapepoints = lastLine.points;
      if (shapepoints.length > 0) {
        const snappedShape = snapToShape(shapepoints);
        if (snappedShape) {
          const updatedLines = lines.slice(0, -1).concat(snappedShape);
          setLines(updatedLines);
        }
      }
    }
  };

  const handleShapeClick = (index, e) => {
    if (draggingIndex !== null) return; // Ignore clicks during dragging
    setSelectedShapeIndex(index);

    // Store the button position for the shape if not already set
    setButtonPositions((prevPositions) => {
      if (!(index in prevPositions)) {
        const shape = lines[index];
        const defaultX =
          shape.type === 'circle' ? shape.centerX + 20 : shape.x + 100;
        const defaultY = shape.type === 'circle' ? shape.centerY - 10 : shape.y;

        return {
          ...prevPositions,
          [index]: { x: defaultX, y: defaultY },
        };
      }
      return prevPositions;
    });
  };

  const handleDragStart = (index) => {
    setDraggingIndex(index);
    setIsDrawing(false); // Stop drawing when dragging starts
  };
  

  const handleDragMove = (index, e) => {
    // When dragging, prevent the mouse move logic for drawing
    if (draggingIndex !== index) return; 
  
    const { x, y } = e.target.attrs;
    setLines((prevLines) => {
      const updatedLines = [...prevLines];
      const shape = updatedLines[index];
  
      if (shape.type === 'circle') {
        shape.centerX = x;
        shape.centerY = y;
      } else if (shape.type === 'rectangle') {
        shape.x = x;
        shape.y = y;
      }
      return updatedLines;
    });
  };
  

  const handleDragEnd = () => {
    setDraggingIndex(null);
  };

  const handleToggleShape = () => {
    if (selectedShapeIndex !== null) {
      setLines((prevLines) => {
        const updatedLines = [...prevLines];
        const currentShape = updatedLines[selectedShapeIndex];
        if (currentShape.type === 'rectangle') {
          const { x, y, width, height } = currentShape;
          const centerX = x + width / 2;
          const centerY = y + height / 2;
          const radius = Math.min(width, height) / 2;
          updatedLines[selectedShapeIndex] = {
            type: 'circle',
            centerX,
            centerY,
            radius,
          };
        } else if (currentShape.type === 'circle') {
          const { centerX, centerY, radius } = currentShape;
          const x = centerX - radius;
          const y = centerY - radius;
          const width = radius * 2;
          const height = radius * 2;
          updatedLines[selectedShapeIndex] = {
            type: 'rectangle',
            x,
            y,
            width,
            height,
          };
        }
        return updatedLines;
      });
    }
  };

  return (
    <div style={{ position: 'relative', margin: '20px', width: '800px', height: '600px' }}>
      <Stage
        width={800}
        height={600}
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          {lines.map((line, i) => {
            if (line.type === 'rectangle') {
              return (
                <Rect
                  key={i}
                  x={line.x}
                  y={line.y}
                  width={line.width}
                  height={line.height}
                  stroke="black"
                  strokeWidth={2}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragMove={(e) => handleDragMove(i, e)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => handleShapeClick(i, e)}
                />
              );
            }

            if (line.type === 'circle') {
              return (
                <Circle
                  key={i}
                  x={line.centerX}
                  y={line.centerY}
                  radius={line.radius}
                  stroke="black"
                  strokeWidth={2}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragMove={(e) => handleDragMove(i, e)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => handleShapeClick(i, e)}
                />
              );
            }

            return (
              <Line
                key={i}
                points={line.points}
                stroke="black"
                strokeWidth={2}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                onClick={(e) => handleShapeClick(i, e)}
              />
            );
          })}
        </Layer>
      </Stage>
      {selectedShapeIndex !== null && buttonPositions[selectedShapeIndex] && (
        <button
          style={{
            position: 'absolute',
            top: buttonPositions[selectedShapeIndex].y,
            left: buttonPositions[selectedShapeIndex].x,
          }}
          onClick={handleToggleShape}
        >
          Toggle Shape
        </button>
      )}
    </div>
  );
};

export default DrawingCanvas;
