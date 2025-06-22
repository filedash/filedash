import { getFileIcon } from '../../utils/icons';
import type { FileItem as FileItemType } from '../../types/file';

interface FileGridIconProps {
  file: FileItemType;
}

export function FileGridIcon({ file }: FileGridIconProps) {
  const Icon = getFileIcon(file.is_directory, file.mime_type, file.name);

  return (
    <Icon className="w-full h-full text-muted-foreground" />
  );
}
