import { AlertTriangle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  error: Error | null;
}

/**
 * Wraps each route so a rendering failure shows a friendly retry instead of a
 * blank app.
 */
export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  override state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Route crashed', error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <section
        role="alert"
        className="glass-strong mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 rounded-3xl p-6 text-center"
      >
        <span className="grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
          <AlertTriangle className="size-7" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h1 className="font-display text-title font-semibold">500 — this page tripped over</h1>
          <p className="text-sm text-muted-foreground">
            Something went wrong while rendering. Your data is safe.
          </p>
        </div>
        <Button type="button" onClick={this.reset}>
          Try again
        </Button>
      </section>
    );
  }
}
