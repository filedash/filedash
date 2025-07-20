import * as React from 'react';
import { Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '../ui/breadcrumb';
import { getBreadcrumbItems } from '../../utils/file';
import { truncateBreadcrumbItems } from '../../utils/pathTruncation';

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
  availableSpace?: 'small' | 'medium' | 'large';
}

export function FileDashBreadcrumb({
  path,
  onNavigate,
  availableSpace = 'medium',
}: BreadcrumbProps) {
  const items = getBreadcrumbItems(path);
  const truncatedItems = truncateBreadcrumbItems(items, { availableSpace });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {truncatedItems.map((item, index) => (
          <React.Fragment key={`${item.path}-${index}`}>
            <BreadcrumbItem>
              {item.name === '...' ? (
                <BreadcrumbEllipsis
                  className="cursor-pointer hover:bg-muted rounded-sm"
                  onClick={() => onNavigate(item.path)}
                  title="Click to navigate to middle path"
                />
              ) : index === truncatedItems.length - 1 ? (
                <BreadcrumbPage className="flex items-center">
                  {index === 0 && item.name === 'Home' ? (
                    <>
                      <Home className="h-4 w-4 mr-1" />
                      Home
                    </>
                  ) : (
                    item.name
                  )}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  className="cursor-pointer flex items-center"
                  onClick={() => onNavigate(item.path)}
                >
                  {index === 0 && item.name === 'Home' ? (
                    <>
                      <Home className="h-4 w-4 mr-1" />
                      Home
                    </>
                  ) : (
                    item.name
                  )}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>

            {index < truncatedItems.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
