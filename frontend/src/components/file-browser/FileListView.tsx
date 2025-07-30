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
import type { FileItem as FileItemType } from '../../types/file';
import {
  formatFileSize,
  formatDate,
  sortFiles,
} from '../../utils/file-operations';

interface FileListViewProps {
  files: FileItemType[];
  selectedFiles: string[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onFileClick: (file: FileItemType) => void;
  onFileSelect: (path: string, selected: boolean) => void;
  onDownload: (file: FileItemType) => void;
  onRename: (file: FileItemType) => void;
  onDelete: (file: FileItemType) => void;
  onSort: (field: string) => void;
}

/**
 * File List View Component
 * Displays files in a table format with sorting and context menus
 */
export function FileListView({
  files,
  selectedFiles,
  sortField,
  sortDirection,
  onFileClick,
  onFileSelect,
  onDownload,
  onRename,
  onDelete,
  onSort,
}: FileListViewProps) {
  const sortedFiles = sortFiles(files, sortField, sortDirection);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    );
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === files.length && files.length > 0) {
      // Deselect all
      selectedFiles.forEach((path) => onFileSelect(path, false));
    } else {
      // Select all
      files.forEach((file) => onFileSelect(file.path, true));
    }
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
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="min-w-[200px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSort('name')}
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
                    onClick={() => onSort('size')}
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
                    onClick={() => onSort('modified')}
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
                    >
                      <TableCell className="w-12">
                        <Checkbox
                          checked={selectedFiles.includes(file.path)}
                          onCheckedChange={(checked) => {
                            onFileSelect(file.path, !!checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="cursor-pointer"
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
                            <DropdownMenuItem
                              onClick={() => onDownload(file)}
                              disabled={file.is_directory}
                              className="cursor-pointer"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onRename(file);
                              }}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Copy className="mr-2 h-4 w-4" />
                              Copy
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(file);
                              }}
                              className="text-destructive cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() => onDownload(file)}
                      disabled={file.is_directory}
                      className="cursor-pointer"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => onRename(file)}
                      className="cursor-pointer"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuItem className="cursor-pointer">
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => onDelete(file)}
                      className="text-destructive cursor-pointer"
                    >
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
