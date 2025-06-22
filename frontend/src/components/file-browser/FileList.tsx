import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { FileItem } from './FileItem';
import type {
  FileItem as FileItemType,
  SortField,
  SortDirection,
} from '../../types/file';
import { formatFileSize, formatDate } from '../../utils/file';

interface FileListProps {
  files: FileItemType[];
  onFileClick: (file: FileItemType) => void;
  onFileDoubleClick: (file: FileItemType) => void;
  selectedFiles: string[];
  onFileSelect: (path: string, selected: boolean) => void;
}

export function FileList({
  files,
  onFileClick,
  onFileDoubleClick,
  selectedFiles,
  onFileSelect,
}: FileListProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedFiles = [...files].sort((a, b) => {
    // Always show directories first
    if (a.is_directory && !b.is_directory) return -1;
    if (!a.is_directory && b.is_directory) return 1;

    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'modified':
        comparison =
          new Date(a.modified).getTime() - new Date(b.modified).getTime();
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12"></TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort('name')}
              className="h-auto p-0 font-medium"
            >
              Name
              <SortIcon field="name" />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort('size')}
              className="h-auto p-0 font-medium"
            >
              Size
              <SortIcon field="size" />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort('modified')}
              className="h-auto p-0 font-medium"
            >
              Modified
              <SortIcon field="modified" />
            </Button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedFiles.map((file) => (
          <TableRow
            key={file.path}
            className="cursor-pointer"
            onClick={() => onFileClick(file)}
            onDoubleClick={() => onFileDoubleClick(file)}
          >
            <TableCell>
              <input
                type="checkbox"
                checked={selectedFiles.includes(file.path)}
                onChange={(e) => {
                  e.stopPropagation();
                  onFileSelect(file.path, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-gray-300"
              />
            </TableCell>
            <TableCell>
              <FileItem file={file} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {file.is_directory ? '-' : formatFileSize(file.size)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDate(file.modified)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
