import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva';
import { simplifyShape, snapToShape } from './RecognizeShapes';

const DrawingCanvas = () => {
  const [lines, setLines] = useState([]); // Stores all drawn shapes/lines
  const [isDrawing, setIsDrawing] = useState(false); // Tracks drawing state
  const stageRef = useRef(null);
  

  // Add event listener for keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if 'Ctrl' or 'Cmd' key is pressed along with 'Z'
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault(); // Prevent default behavior (e.g., undo in the browser)
        if (lines.length > 0) {
          // Remove the last shape from the state
          setLines((prevLines) => prevLines.slice(0, -1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lines]);

  const handleMouseDown = (e) => {
    setIsDrawing(true);

    // Get the pointer position and start a new line
    const pos = stageRef.current.getPointerPosition();

    if (pos) {
      setLines([...lines, { points: [pos.x, pos.y], type: 'freehand' }]);
    } else {
      console.warn('Pointer position is invalid during mouse down.');
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const pos = stageRef.current.getPointerPosition();

    if (pos) {
      const updatedLines = [...lines];
      const lastLine = updatedLines[updatedLines.length - 1];

      if (lastLine) {
        // Append new points to the last line
        lastLine.points = [...lastLine.points, pos.x, pos.y];
        setLines(updatedLines);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);

    // Simplify and recognize the last drawn shape
    const lastLine = lines[lines.length - 1];

    if (lastLine) {
      const shapepoints = lastLine.points;

      if (shapepoints.length > 0) {
        const snappedShape = snapToShape(shapepoints);

        if (snappedShape) {
          // Replace the raw line with the snapped shape
          const updatedLines = lines.slice(0, -1).concat(snappedShape);
          setLines(updatedLines);
        } else {
          console.warn('Snapped shape is invalid.');
        }
      } else {
        console.warn('Simplified points are invalid.');
      }
    } else {
      console.warn('No line data available on mouse up.');
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', margin: '20px', width: '800px', height: '600px' }}>
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
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};

export default DrawingCanvas;
