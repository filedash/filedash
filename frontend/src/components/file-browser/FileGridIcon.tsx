import { FileIconRegistry } from '../../utils/file-icon-registry';
import type { FileItem as FileItemType } from '../../types/file';
import { cn } from '@/lib/utils';

interface FileGridIconProps {
  file: FileItemType;
  size?: 'sm' | 'md' | 'lg';
}

export function FileGridIcon({ file, size = 'md' }: FileGridIconProps) {
  const Icon = FileIconRegistry.getFileIcon(file.name, file.is_directory);
  const iconColor = FileIconRegistry.getFileIconColor(
    file.name,
    file.is_directory
  );

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return <Icon className={cn(sizeClasses[size], iconColor)} />;
}
