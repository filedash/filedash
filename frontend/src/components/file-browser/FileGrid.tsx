import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoreVertical, Download, Edit, Trash2, Copy } from 'lucide-react';
import { FileGridIcon } from './FileGridIcon';
import type { FileItem as FileItemType } from '../../types/file';

interface FileGridProps {
  files: FileItemType[];
  onFileClick: (file: FileItemType) => void;
  selectedFiles: string[];
  onFileSelect: (path: string, selected: boolean) => void;
  onDownload?: (file: FileItemType) => void;
}

export function FileGrid({
  files,
  onFileClick,
  selectedFiles,
  onFileSelect,
  onDownload,
}: FileGridProps) {
  const handleFileClick = (file: FileItemType, e: React.MouseEvent) => {
    // Prevent default to avoid triggering selection when clicking on card
    e.preventDefault();

    // Always trigger file opening on single click
    onFileClick(file);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 p-3 sm:gap-4 sm:p-4">
      {files.map((file) => (
        <ContextMenu key={file.path}>
          <ContextMenuTrigger>
            <Card
              className={`
                group relative cursor-pointer transition-all hover:shadow-md border-border/40
                ${
                  selectedFiles.includes(file.path)
                    ? 'ring-2 ring-primary bg-primary/5 border-primary/20'
                    : 'hover:bg-accent/30 hover:border-border'
                }
              `}
              onClick={(e) => handleFileClick(file, e)}
            >
              {/* Selection Checkbox - Top left */}
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={selectedFiles.includes(file.path)}
                  onCheckedChange={(checked) => {
                    onFileSelect(file.path, !!checked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-background/80 backdrop-blur-sm cursor-pointer"
                />
              </div>

              {/* Actions Menu - Only show on larger screens */}
              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 bg-background/80 backdrop-blur-sm shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload?.(file);
                      }}
                      disabled={file.is_directory}
                      className="cursor-pointer"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive cursor-pointer">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* File Content */}
              <div className="flex flex-col items-center text-center space-y-2 p-3 min-h-[120px] justify-center">
                {/* Large File Icon */}
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16">
                  <FileGridIcon file={file} />
                </div>

                {/* File Name */}
                <div className="w-full">
                  <p
                    className="text-sm font-medium truncate px-1 leading-tight"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                </div>
              </div>
            </Card>
          </ContextMenuTrigger>

          {/* Context Menu */}
          <ContextMenuContent>
            <ContextMenuItem
              onClick={() => onDownload?.(file)}
              disabled={file.is_directory}
              className="cursor-pointer"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </ContextMenuItem>
            <ContextMenuItem className="cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem className="cursor-pointer">
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive cursor-pointer">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </div>
  );
}
