import React from 'react';
import { motion } from 'framer-motion';
import { Copy, Download, Check, AlertTriangle, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GenerateResult } from '@/types/color-journey';
import { exportToCssVariables, exportToJson, copyToClipboard } from '@/lib/utils/color-export';
import { toast } from 'sonner';
interface PaletteViewerProps {
  result: GenerateResult | null;
  isLoading: boolean;
}
const WcagBadge = ({ ratio, isAaa }: { ratio: number; isAaa?: boolean }) => {
  const badgeContent = isAaa ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA Large' : 'Fail';
  const tooltipContent = isAaa
    ? 'WCAG AAA: All colors have a contrast ratio of at least 7:1.'
    : ratio >= 4.5
    ? 'WCAG AA: All colors have a contrast ratio of at least 4.5:1.'
    : 'Fails WCAG AA standard for normal text.';
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge
            className={
              isAaa
                ? 'bg-green-600 hover:bg-green-700'
                : ratio >= 4.5
                ? 'bg-blue-600 hover:bg-blue-700'
                : ratio >= 3
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : 'bg-destructive hover:bg-destructive/90'
            }
          >
            {badgeContent}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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
  const diagnostics = result?.diagnostics;
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
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-10 gap-4">
            {isLoading && Array.from({ length: 20 }).map((_, i) => (
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
              <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <TableCell>Min. Perceptual Distance (ΔE)</TableCell>
                <TableCell className="text-right font-mono">{isLoading ? <Skeleton className="h-5 w-16 ml-auto" /> : diagnostics?.minDeltaE.toFixed(3) ?? 'N/A'}</TableCell>
              </motion.tr>
              <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                <TableCell>Min. WCAG Ratio (vs black/white)</TableCell>
                <TableCell className="text-right font-mono flex items-center justify-end gap-2">
                  {isLoading ? <Skeleton className="h-5 w-16" /> : diagnostics?.wcagMinRatio.toFixed(2) ?? 'N/A'}
                  {!isLoading && diagnostics && <WcagBadge ratio={diagnostics.wcagMinRatio} isAaa={diagnostics.aaaCompliant} />}
                </TableCell>
              </motion.tr>
              <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <TableCell>WCAG AA Violations</TableCell>
                <TableCell className="text-right">
                  {isLoading ? <Skeleton className="h-5 w-24 ml-auto" /> : (
                    diagnostics && (diagnostics.wcagViolations === 0 ? (
                      <span className="flex items-center justify-end gap-2 text-green-600"><Check className="h-4 w-4" /> All Pass (AA)</span>
                    ) : (
                      <span className="flex items-center justify-end gap-2 text-amber-600"><AlertTriangle className="h-4 w-4" /> {diagnostics.wcagViolations} Failures</span>
                    ))
                  )}
                </TableCell>
              </motion.tr>
              <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                <TableCell>Curve Applied</TableCell>
                <TableCell className="text-right font-mono flex items-center justify-end gap-2">
                  {isLoading ? <Skeleton className="h-5 w-24" /> : (
                    diagnostics?.curveApplied ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className={diagnostics.curveApplied.style === 'custom' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}>
                              {diagnostics.curveApplied.style}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Applied non-linear pacing: {diagnostics.curveApplied.style} to [{diagnostics.curveApplied.dimensions.join(', ')}] at {Math.round(diagnostics.curveApplied.strength * 100)}% strength.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : 'N/A'
                  )}
                </TableCell>
              </motion.tr>
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