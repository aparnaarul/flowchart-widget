export const snapToShape = (points) => {
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
  const aspectRatio = Math.min(width, height) / Math.max(width, height);

  if (aspectRatio > 1 - aspectRatioTolerance && aspectRatio < 1 + aspectRatioTolerance) {
    const centerX = (xMin + xMax) / 2;
    const centerY = (yMin + yMax) / 2;
    // Oval defined by its center, width, and height
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
