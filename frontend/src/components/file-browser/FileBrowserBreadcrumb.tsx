import { Breadcrumb as BreadcrumbComponent } from '../layout/Breadcrumb';

interface FileBrowserBreadcrumbProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

/**
 * File Browser Breadcrumb Component
 * Navigation breadcrumbs with consistent styling
 */
export function FileBrowserBreadcrumb({
  currentPath,
  onNavigate,
}: FileBrowserBreadcrumbProps) {
  return (
    <div className="flex items-center text-sm text-muted-foreground">
      <BreadcrumbComponent path={currentPath} onNavigate={onNavigate} />
    </div>
  );
}
