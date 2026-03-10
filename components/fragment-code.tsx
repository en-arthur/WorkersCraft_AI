import { CodeView } from './code-view'
import { Button } from './ui/button'
import { CopyButton } from './ui/copy-button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Download, FileText, Folder, FolderOpen } from 'lucide-react'
import { useState } from 'react'

interface File {
  name: string
  path: string
  content: string
}

interface FileTreeItem {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileTreeItem[]
  content?: string
}

function buildFileTree(files: File[]): FileTreeItem[] {
  const root: FileTreeItem[] = []
  const fileMap = new Map<string, FileTreeItem>()

  // Sort files by path depth
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path))

  for (const file of sortedFiles) {
    const parts = file.path.split('/')
    let currentLevel = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join('/')

      let existing = currentLevel.find((item) => item.name === part)

      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          type: isLast ? 'file' : 'folder',
          children: isLast ? undefined : [],
          content: isLast ? file.content : undefined,
        }
        currentLevel.push(existing)
      } else if (isLast && existing.type === 'folder') {
        // Convert folder to file if it has content
        existing.type = 'file'
        existing.content = file.content
      }

      currentLevel = existing.children || []
    }
  }

  return root
}

function FileTree({
  items,
  currentFile,
  onSelectFile,
  depth = 0,
}: {
  items: FileTreeItem[]
  currentFile: string
  onSelectFile: (path: string, content: string) => void
  depth?: number
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <div key={item.path}>
          <div
            className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-muted rounded-md ${
              currentFile === item.path ? 'bg-muted' : ''
            }`}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
            onClick={() => {
              if (item.type === 'folder') {
                toggleFolder(item.path)
              } else {
                onSelectFile(item.path, item.content || '')
              }
            }}
          >
            {item.type === 'folder' ? (
              <>
                {expandedFolders.has(item.path) ? (
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Folder className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">{item.name}</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{item.name}</span>
              </>
            )}
          </div>
          {item.type === 'folder' && expandedFolders.has(item.path) && item.children && (
            <FileTree
              items={item.children}
              currentFile={currentFile}
              onSelectFile={onSelectFile}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function FragmentCode({
  files,
}: {
  files: { name: string; content: string; path?: string }[]
}) {
  // Normalize files to include path
  const normalizedFiles: File[] = files.map((file, index) => ({
    name: file.name,
    path: file.path || file.name,
    content: file.content,
  }))

  // Build file tree
  const fileTree = buildFileTree(normalizedFiles)

  // Get initial file (first file or from URL hash)
  const [currentFile, setCurrentFile] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1)
      if (hash) {
        const found = normalizedFiles.find((f) => f.path === hash)
        if (found) return found.path
      }
    }
    return normalizedFiles[0]?.path || ''
  })

  const currentFileData = normalizedFiles.find((file) => file.path === currentFile)
  const currentFileContent = currentFileData?.content || ''

  function download(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start px-2 pt-1 gap-2">
        {/* File Tree */}
        <div className="flex-1 overflow-x-auto max-w-[150px] border-r pr-2">
          <FileTree
            items={fileTree}
            currentFile={currentFile}
            onSelectFile={(path, content) => {
              setCurrentFile(path)
              if (typeof window !== 'undefined') {
                window.location.hash = path
              }
            }}
          />
        </div>

        {/* File Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-2 py-1 border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{currentFileData?.name || currentFile}</span>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <CopyButton
                      content={currentFileContent}
                      className="text-muted-foreground h-8 w-8"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Copy</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground h-8 w-8"
                      onClick={() =>
                        download(currentFileData?.name || currentFile, currentFileContent)
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Download</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="flex flex-col flex-1 overflow-x-auto">
            <CodeView
              code={currentFileContent}
              lang={currentFile.split('.').pop() || ''}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
