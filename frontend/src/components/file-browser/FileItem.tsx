import type { FileItem as FileItemType } from '../../types/file';
import { getFileIcon } from '../../utils/icons';

interface FileItemProps {
  file: FileItemType;
}

export function FileItem({ file }: FileItemProps) {
  const Icon = getFileIcon(file.is_directory, file.mime_type, file.name);

  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="truncate">{file.name}</span>
    </div>
  );
}
