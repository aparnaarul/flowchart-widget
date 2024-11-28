export const snapToShape = (points, shiftKey = false) => {
  console.log('Received points for snapping:', points);

  if (points.length < 4) {
    console.warn('Not enough points to form a shape:', points);
    return { type: 'freehand', points }; // Return the original points as a fallback
  }

  const xCoords = points.filter((_, index) => index % 2 === 0);
  const yCoords = points.filter((_, index) => index % 2 === 1);

  // Check if coordinates are valid numbers
  if (xCoords.some(isNaN) || yCoords.some(isNaN)) {
    console.warn('Invalid coordinates detected:', { xCoords, yCoords });
    return { type: 'freehand', points }; // Fallback if invalid
  }

  const xMin = Math.min(...xCoords);
  const yMin = Math.min(...yCoords);
  const xMax = Math.max(...xCoords);
  const yMax = Math.max(...yCoords);
  const width = xMax - xMin;
  const height = yMax - yMin;

  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
    console.warn('Invalid rectangle dimensions:', { x: xMin, y: yMin, width, height });
    return { type: 'freehand', points }; // Fallback if dimensions are invalid
  }

  // Tolerance for aspect ratio to decide if the shape is close to oval
  const aspectRatioTolerance = 0.25; // Adjust as needed (e.g., 10% difference)
  const aspectRatioToleranceCir = 0.15; // Adjust as needed (e.g., 10% difference)

  const aspectRatio = Math.min(width, height) / Math.max(width, height);

  if (shiftKey) {
    if (aspectRatio > 1 - aspectRatioToleranceCir && aspectRatio < 1 + aspectRatioToleranceCir) {
      // The shape is close to a square
      const sideLength = Math.max(width, height); // Use the greater dimension as the side length
      const centerX = (xMin + xMax) / 2;
      const centerY = (yMin + yMax) / 2;
      return {
        type: 'square',
        x: centerX - sideLength / 2,
        y: centerY - sideLength / 2,
        sideLength,
      };
    } else {
      // Adjust to make a circle
      const sideLength = Math.max(width, height); // Ensure side length is uniform
      const centerX = (xMin + xMax) / 2;
      const centerY = (yMin + yMax) / 2;
      return {
        type: 'circle',
        points: [xMin, yMin, xMax, yMax], // Represent the bounding box for the circle
        centerX,
        centerY,
        radius: sideLength / 2,
      };
    }
  }
  

  // If not the shift key, return the oval or rectangle logic
  if (aspectRatio > 1 - aspectRatioTolerance && aspectRatio < 1 + aspectRatioTolerance) {
    const centerX = (xMin + xMax) / 2;
    const centerY = (yMin + yMax) / 2;
    return {
      type: 'oval',
      points: [xMin, yMin, xMax, yMax], // Represent the bounding box for the oval
      centerX,
      centerY,
      width,
      height,
    };
  }

  // If not an oval, return as a rectangle
  return {
    type: 'rectangle',
    x: xMin,
    y: yMin,
    width: width,
    height: height,
  };
};
