import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Ellipse, Text } from 'react-konva';
import { snapToShape } from './RecognizeShapes';

const DrawingCanvas = () => {
  const [lines, setLines] = useState([]); // Stores all drawn shapes/lines
  const [isDrawing, setIsDrawing] = useState(false); // Tracks drawing state
  const [selectedShapeIndex, setSelectedShapeIndex] = useState(null); // Index of the selected shape
  const [buttonPositions, setButtonPositions] = useState({}); // Tracks button positions for shapes
  const [draggingIndex, setDraggingIndex] = useState(null); // Tracks which shape is being dragged
  const stageRef = useRef(null);
  const [shiftPressed, setShiftPressed] = useState(false);

  const [textBoxes, setTextBoxes] = useState({}); // Maps shape index to text content
  const [editingText, setEditingText] = useState(null); // Index of shape being edited

  const handleDblClick = (e, index) => {
    if (!lines[index]) return;

    // Calculate center of the shape
    const shape = lines[index];
    let centerX, centerY;

    if (shape.type === 'rectangle' || shape.type === 'ellipse') {
      centerX = shape.x + shape.width / 2;
      centerY = shape.y + shape.height / 2;
    } else {
      // For freehand/other shapes, calculate center from points
      const points = shape.points;
      const xPoints = points.filter((_, i) => i % 2 === 0);
      const yPoints = points.filter((_, i) => i % 2 === 1);
      centerX = (Math.min(...xPoints) + Math.max(...xPoints)) / 2;
      centerY = (Math.min(...yPoints) + Math.max(...yPoints)) / 2;
    }

    // Create or focus existing text input
    setEditingText(index);
    setTextBoxes(prev => ({
      ...prev,
      [index]: prev[index] || ''
    }));

    // Create HTML input element
    const textInput = document.createElement('input');
    textInput.style.position = 'absolute';
    textInput.style.left = `${centerX}px`;
    textInput.style.top = `${centerY}px`;
    textInput.style.transform = 'translate(-50%, -50%)';
    textInput.value = textBoxes[index] || '';
    textInput.style.zIndex = '1000';

    const handleBlur = () => {
      const newText = textInput.value;
      setTextBoxes(prev => ({
        ...prev,
        [index]: newText
      }));
      setEditingText(null);
      textInput.remove();
    };

    textInput.addEventListener('blur', handleBlur);
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        textInput.blur();
      }
    });

    document.body.appendChild(textInput);
    textInput.focus();
  };
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (lines.length > 0) {
          setLines((prevLines) => prevLines.slice(0, -1));
        }
      } else if (e.key === 'Shift') {
        setShiftPressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        setShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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
      setDraggingIndex(null);
      return;
    }
  
    setIsDrawing(false);
  
    if (lines.length === 0) return;
  
    const lastLine = lines[lines.length - 1];
    if (lastLine && lastLine.points.length > 0) {
      const snappedShape = snapToShape(lastLine.points, shiftPressed);
      if (snappedShape) {
        setLines([...lines.slice(0, -1), snappedShape]);
      }
    }
  };
  
  

  const handleShapeClick = (index, e) => {
    if (draggingIndex !== null) return; // Ignore clicks during dragging
  
    const shape = lines[index];
  
    // Calculate the center of the shape
    let shapeCenterX = 0;
    let shapeCenterY = 0;
    if (shape.type === 'rectangle') {
      shapeCenterX = shape.x + shape.width / 2;
      shapeCenterY = shape.y + shape.height / 2;
    } else if (shape.type === 'oval') {
      shapeCenterX = shape.centerX;
      shapeCenterY = shape.centerY;
    } else if (shape.type === 'circle') {
      shapeCenterX = shape.centerX;
      shapeCenterY = shape.centerY;
    } else if (shape.type === 'square') {
      shapeCenterX = shape.x + shape.sideLength / 2;
      shapeCenterY = shape.y + shape.sideLength / 2;
    }
  
    // Get the click position relative to the stage
    const clickPosition = e.target.getStage().getPointerPosition();
    if (!clickPosition) {
      console.error('Click position is not available');
      return;
    }
  
    console.log(`Shape center: (${shapeCenterX}, ${shapeCenterY})`);
    console.log(`Click position: (${clickPosition.x}, ${clickPosition.y})`);
  
    // Calculate the distance between the click position and the center of the shape
    const distance = Math.sqrt(
      Math.pow(clickPosition.x - shapeCenterX, 2) + Math.pow(clickPosition.y - shapeCenterY, 2)
    );
  
    let threshold;
    if (shape.type === 'rectangle') {
      // For rectangles, use a dynamic threshold based on shape size
      threshold = Math.max(30, Math.min(50, Math.sqrt(shape.width * shape.height) / 4));
    } else if (shape.type === 'oval') { 
      threshold = Math.max(30, Math.min(50, Math.sqrt((shape.width * shape.height) / 2) / 2));
    } else if (shape.type === 'circle') { 
      threshold = Math.max(30, Math.min(50, Math.sqrt((shape.radius*2 * shape.radius*2) / 2) / 2));
    } else if (shape.type === 'square') {
      threshold = Math.max(30, Math.min(50, Math.sqrt(shape.sideLength * shape.sideLength) / 4));
    }
  
    console.log(`Distance: ${distance}, Threshold: ${threshold}`);
  
    // If the click is near the center of the shape, show the buttons
    if (distance < threshold) {
      setSelectedShapeIndex(index);
  
      // Store the button position for the shape if not already set
      setButtonPositions((prevPositions) => {
        if (!(index in prevPositions)) {
          const defaultX = shapeCenterX + 20;
          const defaultY = shapeCenterY - 10;
          return {
            ...prevPositions,
            [index]: { x: defaultX, y: defaultY },
          };
        }
        return prevPositions;
      });
    }
  };
  

  const handleDragStart = (index) => {
    setDraggingIndex(index);
    setIsDrawing(false); // Stop drawing when dragging starts
  };

  const handleDragMove = (index, e) => {
    if (draggingIndex !== index) return;

    const { x, y } = e.target.attrs;
    setLines((prevLines) => {
      const updatedLines = [...prevLines];
      const shape = updatedLines[index];

      if (shape.type === 'oval') {
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
          // Convert rectangle to oval
          const { x, y, width, height } = currentShape;
          const centerX = x + width / 2;
          const centerY = y + height / 2;
          
          updatedLines[selectedShapeIndex] = {
            type: 'oval',
            points: [x, y, x + width, y + height], // The bounding box for the oval
            centerX,
            centerY,
            width,
            height,
          };
          
        } else if (currentShape.type === 'oval') {
          // Convert oval to rectangle
          const { centerX, centerY, width, height } = currentShape;
  
          updatedLines[selectedShapeIndex] = {
            type: 'rectangle',
            x: centerX - width / 2, // Calculate x position
            y: centerY - height / 2, // Calculate y position
            width,
            height,
          };
        } else if (currentShape.type === 'circle'){
          const {centerX, centerY, radius} = currentShape;

          updatedLines[selectedShapeIndex] = {
            type: 'square',
            x: centerX - radius,
            y: centerY - radius,
            sideLength: radius*2
          };

        } else if (currentShape.type === 'square'){
          const {x, y, sideLength} = currentShape;

          updatedLines[selectedShapeIndex] = {
            type: 'circle',
            points: [x, y, x+sideLength, y+sideLength],
            centerX: x + sideLength/2,
            centerY: y + sideLength/2,
            radius: sideLength/2,
          };

        }

        return updatedLines;
      });
    }
  };
    
  

  const handleDeleteShape = () => {
    if (selectedShapeIndex !== null) {
      setLines((prevLines) => {
        return prevLines.filter((_, index) => index !== selectedShapeIndex);
      });
      setSelectedShapeIndex(null); // Deselect after deleting
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
                onDblClick={(e) => handleDblClick(e, i)}
              />
            );
          }

          if (line.type === 'oval') {
            return (
              <Ellipse
                key={i}
                x={line.centerX}
                y={line.centerY}
                radiusX={line.width / 2}
                radiusY={line.height / 2}
                stroke="black"
                strokeWidth={2}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragMove={(e) => handleDragMove(i, e)}
                onDragEnd={handleDragEnd}
                onClick={(e) => handleShapeClick(i, e)}
                onDblClick={(e) => handleDblClick(e, i)}
              />
            );
          }

          // Check if the shape is a circle (width and height are equal)
          if (line.type === 'circle') {
            return (
              <Ellipse
                key={i}
                x={line.centerX}
                y={line.centerY}
                radiusX={line.radius}
                radiusY={line.radius}
                stroke="black"
                strokeWidth={2}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragMove={(e) => handleDragMove(i, e)}
                onDragEnd={handleDragEnd}
                onClick={(e) => handleShapeClick(i, e)}
                onDblClick={(e) => handleDblClick(e, i)}
              />
            );
          }

          // Check if the shape is a square (width and height are equal)
          if (line.type === 'square') {
            return (
              <Rect
                key={i}
                x={line.x}
                y={line.y}
                width={line.sideLength}
                height={line.sideLength} // Ensure width and height are equal for a square
                stroke="black"
                strokeWidth={2}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragMove={(e) => handleDragMove(i, e)}
                onDragEnd={handleDragEnd}
                onClick={(e) => handleShapeClick(i, e)}
                onDblClick={(e) => handleDblClick(e, i)}
              />
            );
          }

          // Default rendering for freehand lines or other types
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
              onDblClick={(e) => handleDblClick(e, i)}
            />
          );
        })}

        {/* Render text boxes */}
        {Object.entries(textBoxes).map(([index, text]) => {
          const shape = lines[index];
          if (!shape) return null;

          let x, y;
          if (shape.type === 'rectangle' || shape.type === 'square') {
            x = shape.x + (shape.width || shape.sideLength) / 2;
            y = shape.y + (shape.height || shape.sideLength) / 2;
          } else if (shape.type === 'oval' || shape.type === 'circle') {
            x = shape.centerX;
            y = shape.centerY;
          } else {
            // For freehand shapes
            const points = shape.points;
            const xPoints = points.filter((_, i) => i % 2 === 0);
            const yPoints = points.filter((_, i) => i % 2 === 1);
            x = (Math.min(...xPoints) + Math.max(...xPoints)) / 2;
            y = (Math.min(...yPoints) + Math.max(...yPoints)) / 2;
          }

          return (
            <Text
              key={`text-${index}`}
              x={x}
              y={y}
              text={text}
              fontSize={16}
              fill="black"
              align="center"
              verticalAlign="middle"
              offsetX={text.length * 4}
              offsetY={8}
            />
          );
        })}

        </Layer>
      </Stage>
      {selectedShapeIndex !== null && buttonPositions[selectedShapeIndex] && (
        <div style={{ position: 'absolute', top: buttonPositions[selectedShapeIndex].y, left: buttonPositions[selectedShapeIndex].x }}>
          <button onClick={handleToggleShape} style={{ display: 'block', marginBottom: '5px' }}>
            Toggle Shape
          </button>
          <button onClick={handleDeleteShape}>
            Delete Shape
          </button>
        </div>
      )}
    </div>
  );
};

export default DrawingCanvas;
