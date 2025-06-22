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
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import {
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Download,
  Edit,
  Trash2,
  Copy,
} from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
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
    <div className="w-full">
      <ScrollArea className="w-full">
        <div className="min-w-[600px]">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40">
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedFiles.length === files.length && files.length > 0
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        files.forEach((file) => onFileSelect(file.path, true));
                      } else {
                        selectedFiles.forEach((path) =>
                          onFileSelect(path, false)
                        );
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="min-w-[200px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('name')}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                  >
                    Name
                    <SortIcon field="name" />
                  </Button>
                </TableHead>
                <TableHead className="w-24 hidden sm:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('size')}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                  >
                    Size
                    <SortIcon field="size" />
                  </Button>
                </TableHead>
                <TableHead className="w-40 hidden md:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('modified')}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                  >
                    Modified
                    <SortIcon field="modified" />
                  </Button>
                </TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFiles.map((file) => (
                <ContextMenu key={file.path}>
                  <ContextMenuTrigger asChild>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onFileClick(file)}
                      onDoubleClick={() => onFileDoubleClick(file)}
                    >
                      <TableCell className="w-12">
                        <Checkbox
                          checked={selectedFiles.includes(file.path)}
                          onCheckedChange={(checked) => {
                            onFileSelect(file.path, !!checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileItem file={file} />
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {file.is_directory ? '-' : formatFileSize(file.size)}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">
                        {formatDate(file.modified)}
                      </TableCell>
                      <TableCell className="w-12">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </ContextMenuItem>
                    <ContextMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuItem>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
}
