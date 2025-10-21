import { PlotPoint as PlotPointType, Mytheme } from '../types/myth';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

interface PlotPointProps {
  plotPoint: PlotPointType;
  mythemes: Mytheme[];
  showCategory?: boolean;
  isDragging?: boolean;
}

export function PlotPoint({ plotPoint, mythemes, showCategory = true, isDragging = false }: PlotPointProps) {
  // Create a map of mytheme names to their data
  const mythemeMap = new Map(mythemes.map(m => [m.name.toLowerCase(), m]));
  
  // Function to highlight mytheme references in text
  const renderTextWithHighlights = (text: string) => {
    const referencedMythemes = mythemes.filter(m => plotPoint.mythemeRefs.includes(m.id));
    
    if (referencedMythemes.length === 0) {
      return <span>{text}</span>;
    }

    // Sort mythemes by length (longest first) to handle overlapping names
    const sortedMythemes = [...referencedMythemes].sort((a, b) => b.name.length - a.name.length);
    
    let parts: { text: string; mytheme?: Mytheme }[] = [{ text }];
    
    sortedMythemes.forEach(mytheme => {
      const newParts: typeof parts = [];
      
      parts.forEach(part => {
        if (part.mytheme) {
          newParts.push(part);
          return;
        }
        
        const regex = new RegExp(`\\b${mytheme.name}\\b`, 'gi');
        const matches = [...part.text.matchAll(regex)];
        
        if (matches.length === 0) {
          newParts.push(part);
          return;
        }
        
        let lastIndex = 0;
        matches.forEach(match => {
          if (match.index !== undefined) {
            if (match.index > lastIndex) {
              newParts.push({ text: part.text.slice(lastIndex, match.index) });
            }
            newParts.push({ text: match[0], mytheme });
            lastIndex = match.index + match[0].length;
          }
        });
        
        if (lastIndex < part.text.length) {
          newParts.push({ text: part.text.slice(lastIndex) });
        }
      });
      
      parts = newParts;
    });
    
    return (
      <>
        {parts.map((part, i) => 
          part.mytheme ? (
            <span
              key={i}
              className="inline-block px-1 mx-0.5 rounded bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
              title={`${part.mytheme.name} (${part.mytheme.type})`}
            >
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </>
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Introduction': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      'Conflict': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'Journey': 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      'Transformation': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      'Resolution': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'Aftermath': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card className={`p-3 ${isDragging ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-2">
        <span className="text-gray-400 shrink-0 mt-0.5">#{plotPoint.order}</span>
        <div className="flex-1">
          <p className="mb-2">{renderTextWithHighlights(plotPoint.text)}</p>
          {showCategory && (
            <Badge variant="secondary" className={getCategoryColor(plotPoint.category)}>
              {plotPoint.category}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
