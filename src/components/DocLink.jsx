import { FileIcon, IconButton } from './ActionIcons'

export default function DocLink({ url, title = 'View file', onOpen }) {
  if (!url) return <span className="text-slate-400">—</span>

  return (
    <IconButton variant="file" title={title} onClick={() => onOpen(url)}>
      <FileIcon />
    </IconButton>
  )
}
