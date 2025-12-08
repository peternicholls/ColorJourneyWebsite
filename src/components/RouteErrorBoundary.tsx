import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { useEffect } from 'react';
import { errorReporter } from '@/lib/errorReporter';
import { ErrorFallback } from './ErrorFallback';

export function RouteErrorBoundary() {
  // Router-agnostic placeholder: avoid router-only hooks so this component can be imported anywhere.
  return (
    <ErrorFallback
      title="Error"
      message="An error occurred while loading this content."
      error={undefined}
      statusMessage="An error occurred"
    />
  );
}