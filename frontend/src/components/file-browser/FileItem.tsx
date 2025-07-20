import type { FileItem as FileItemType } from '../../types/file';
import { FileIconRegistry } from '../../utils/file-icon-registry';

interface FileItemProps {
  file: FileItemType;
}

export function FileItem({ file }: FileItemProps) {
  const Icon = FileIconRegistry.getFileIcon(file.name, file.is_directory);
  const iconColor = FileIconRegistry.getFileIconColor(
    file.name,
    file.is_directory
  );

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${iconColor}`} />
      <span className="truncate">{file.name}</span>
    </div>
  );
}
