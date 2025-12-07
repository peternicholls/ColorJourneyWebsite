import React from 'react';
import { motion } from 'framer-motion';
import { Copy, Download, Check, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GenerateResult, RGBColor } from '@/types/color-journey';
import { exportToCssVariables, exportToJson, copyToClipboard } from '@/lib/utils/color-export';
import { toast } from 'sonner';
interface PaletteViewerProps {
  result: GenerateResult | null;
  isLoading: boolean;
}
// --- WCAG Contrast Calculation ---
function getRelativeLuminance(rgb: RGBColor): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function getContrastRatio(rgb1: RGBColor, rgb2: RGBColor): number {
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);
  return l1 > l2 ? (l1 + 0.05) / (l2 + 0.05) : (l2 + 0.05) / (l1 + 0.05);
}
const ContrastBadge = ({ ratio }: { ratio: number }) => {
  if (ratio >= 7) return <Badge variant="default" className="bg-green-600 hover:bg-green-700">AAA</Badge>;
  if (ratio >= 4.5) return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">AA</Badge>;
  if (ratio >= 3) return <Badge variant="secondary">AA Large</Badge>;
  return <Badge variant="destructive">Fail</Badge>;
};
export function PaletteViewer({ result, isLoading }: PaletteViewerProps) {
  const handleCopy = (content: string, type: string) => {
    copyToClipboard(content).then((success) => {
      if (success) toast.success(`${type} copied to clipboard!`);
      else toast.error(`Failed to copy ${type}.`);
    });
  };
  const gradientCss = result?.palette
    ? `linear-gradient(to right, ${result.palette.map(p => p.hex).join(', ')})`
    : 'linear-gradient(to right, #eee, #ddd)';
  const contrastRatios = React.useMemo(() => {
    if (!result || result.palette.length < 2) return [];
    const ratios = [];
    for (let i = 1; i < result.palette.length; i++) {
      ratios.push(getContrastRatio(result.palette[i - 1].rgb, result.palette[i].rgb));
    }
    return ratios;
  }, [result]);
  const minRatio = contrastRatios.length > 0 ? Math.min(...contrastRatios) : 0;
  const minRatioDisplay = contrastRatios.length > 0 ? minRatio.toFixed(2) : 'N/A';
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Continuous Preview</CardTitle>
          <CardDescription>A smooth gradient representing the entire color journey.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="w-full aspect-video rounded-lg" />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full aspect-video rounded-lg"
              style={{ background: gradientCss }}
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Discrete Swatches</CardTitle>
          <CardDescription>Individually generated colors from the journey.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-4">
            {isLoading && Array.from({ length: 16 }).map((_, i) => (
              <Skeleton key={i} className="w-full aspect-square rounded-md" />
            ))}
            {!isLoading && result?.palette.map((color, index) => (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.02 }}
                      className="w-full aspect-square rounded-md cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
                      style={{ backgroundColor: color.hex }}
                      onClick={() => handleCopy(color.hex, 'Hex code')}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{color.hex.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      OKLab: {color.ok.l.toFixed(2)}, {color.ok.a.toFixed(2)}, {color.ok.b.toFixed(2)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Diagnostics & Export</CardTitle>
          <CardDescription>Analyze the palette and export for your projects.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Min. Perceptual Distance (ΔE)</TableCell>
                <TableCell className="text-right font-mono">{isLoading ? <Skeleton className="h-5 w-16 ml-auto" /> : result?.diagnostics.minDeltaE.toFixed(3) ?? 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Min. Contrast Ratio (WCAG)</TableCell>
                <TableCell className="text-right font-mono">{isLoading ? <Skeleton className="h-5 w-16 ml-auto" /> : minRatioDisplay}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Adjacent Contrast Check</TableCell>
                <TableCell className="text-right">{isLoading ? <Skeleton className="h-5 w-24 ml-auto" /> : (contrastRatios.length > 0 && minRatio >= 4.5 ? <span className="flex items-center justify-end gap-2 text-green-600"><Check className="h-4 w-4" /> All Pass (AA)</span> : <span className="flex items-center justify-end gap-2 text-amber-600"><AlertTriangle className="h-4 w-4" /> Some Fail</span>)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button className="w-full" variant="outline" disabled={isLoading || !result} onClick={() => handleCopy(exportToCssVariables(result!.palette), 'CSS Variables')}>
              <Copy className="mr-2 h-4 w-4" /> Copy CSS Variables
            </Button>
            <Button className="w-full" variant="outline" disabled={isLoading || !result} onClick={() => handleCopy(exportToJson(result!), 'JSON')}>
              <Download className="mr-2 h-4 w-4" /> Copy JSON
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}