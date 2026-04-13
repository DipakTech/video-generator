import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface PreviewCanvasProps {
  width: number;
  height: number;
}

export interface PreviewCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

const PreviewCanvas = forwardRef<PreviewCanvasHandle, PreviewCanvasProps>(
  function PreviewCanvas({ width, height }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = width;
      canvas.height = height;
    }, [width, height]);

    return (
      <div className="mx-auto w-full overflow-hidden rounded-xl border border-border/70 bg-card/20 p-2 shadow-sm">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="mx-auto block max-h-[65vh] w-auto max-w-full rounded-md bg-background"
        />
      </div>
    );
  },
);

export default PreviewCanvas;
