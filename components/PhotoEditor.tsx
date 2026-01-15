
import React, { useRef, useState, useEffect } from 'react';

interface PhotoEditorProps {
  imageUrl: string;
  onSave: (newUrl: string) => void;
  onCancel: () => void;
}

type Tool = 'arrow' | 'text' | 'pixelate' | 'crop' | 'adjust' | 'transform';

const PhotoEditor: React.FC<PhotoEditorProps> = ({ imageUrl, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('adjust');
  const [size, setSize] = useState(6);
  const [pixelIntensity, setPixelIntensity] = useState(16);
  const [color, setColor] = useState('#e11d48'); 
  const [scale, setScale] = useState(1);
  
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [exposure, setExposure] = useState(100);
  
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(1);
  const [flipV, setFlipV] = useState(1);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const availableW = window.innerWidth - 80;
      const availableH = window.innerHeight - 350;
      let w = img.width;
      let h = img.height;
      const ratio = Math.min(availableW / w, availableH / h);
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = w * ratio * dpr;
      canvas.height = h * ratio * dpr;
      canvas.style.width = `${w * ratio}px`;
      canvas.style.height = `${h * ratio}px`;
      
      ctx.scale(dpr, dpr);
      ctx.drawImage(img, 0, 0, w * ratio, h * ratio);
      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };
  }, [imageUrl]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(prev => Math.min(8, Math.max(0.5, prev + delta)));
    };
    const container = containerRef.current;
    if (container) container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container?.removeEventListener('wheel', handleWheel);
  }, []);

  // Càlcul precís de coordenades LOGIQUES (independents de zoom CSS i DPR)
  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // 1. Punt central visual del canvas (viewport coords)
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // 2. Vector des del centre visual
    let dx = clientX - cx;
    let dy = clientY - cy;

    // 3. Invertir l'escala de ZOOM de CSS (la que genera el desquadrament)
    dx /= scale;
    dy /= scale;

    // 4. Invertir la ROTACIÓ de CSS
    const rad = (-rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const nx = dx * cos - dy * sin;
    const ny = dx * sin + dy * cos;
    
    // 5. Invertir els FLIPS
    dx = nx * flipH;
    dy = ny * flipV;

    // 6. Tornar a coordenades Top-Left LOGIQUES (basades en style.width/height)
    const baseW = parseFloat(canvas.style.width);
    const baseH = parseFloat(canvas.style.height);
    
    return {
      x: dx + baseW / 2,
      y: dy + baseH / 2
    };
  };

  const handleStart = (e: any) => {
    if (tool === 'adjust' || tool === 'transform') return;
    setIsDrawing(true);
    const pos = getPos(e);
    setStartPos(pos);
    setCurrentPos(pos);
  };

  const handleMove = (e: any) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    setCurrentPos(pos);
  };

  const handleEnd = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const endPos = getPos(e);

    const x = Math.min(startPos.x, endPos.x);
    const y = Math.min(startPos.y, endPos.y);
    const w = Math.abs(startPos.x - endPos.x);
    const h = Math.abs(startPos.y - endPos.y);

    if (tool === 'arrow') drawArrow(ctx, startPos.x, startPos.y, endPos.x, endPos.y);
    else if (tool === 'text') {
      const txt = prompt("Text de l'etiqueta:");
      if (txt) { 
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.font = `bold ${size * 3}px Arial`; ctx.fillStyle = color; 
        ctx.fillText(txt, endPos.x, endPos.y); 
        ctx.restore();
      }
    } else if (tool === 'pixelate' && w > 1) pixelateRect(ctx, x, y, w, h);
    else if (tool === 'crop' && w > 10) {
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = w * dpr; cropCanvas.height = h * dpr;
      cropCanvas.getContext('2d')?.drawImage(canvas, x * dpr, y * dpr, w * dpr, h * dpr, 0, 0, w * dpr, h * dpr);
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.drawImage(cropCanvas, 0, 0);
    }
    setHistory([...history, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    setIsDrawing(false);
  };

  const pixelateRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    const dpr = window.devicePixelRatio || 1;
    const tempCanvas = document.createElement('canvas');
    // Usem pixels reals del backing store per a l'origen
    tempCanvas.width = Math.max(1, (w * dpr) / pixelIntensity);
    tempCanvas.height = Math.max(1, (h * dpr) / pixelIntensity);
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;

    // Origen: pixels reals (backing store)
    tCtx.drawImage(ctx.canvas, x * dpr, y * dpr, w * dpr, h * dpr, 0, 0, tempCanvas.width, tempCanvas.height);
    
    // Destí: coordenades lògiques (el ctx ja està escalat per dpr)
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, x, y, w, h);
    ctx.imageSmoothingEnabled = true;
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headlen = size * 3;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  };

  const undo = () => {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const last = newHistory[newHistory.length - 1];
      ctx.canvas.width = last.width; ctx.canvas.height = last.height;
      ctx.putImageData(last, 0, 0);
    }
  };

  const saveAndExit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const finalCanvas = document.createElement('canvas');
    const isRotatedVertical = rotation === 90 || rotation === 270;
    finalCanvas.width = isRotatedVertical ? canvas.height : canvas.width;
    finalCanvas.height = isRotatedVertical ? canvas.width : canvas.height;
    const fCtx = finalCanvas.getContext('2d');
    if (fCtx) {
      fCtx.translate(finalCanvas.width / 2, finalCanvas.height / 2);
      fCtx.rotate((rotation * Math.PI) / 180);
      fCtx.scale(flipH, flipV);
      fCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) brightness(${exposure/100})`;
      fCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
      onSave(finalCanvas.toDataURL('image/jpeg', 0.95));
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[500] flex flex-col items-center justify-between p-4 text-content-100 overflow-hidden">
      <div className="w-full max-w-7xl bg-base-200 p-6 rounded-[2rem] border border-base-300 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-base-100 p-1 rounded-2xl border border-white/5">
          {(['adjust', 'transform', 'arrow', 'text', 'pixelate', 'crop'] as const).map(t => (
            <button key={t} onClick={() => setTool(t)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tool === t ? 'bg-brand-primary text-white' : 'text-content-200 hover:bg-white/5'}`}>
              {t === 'arrow' ? 'Fletxa' : t === 'text' ? 'Etiqueta' : t === 'pixelate' ? 'Píxel' : t === 'crop' ? 'Retall' : t === 'adjust' ? 'Llum' : 'Girar'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setScale(prev => Math.max(0.25, prev - 0.25))} className="w-8 h-8 bg-base-300 rounded-lg font-black">-</button>
          <span className="text-[10px] font-mono w-10 text-center">{Math.round(scale*100)}%</span>
          <button onClick={() => setScale(prev => Math.min(8, prev + 0.25))} className="w-8 h-8 bg-base-300 rounded-lg font-black">+</button>
        </div>
        <div className="flex gap-2">
          <button onClick={undo} className="px-4 py-2 bg-base-300 text-[9px] font-black uppercase rounded-xl">Desfer</button>
          <button onClick={onCancel} className="px-4 py-2 bg-red-600/20 text-red-400 text-[9px] font-black uppercase rounded-xl">Tancar</button>
          <button onClick={saveAndExit} className="px-4 py-2 bg-brand-primary text-white text-[9px] font-black uppercase rounded-xl">Desar</button>
        </div>
      </div>

      <div ref={containerRef} className="flex-grow w-full flex items-center justify-center relative overflow-hidden my-4 bg-[#050505] rounded-[2rem] border border-white/5 shadow-inner">
        <div className="relative transform-gpu" style={{ 
          filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) brightness(${exposure/100})`,
          transform: `scale(${scale}) rotate(${rotation}deg) scaleX(${flipH}) scaleY(${flipV})`,
          transition: 'transform 0.1s cubic-bezier(0.22, 1, 0.36, 1), filter 0.1s linear',
          transformOrigin: 'center center'
        }}>
          <canvas ref={canvasRef} onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} className="block cursor-crosshair shadow-2xl image-render-high-quality" />
          {isDrawing && (tool === 'pixelate' || tool === 'crop') && (
            <div className="absolute border-2 border-brand-primary bg-brand-primary/10 pointer-events-none z-[100]"
                 style={{ 
                   left: Math.min(startPos.x, currentPos.x), 
                   top: Math.min(startPos.y, currentPos.y), 
                   width: Math.abs(startPos.x - currentPos.x), 
                   height: Math.abs(startPos.y - currentPos.y) 
                 }} />
          )}
        </div>
      </div>

      <div className="w-full max-w-5xl bg-base-200/80 backdrop-blur-xl p-6 rounded-[2rem] border border-base-300">
        {tool === 'adjust' ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[['Exposició', exposure, setExposure], ['Contrast', contrast, setContrast], ['Brillantor', brightness, setBrightness], ['Saturació', saturation, setSaturation]].map(([l, v, s]: any) => (
              <div key={l} className="flex flex-col gap-1">
                <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest">{l}</span>
                <input type="range" min="0" max="200" value={v} onChange={(e) => s(parseInt(e.target.value))} className="accent-brand-primary h-1 bg-base-300 rounded-lg appearance-none cursor-pointer" />
              </div>
            ))}
          </div>
        ) : tool === 'transform' ? (
          <div className="flex justify-center gap-4">
            <button onClick={() => setRotation(r => (r+90)%360)} className="px-6 py-2 bg-base-300 rounded-xl text-[9px] font-black uppercase">Rotar 90º</button>
            <button onClick={() => setFlipH(f => f*-1)} className="px-6 py-2 bg-base-300 rounded-xl text-[9px] font-black uppercase">Flip H</button>
            <button onClick={() => setFlipV(f => f*-1)} className="px-6 py-2 bg-base-300 rounded-xl text-[9px] font-black uppercase">Flip V</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 w-1/3">
              <span className="text-[9px] font-black uppercase opacity-40">Mida</span>
              <input type="range" min="2" max="30" value={size} onChange={(e) => setSize(parseInt(e.target.value))} className="w-full accent-brand-primary" />
            </div>
            <div className="flex gap-2">
              {['#e11d48', '#ffffff', '#facc15', '#22c55e', '#3b82f6'].map(c => (
                <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-lg border-2 ${color === c ? 'border-brand-primary scale-110 shadow-lg' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-black uppercase opacity-40">Píxel</span>
               <input type="range" min="4" max="40" value={pixelIntensity} onChange={(e) => setPixelIntensity(parseInt(e.target.value))} className="w-24 accent-brand-primary" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoEditor;
