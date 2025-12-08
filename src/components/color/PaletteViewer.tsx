import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Download, Check, AlertTriangle, Award, Orbit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OKLab3DViewer } from './OKLab3DViewer';
import { GenerateResult } from '@/types/color-journey';
import { exportToCssVariables, exportToJson, copyToClipboard } from '@/lib/utils/color-export';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
interface PaletteViewerProps {
  result: GenerateResult | null;
  isLoading: boolean;
  isLoadingWasm: boolean;
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
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Badge
              className={cn(
                isAaa
                  ? 'bg-green-600 hover:bg-green-700 shadow-glow'
                  : ratio >= 4.5
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : ratio >= 3
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-destructive hover:bg-destructive/90'
              )}
            >
              {badgeContent}
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
export function PaletteViewer({ result, isLoading, isLoadingWasm }: PaletteViewerProps) {
  const [show3D, setShow3D] = useState(false);
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
  if (isLoadingWasm) {
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Journey Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4 p-8">
            <Skeleton className="w-full aspect-video rounded-lg" />
            <div className="flex items-center gap-2 animate-pulse">
              <Orbit className="h-5 w-5 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Loading Color Engine...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Journey Preview</CardTitle>
            <CardDescription>Visualize the entire color journey.</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="3d-mode">3D View</Label>
            <Switch id="3d-mode" checked={show3D} onCheckedChange={setShow3D} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="w-full aspect-video rounded-lg" />
          ) : show3D && result?.palette ? (
            <OKLab3DViewer palette={result.palette} />
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
          <motion.div
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-10 2xl:grid-cols-12 gap-4"
            variants={{
              visible: { transition: { staggerChildren: 0.02 } },
              hidden: {},
            }}
            initial="hidden"
            animate="visible"
          >
            {isLoading && Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="w-full aspect-square rounded-md" />
            ))}
            {!isLoading && result?.palette.map((color, index) => (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, scale: 0.8 },
                        visible: { opacity: 1, scale: 1 },
                      }}
                      whileHover={{ scale: 1.05, y: -4, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }}
                      className="w-full aspect-square rounded-md cursor-pointer hover:shadow-glow"
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
          </motion.div>
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
              <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
                <TableCell>Min. Perceptual Distance (ΔE)</TableCell>
                <TableCell className="text-right font-mono">{isLoading ? <Skeleton className="h-5 w-16 ml-auto" /> : (diagnostics?.minDeltaE != null ? diagnostics.minDeltaE.toFixed(3) : 'N/A')}</TableCell>
              </motion.tr>
              <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <TableCell>Min. WCAG Ratio (vs black/white)</TableCell>
                <TableCell className="text-right font-mono flex items-center justify-end gap-2">
                  {isLoading ? <Skeleton className="h-5 w-16" /> : (diagnostics?.wcagMinRatio != null ? diagnostics.wcagMinRatio.toFixed(2) : 'N/A')}
                  {!isLoading && diagnostics && <WcagBadge ratio={diagnostics.wcagMinRatio} isAaa={diagnostics.aaaCompliant} />}
                </TableCell>
              </motion.tr>
              <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                <TableCell>Traversal Strategy</TableCell>
                <TableCell className="text-right">
                  {isLoading ? <Skeleton className="h-5 w-24 ml-auto" /> : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant={diagnostics?.traversalStrategy === 'multi-dim' ? 'secondary' : 'default'}>
                            {diagnostics?.traversalStrategy || 'perceptual'}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{diagnostics?.traversalStrategy === 'multi-dim' ? 'Used alternation & pulses for large palette distinctness.' : 'Standard perceptual interpolation.'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </TableCell>
              </motion.tr>
              <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <TableCell>Enforcement Iterations</TableCell>
                <TableCell className="text-right font-mono">{isLoading ? <Skeleton className="h-5 w-16 ml-auto" /> : diagnostics?.enforcementIters ?? '0'}</TableCell>
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